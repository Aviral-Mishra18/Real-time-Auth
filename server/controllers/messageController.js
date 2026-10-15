const Message = require('../models/Message');
const DirectChat = require('../models/DirectChat');
const Channel = require('../models/Channel');

// @desc    Get messages for a channel or direct chat (paginated)
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { channelId, directChatId, threadParentId, limit = 50, before } = req.query;

    if (!channelId && !directChatId && !threadParentId) {
      return res.status(400).json({ success: false, message: 'Please specify channelId or directChatId' });
    }

    const query = {};
    if (threadParentId) {
      query.threadParentId = threadParentId;
    } else {
      query.$or = [{ threadParentId: null }, { threadParentId: { $exists: false } }, { broadcastToChannel: true }];
      if (channelId) query.channelId = channelId;
      if (directChatId) query.directChatId = directChatId;
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100);

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .populate('sender', 'name email avatar status customStatus isBot')
      .populate('reactions.users', 'name avatar')
      .populate('pinnedBy', 'name avatar')
      .populate('replyParticipants', 'name avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name avatar' },
      });

    const totalCount = await Message.countDocuments(query);
    const hasMore = messages.length === parsedLimit;

    // Return in chronological order (oldest to newest)
    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      hasMore,
      totalCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get replies in a dedicated thread
// @route   GET /api/messages/thread/:threadParentId
// @access  Private
exports.getThreadReplies = async (req, res, next) => {
  try {
    const { threadParentId } = req.params;

    const parentMessage = await Message.findById(threadParentId)
      .populate('sender', 'name email avatar status customStatus isBot')
      .populate('reactions.users', 'name avatar')
      .populate('replyParticipants', 'name avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name avatar' },
      });

    if (!parentMessage) {
      return res.status(404).json({ success: false, message: 'Thread parent message not found' });
    }

    const replies = await Message.find({ threadParentId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email avatar status customStatus isBot')
      .populate('reactions.users', 'name avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name avatar' },
      });

    res.status(200).json({
      success: true,
      parentMessage,
      replies,
      count: replies.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a new message or thread reply
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
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
    } = req.body;

    if (!channelId && !directChatId) {
      return res.status(400).json({ success: false, message: 'Must specify channelId or directChatId' });
    }

    if (!content && (!attachments || attachments.length === 0) && !isVoiceNote) {
      return res.status(400).json({ success: false, message: 'Message content, attachments, or voice note required' });
    }

    const message = await Message.create({
      channelId: channelId || null,
      directChatId: directChatId || null,
      sender: req.user._id,
      content: content || '',
      attachments: attachments || [],
      replyTo: replyTo || threadParentId || null,
      threadParentId: threadParentId || null,
      broadcastToChannel: Boolean(broadcastToChannel),
      isVoiceNote: Boolean(isVoiceNote),
      voiceDuration: voiceDuration || 0,
      voiceWaveform: voiceWaveform || [],
      readBy: [{ user: req.user._id, readAt: new Date() }],
    });

    if (threadParentId) {
      await Message.findByIdAndUpdate(threadParentId, {
        $inc: { replyCount: 1 },
        $addToSet: { replyParticipants: req.user._id },
        lastReplyAt: new Date(),
      });
    }

    if (directChatId) {
      await DirectChat.findByIdAndUpdate(directChatId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email avatar status customStatus isBot')
      .populate('replyParticipants', 'name avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name avatar' },
      });

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private
exports.editMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this message' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ success: false, message: 'Cannot edit a deleted message' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email avatar status customStatus')
      .populate('reactions.users', 'name avatar')
      .populate('pinnedBy', 'name avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name avatar' },
      });

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message (soft delete)
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    message.attachments = [];
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email avatar status customStatus')
      .populate('reactions.users', 'name avatar');

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle emoji reaction on message
// @route   POST /api/messages/:id/react
// @access  Private
exports.toggleReaction = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

    if (reactionIndex > -1) {
      // Emoji group exists
      const userIndex = message.reactions[reactionIndex].users.findIndex(
        (u) => u.toString() === req.user._id.toString()
      );

      if (userIndex > -1) {
        // Remove reaction
        message.reactions[reactionIndex].users.splice(userIndex, 1);
        if (message.reactions[reactionIndex].users.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      } else {
        // Add user to reaction group
        message.reactions[reactionIndex].users.push(req.user._id);
      }
    } else {
      // New emoji reaction
      message.reactions.push({
        emoji,
        users: [req.user._id],
      });
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email avatar status customStatus')
      .populate('reactions.users', 'name avatar');

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pin on message
// @route   POST /api/messages/:id/pin
// @access  Private
exports.togglePin = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.isPinned = !message.isPinned;
    if (message.isPinned) {
      message.pinnedBy = req.user._id;
      message.pinnedAt = new Date();
    } else {
      message.pinnedBy = null;
      message.pinnedAt = null;
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email avatar status customStatus')
      .populate('pinnedBy', 'name avatar');

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pinned messages for a channel or DM
// @route   GET /api/messages/pinned
// @access  Private
exports.getPinnedMessages = async (req, res, next) => {
  try {
    const { channelId, directChatId } = req.query;
    const query = { isPinned: true };

    if (channelId) query.channelId = channelId;
    if (directChatId) query.directChatId = directChatId;

    const pinnedMessages = await Message.find(query)
      .sort({ pinnedAt: -1 })
      .populate('sender', 'name email avatar status customStatus')
      .populate('pinnedBy', 'name avatar');

    res.status(200).json({ success: true, messages: pinnedMessages });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload file attachment
// @route   POST /api/messages/upload
// @access  Private
exports.uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      file: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};
