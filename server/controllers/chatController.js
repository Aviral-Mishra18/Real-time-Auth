const DirectChat = require('../models/DirectChat');
const User = require('../models/User');

// @desc    Get or create a 1-on-1 Direct Chat
// @route   POST /api/chats
// @access  Private
exports.getOrCreateDirectChat = async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required' });
    }

    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot create direct chat with yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    // Look for existing chat between these 2 users
    let chat = await DirectChat.findOne({
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    })
      .populate('participants', 'name email avatar status customStatus bio lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      });

    if (!chat) {
      chat = await DirectChat.create({
        participants: [req.user._id, recipientId],
      });
      chat = await DirectChat.findById(chat._id).populate(
        'participants',
        'name email avatar status customStatus bio lastSeen'
      );
    }

    res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all direct chats for current user
// @route   GET /api/chats
// @access  Private
exports.getDirectChats = async (req, res, next) => {
  try {
    const chats = await DirectChat.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email avatar status customStatus bio lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    next(error);
  }
};
