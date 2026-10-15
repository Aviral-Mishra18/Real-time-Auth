const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { processAiMessage, getOrCreateBotUser } = require('../services/aiService');

// @desc    Generate instant 1-click TL;DR summary for a channel
// @route   POST /api/ai/summarize/:channelId
// @access  Private
exports.summarizeChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    // Fetch the last 30 messages in this channel
    const recentMessages = await Message.find({ channelId })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('sender', 'name');

    recentMessages.reverse();

    const { aiMessage, botUser, updatedNotepad } = await processAiMessage({
      channelId,
      content: '/summary',
      user: req.user,
      recentMessages,
    });

    // Broadcast AI message via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${channelId}`).emit('message:new', aiMessage);
      if (updatedNotepad) {
        io.to(`channel:${channelId}`).emit('notepad:updated', {
          channelId,
          content: updatedNotepad,
          user: botUser,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: aiMessage,
      summary: aiMessage.content,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ask AI assistant directly via REST
// @route   POST /api/ai/ask
// @access  Private
exports.askAi = async (req, res, next) => {
  try {
    const { channelId, directChatId, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    let recentMessages = [];
    if (channelId) {
      recentMessages = await Message.find({ channelId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('sender', 'name');
      recentMessages.reverse();
    }

    const { aiMessage, botUser, updatedNotepad } = await processAiMessage({
      channelId,
      directChatId,
      content: prompt,
      user: req.user,
      recentMessages,
    });

    const io = req.app.get('io');
    if (io) {
      const room = channelId ? `channel:${channelId}` : `chat:${directChatId}`;
      io.to(room).emit('message:new', aiMessage);
      if (updatedNotepad && channelId) {
        io.to(`channel:${channelId}`).emit('notepad:updated', {
          channelId,
          content: updatedNotepad,
          user: botUser,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: aiMessage,
    });
  } catch (error) {
    next(error);
  }
};
