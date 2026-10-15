import React, { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useChatStore } from '../store/chatStore';
import { useUIStore } from '../store/uiStore';
import toast from 'react-hot-toast';
import { sound } from '../utils/sound';
import { useCallStore } from '../store/callStore';

let globalSocket = null;

export const useSocket = () => {
  const { user, token } = useAuthStore();
  const { activeChannel } = useWorkspaceStore();
  const { activeDirectChat, addIncomingMessage, updateMessage, deleteMessageLocally, markMessagesAsReadLocally, addTypingUser, removeTypingUser, setOnlineUserIds } = useChatStore();

  const activeChannelRef = useRef(activeChannel);
  const activeDirectChatRef = useRef(activeDirectChat);

  activeChannelRef.current = activeChannel;
  activeDirectChatRef.current = activeDirectChat;

  // Initialize socket on auth
  useEffect(() => {
    if (!token || !user) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      return;
    }

    if (!globalSocket) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      globalSocket = io(socketUrl, {
        auth: { token },
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      globalSocket.on('connect', () => {
        console.log('[Socket] Connected to server ID:', globalSocket.id);
      });

      globalSocket.on('presence:online_users', (userIds) => {
        setOnlineUserIds(userIds);
      });

      globalSocket.on('message:new', (msg) => {
        const currentChannel = activeChannelRef.current;
        const currentChat = activeDirectChatRef.current;

        const isCurrentChannel = currentChannel && msg.channelId === currentChannel._id;
        const isCurrentChat = currentChat && msg.directChatId === currentChat._id;

        if (isCurrentChannel || isCurrentChat) {
          addIncomingMessage(msg, user._id);

          // Emit read receipt if viewing this active channel/chat
          if (msg.sender?._id !== user._id && msg.sender !== user._id) {
            globalSocket.emit('message:read', {
              messageIds: [msg._id],
              channelId: currentChannel?._id,
              chatId: currentChat?._id,
            });
          }
        }
      });

      globalSocket.on('message:edited', (msg) => {
        updateMessage(msg);
      });

      globalSocket.on('message:deleted', (msg) => {
        deleteMessageLocally(msg);
      });

      globalSocket.on('message:reaction_updated', ({ message }) => {
        if (message) {
          updateMessage(message);
        }
      });

      globalSocket.on('message:read_receipt', ({ messageIds, user: readUser, readAt }) => {
        markMessagesAsReadLocally(messageIds, readUser, readAt);
      });

      globalSocket.on('typing:display', ({ channelId, chatId, user: typingUser }) => {
        const currentChannel = activeChannelRef.current;
        const currentChat = activeDirectChatRef.current;

        if ((currentChannel && channelId === currentChannel._id) || (currentChat && chatId === currentChat._id)) {
          addTypingUser(typingUser);
        }
      });

      globalSocket.on('typing:hide', ({ userId: typingUserId }) => {
        removeTypingUser(typingUserId);
      });

      globalSocket.on('notepad:updated', ({ channelId, content }) => {
        const currentChannel = activeChannelRef.current;
        if (currentChannel && currentChannel._id === channelId) {
          useWorkspaceStore.setState((state) => ({
            channels: state.channels.map((c) => (c._id === channelId ? { ...c, notepadContent: content } : c)),
            activeChannel: state.activeChannel?._id === channelId ? { ...state.activeChannel, notepadContent: content } : state.activeChannel,
          }));
        }
      });

      // Real-time Thread Replies
      globalSocket.on('thread:reply_new', ({ threadParentId, reply, parentMessage }) => {
        useChatStore.getState().addThreadReplyLocally(reply, parentMessage);

        const activeThread = useUIStore.getState().activeThreadMessage;
        if (activeThread && activeThread._id === threadParentId) {
          useUIStore.getState().updateActiveThreadMessage(parentMessage);
        }
      });

      // Notification for incoming DM outside active view
      globalSocket.on('chat:incoming_dm', ({ chatId, message }) => {
        const currentChat = activeDirectChatRef.current;
        if (!currentChat || currentChat._id !== chatId) {
          sound.playPing();
          toast(
            (t) => (
              <div className="flex items-center gap-3">
                <img src={message.sender?.avatar} alt="" className="w-8 h-8 rounded-full border border-indigo-500/30" />
                <div>
                  <div className="text-xs font-bold text-indigo-400">Direct Message from {message.sender?.name}</div>
                  <div className="text-sm truncate max-w-[200px] text-slate-200">{message.content || 'Sent an attachment'}</div>
                </div>
              </div>
            ),
            { duration: 4000, position: 'top-right' }
          );
        }
      });

      // ==========================================
      // WebRTC Direct Calling Socket Events
      // ==========================================
      globalSocket.on('call:incoming', (incomingData) => {
        useCallStore.getState().setIncomingCall(incomingData);
      });

      globalSocket.on('call:answered', ({ signalData }) => {
        useCallStore.getState().handleDirectCallAnswered(signalData);
      });

      globalSocket.on('call:ice_candidate', ({ candidate }) => {
        useCallStore.getState().handleDirectIceCandidate(candidate);
      });

      globalSocket.on('call:rejected', ({ byUser }) => {
        toast.error(`${byUser?.name || 'User'} declined the call`);
        useCallStore.getState().endCall(globalSocket);
      });

      globalSocket.on('call:ended', () => {
        toast('Call ended', { icon: '📞' });
        useCallStore.getState().endCall(globalSocket);
      });

      // ==========================================
      // WebRTC Voice Channels Socket Events
      // ==========================================
      globalSocket.on('voice:channel_states', (states) => {
        useCallStore.getState().setChannelVoiceStates(states);
      });

      globalSocket.on('voice:room_users', ({ users }) => {
        useCallStore.getState().handleVoiceRoomUsers(users, globalSocket);
      });

      globalSocket.on('voice:signal', (signalData) => {
        useCallStore.getState().handleVoiceSignal(signalData, globalSocket);
      });

      globalSocket.on('voice:user_left', ({ socketId }) => {
        useCallStore.getState().handleVoiceUserLeft(socketId);
      });

      globalSocket.on('voice:user_state_updated', ({ socketId, state }) => {
        useCallStore.getState().handleVoiceUserStateUpdated(socketId, state);
      });
    }

    return () => {
      // Don't disconnect on component re-renders; socket lifecycle tied to user session
    };
  }, [token, user]);

  // Channel room join/leave lifecycle
  useEffect(() => {
    if (!globalSocket || !activeChannel) return;

    globalSocket.emit('channel:join', { channelId: activeChannel._id });

    return () => {
      if (globalSocket && activeChannel) {
        globalSocket.emit('channel:leave', { channelId: activeChannel._id });
      }
    };
  }, [activeChannel?._id]);

  // Direct chat room join/leave lifecycle
  useEffect(() => {
    if (!globalSocket || !activeDirectChat) return;

    globalSocket.emit('chat:join', { chatId: activeDirectChat._id });

    return () => {
      if (globalSocket && activeDirectChat) {
        globalSocket.emit('chat:leave', { chatId: activeDirectChat._id });
      }
    };
  }, [activeDirectChat?._id]);

  // Helper action methods
  const sendMessageViaSocket = (payload, callback) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit('message:send', payload, callback);
    } else {
      // Fallback to REST
      useChatStore.getState().sendMessage(payload).then(msg => {
        if (callback) callback({ success: true, message: msg });
      }).catch(err => {
        if (callback) callback({ success: false, error: err.message });
      });
    }
  };

  const sendTypingStart = () => {
    if (!globalSocket) return;
    if (activeChannel) {
      globalSocket.emit('typing:start', { channelId: activeChannel._id });
    } else if (activeDirectChat) {
      globalSocket.emit('typing:start', { chatId: activeDirectChat._id });
    }
  };

  const sendTypingStop = () => {
    if (!globalSocket) return;
    if (activeChannel) {
      globalSocket.emit('typing:stop', { channelId: activeChannel._id });
    } else if (activeDirectChat) {
      globalSocket.emit('typing:stop', { chatId: activeDirectChat._id });
    }
  };

  const sendReaction = (messageId, emoji) => {
    if (!globalSocket) return;
    globalSocket.emit('message:react', {
      messageId,
      emoji,
      channelId: activeChannel?._id,
      chatId: activeDirectChat?._id,
    });
  };

  const sendNotepadSync = (channelId, content) => {
    if (!globalSocket) return;
    globalSocket.emit('notepad:sync', { channelId, content });
  };

  const sendCursorPosition = (channelId, cursor) => {
    if (!globalSocket) return;
    globalSocket.emit('presence:cursor', { channelId, cursor });
  };

  return {
    socket: globalSocket,
    sendMessageViaSocket,
    sendTypingStart,
    sendTypingStop,
    sendReaction,
    sendNotepadSync,
    sendCursorPosition,
  };
};
