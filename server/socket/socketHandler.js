const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const DirectChat = require('../models/DirectChat');
const { isAiTrigger, processAiMessage, getOrCreateBotUser } = require('../services/aiService');

// Active socket connection map: userId -> Set of socket IDs
const onlineUsers = new Map();

// Active voice channel map: channelId -> Map<socketId, participantData>
const voiceChannels = new Map();

const getVoiceChannelStates = () => {
  const result = {};
  for (const [channelId, participants] of voiceChannels.entries()) {
    result[channelId] = Array.from(participants.values());
  }
  return result;
};

const socketHandler = (io) => {
  const leaveCurrentVoice = (s) => {
    const channelId = s.voiceChannelId;
    if (!channelId) return;

    s.leave(`voice:${channelId}`);
    s.voiceChannelId = null;

    if (voiceChannels.has(channelId)) {
      const room = voiceChannels.get(channelId);
      room.delete(s.id);
      if (room.size === 0) {
        voiceChannels.delete(channelId);
      }
      io.to(`voice:${channelId}`).emit('voice:user_left', {
        channelId,
        socketId: s.id,
        userId: s.user?._id?.toString(),
      });
      io.emit('voice:channel_states', getVoiceChannelStates());
    }
  };
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token;

      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';');
        const tokenCookie = cookies.find((c) => c.trim().startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'syncspace_super_secret_jwt_key_2025_secure');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    // Track online user socket
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Update status to online in database
    await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });

    // Broadcast updated online users list
    io.emit('presence:online_users', Array.from(onlineUsers.keys()));
    socket.broadcast.emit('user:status_change', {
      userId,
      status: 'online',
      customStatus: socket.user.customStatus,
    });

    console.log(`[Socket] User connected: ${socket.user.name} (${socket.id})`);

    // Join personal room for private notifications
    socket.join(`user:${userId}`);

    // Join Channel room
    socket.on('channel:join', ({ channelId }) => {
      if (!channelId) return;
      socket.join(`channel:${channelId}`);
      socket.to(`channel:${channelId}`).emit('channel:user_joined', {
        channelId,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });
    });

    // Leave Channel room
    socket.on('channel:leave', ({ channelId }) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
      socket.to(`channel:${channelId}`).emit('channel:user_left', {
        channelId,
        userId: socket.user._id,
      });
    });

    // Join Direct Chat room
    socket.on('chat:join', ({ chatId }) => {
      if (!chatId) return;
      socket.join(`chat:${chatId}`);
    });

    // Leave Direct Chat room
    socket.on('chat:leave', ({ chatId }) => {
      if (!chatId) return;
      socket.leave(`chat:${chatId}`);
    });

    // Typing Indicators
    socket.on('typing:start', ({ channelId, chatId }) => {
      const room = channelId ? `channel:${channelId}` : `chat:${chatId}`;
      socket.to(room).emit('typing:display', {
        channelId,
        chatId,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });
    });

    socket.on('typing:stop', ({ channelId, chatId }) => {
      const room = channelId ? `channel:${channelId}` : `chat:${chatId}`;
      socket.to(room).emit('typing:hide', {
        channelId,
        chatId,
        userId: socket.user._id,
      });
    });

    // Send Message Real-Time handler
    socket.on('message:send', async (data, callback) => {
      try {
        const {
          channelId,
          directChatId,
          content,
          attachments,
          replyTo,
          threadParentId,
          broadcastToChannel,
          isVoiceNote,
          voiceDuration,
          voiceWaveform,
        } = data;

        const message = await Message.create({
          channelId: channelId || null,
          directChatId: directChatId || null,
          sender: socket.user._id,
          content: content || '',
          attachments: attachments || [],
          replyTo: replyTo || threadParentId || null,
          threadParentId: threadParentId || null,
          broadcastToChannel: Boolean(broadcastToChannel),
          isVoiceNote: Boolean(isVoiceNote),
          voiceDuration: voiceDuration || 0,
          voiceWaveform: voiceWaveform || [],
          readBy: [{ user: socket.user._id, readAt: new Date() }],
        });

        if (threadParentId) {
          await Message.findByIdAndUpdate(threadParentId, {
            $inc: { replyCount: 1 },
            $addToSet: { replyParticipants: socket.user._id },
            lastReplyAt: new Date(),
          });
        }

        if (directChatId) {
          await DirectChat.findByIdAndUpdate(directChatId, {
            lastMessage: message._id,
            updatedAt: new Date(),
          });
        }

        const populated = await Message.findById(message._id)
          .populate('sender', 'name email avatar status customStatus isBot')
          .populate('replyParticipants', 'name avatar')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name avatar' },
          });

        const room = channelId ? `channel:${channelId}` : `chat:${directChatId}`;

        if (threadParentId) {
          const updatedParent = await Message.findById(threadParentId)
            .populate('sender', 'name email avatar status customStatus isBot')
            .populate('replyParticipants', 'name avatar')
            .populate('reactions.users', 'name avatar')
            .populate('pinnedBy', 'name avatar');

          io.to(room).emit('thread:reply_new', {
            threadParentId,
            reply: populated,
            parentMessage: updatedParent,
          });

          // Update parent message in main channel view with latest replyCount
          io.to(room).emit('message:edited', updatedParent);

          if (broadcastToChannel) {
            io.to(room).emit('message:new', populated);
          }
        } else {
          io.to(room).emit('message:new', populated);
        }

        // If DM, notify all participants' user rooms (for badge counts outside active chat)
        if (directChatId) {
          const directChat = await DirectChat.findById(directChatId);
          if (directChat) {
            directChat.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                io.to(`user:${pId.toString()}`).emit('chat:incoming_dm', {
                  chatId: directChatId,
                  message: populated,
                });
              }
            });
          }
        }

        // Check if message triggers SyncAI Assistant
        if (content && isAiTrigger(content)) {
          const botUser = await getOrCreateBotUser();

          // Broadcast AI typing indicator
          io.to(room).emit('typing:display', {
            channelId,
            chatId: directChatId,
            user: {
              _id: botUser._id,
              name: botUser.name,
              avatar: botUser.avatar,
            },
          });

          // Asynchronously process AI response after brief realistic delay
          setTimeout(async () => {
            try {
              let recentMessages = [];
              if (channelId) {
                recentMessages = await Message.find({ channelId })
                  .sort({ createdAt: -1 })
                  .limit(25)
                  .populate('sender', 'name');
                recentMessages.reverse();
              }

              const { aiMessage, updatedNotepad } = await processAiMessage({
                channelId,
                directChatId,
                content,
                user: socket.user,
                recentMessages,
              });

              // Stop AI typing
              io.to(room).emit('typing:hide', {
                channelId,
                chatId: directChatId,
                userId: botUser._id,
              });

              // Broadcast AI message to the channel/chat
              io.to(room).emit('message:new', aiMessage);

              // If meeting notes updated the notepad, emit live sync
              if (updatedNotepad && channelId) {
                io.to(`channel:${channelId}`).emit('notepad:updated', {
                  channelId,
                  content: updatedNotepad,
                  user: botUser,
                });
              }
            } catch (aiErr) {
              console.error('[AI] Generation error:', aiErr);
              io.to(room).emit('typing:hide', {
                channelId,
                chatId: directChatId,
                userId: botUser._id,
              });
            }
          }, 800);
        }

        if (typeof callback === 'function') {
          callback({ success: true, message: populated });
        }
      } catch (err) {
        console.error('[Socket] message:send error:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Message Read Receipts
    socket.on('message:read', async ({ messageIds, channelId, chatId }) => {
      try {
        if (!messageIds || !messageIds.length) return;

        await Message.updateMany(
          {
            _id: { $in: messageIds },
            'readBy.user': { $ne: socket.user._id },
          },
          {
            $push: { readBy: { user: socket.user._id, readAt: new Date() } },
          }
        );

        const room = channelId ? `channel:${channelId}` : `chat:${chatId}`;
        io.to(room).emit('message:read_receipt', {
          messageIds,
          channelId,
          chatId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar,
          },
          readAt: new Date(),
        });
      } catch (err) {
        console.error('[Socket] message:read error:', err);
      }
    });

    // Emoji reaction via socket
    socket.on('message:react', async ({ messageId, emoji, channelId, chatId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

        if (reactionIndex > -1) {
          const userIdx = message.reactions[reactionIndex].users.findIndex(
            (u) => u.toString() === socket.user._id.toString()
          );

          if (userIdx > -1) {
            message.reactions[reactionIndex].users.splice(userIdx, 1);
            if (message.reactions[reactionIndex].users.length === 0) {
              message.reactions.splice(reactionIndex, 1);
            }
          } else {
            message.reactions[reactionIndex].users.push(socket.user._id);
          }
        } else {
          message.reactions.push({ emoji, users: [socket.user._id] });
        }

        await message.save();

        const populated = await Message.findById(message._id)
          .populate('sender', 'name email avatar status customStatus')
          .populate('reactions.users', 'name avatar')
          .populate('pinnedBy', 'name avatar')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name avatar' },
          });

        const room = channelId ? `channel:${channelId}` : `chat:${chatId}`;
        io.to(room).emit('message:reaction_updated', {
          messageId,
          reactions: populated.reactions,
          message: populated,
        });
      } catch (err) {
        console.error('[Socket] message:react error:', err);
      }
    });

    // Collaborative Notepad live sync
    socket.on('notepad:sync', async ({ channelId, content }) => {
      if (!channelId) return;

      // Broadcast changes to everyone else in this channel
      socket.to(`channel:${channelId}`).emit('notepad:updated', {
        channelId,
        content,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });

      // Persist to MongoDB (debounced or on change)
      await Channel.findByIdAndUpdate(channelId, {
        notepadContent: content,
        notepadLastEditedBy: socket.user._id,
        notepadLastEditedAt: new Date(),
      });
    });

    // Live Presence Cursor in Channel/Notepad
    socket.on('presence:cursor', ({ channelId, cursor }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit('presence:cursor_moved', {
        channelId,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        cursor,
      });
    });

    // ==========================================
    // WebRTC 1-on-1 Direct Calling Signaling
    // ==========================================
    socket.on('call:initiate', ({ targetUserId, callType, signalData }) => {
      console.log(`[Call] ${socket.user.name} initiating ${callType} call to user ${targetUserId}`);
      io.to(`user:${targetUserId}`).emit('call:incoming', {
        caller: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        callType,
        signalData,
      });
    });

    socket.on('call:answer', ({ targetUserId, signalData }) => {
      console.log(`[Call] User answered call from ${targetUserId}`);
      io.to(`user:${targetUserId}`).emit('call:answered', {
        signalData,
        responder: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });
    });

    socket.on('call:ice_candidate', ({ targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('call:ice_candidate', {
        candidate,
        fromUserId: socket.user._id,
      });
    });

    socket.on('call:reject', ({ targetUserId }) => {
      console.log(`[Call] Call rejected for user ${targetUserId}`);
      io.to(`user:${targetUserId}`).emit('call:rejected', {
        byUser: {
          _id: socket.user._id,
          name: socket.user.name,
        },
      });
    });

    socket.on('call:end', ({ targetUserId }) => {
      console.log(`[Call] Call ended between ${socket.user.name} and user ${targetUserId}`);
      io.to(`user:${targetUserId}`).emit('call:ended', {
        byUserId: socket.user._id,
      });
    });

    // ==========================================
    // WebRTC Voice Channels (Discord-style)
    // ==========================================
    socket.emit('voice:channel_states', getVoiceChannelStates());

    socket.on('voice:join', ({ channelId }) => {
      if (!channelId) return;
      leaveCurrentVoice(socket);

      if (!voiceChannels.has(channelId)) {
        voiceChannels.set(channelId, new Map());
      }
      const room = voiceChannels.get(channelId);
      const participant = {
        socketId: socket.id,
        userId: socket.user._id.toString(),
        name: socket.user.name,
        avatar: socket.user.avatar,
        isMuted: false,
        isDeafened: false,
        isVideoOn: false,
        isScreenSharing: false,
      };

      room.set(socket.id, participant);
      socket.voiceChannelId = channelId;
      socket.join(`voice:${channelId}`);

      console.log(`[Voice] ${socket.user.name} joined voice channel ${channelId}`);

      // Return list of other users currently in this voice room
      const existingUsers = Array.from(room.values()).filter((p) => p.socketId !== socket.id);
      socket.emit('voice:room_users', { channelId, users: existingUsers });

      // Notify others in room
      socket.to(`voice:${channelId}`).emit('voice:user_joined', { channelId, user: participant });

      // Broadcast updated channel presence across entire workspace
      io.emit('voice:channel_states', getVoiceChannelStates());
    });

    socket.on('voice:signal', ({ toSocketId, signal }) => {
      io.to(toSocketId).emit('voice:signal', {
        fromSocketId: socket.id,
        fromUser: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        signal,
      });
    });

    socket.on('voice:state_change', ({ channelId, isMuted, isDeafened, isVideoOn, isScreenSharing }) => {
      if (!channelId || !voiceChannels.has(channelId)) return;
      const room = voiceChannels.get(channelId);
      const p = room.get(socket.id);
      if (p) {
        if (isMuted !== undefined) p.isMuted = isMuted;
        if (isDeafened !== undefined) p.isDeafened = isDeafened;
        if (isVideoOn !== undefined) p.isVideoOn = isVideoOn;
        if (isScreenSharing !== undefined) p.isScreenSharing = isScreenSharing;

        io.to(`voice:${channelId}`).emit('voice:user_state_updated', {
          socketId: socket.id,
          userId: p.userId,
          state: p,
        });
        io.emit('voice:channel_states', getVoiceChannelStates());
      }
    });

    socket.on('voice:leave', () => {
      leaveCurrentVoice(socket);
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      leaveCurrentVoice(socket);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
          io.emit('presence:online_users', Array.from(onlineUsers.keys()));
          socket.broadcast.emit('user:status_change', {
            userId,
            status: 'offline',
            lastSeen: new Date(),
          });
        }
      }
      console.log(`[Socket] User disconnected: ${socket.user.name} (${socket.id})`);
    });
  });
};

module.exports = socketHandler;
