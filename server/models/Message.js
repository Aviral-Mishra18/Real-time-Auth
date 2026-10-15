const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,
      required: true,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
    },
    type: {
      type: String,
    },
    duration: {
      type: Number,
      default: 0,
    },
    waveform: [
      {
        type: Number,
      },
    ],
  },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      index: true,
    },
    directChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectChat',
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    attachments: [attachmentSchema],
    reactions: [reactionSchema],
    readBy: [readReceiptSchema],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pinnedAt: {
      type: Date,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    isAi: {
      type: Boolean,
      default: false,
    },
    threadParentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      index: true,
      default: null,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    replyParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastReplyAt: {
      type: Date,
    },
    broadcastToChannel: {
      type: Boolean,
      default: false,
    },
    isVoiceNote: {
      type: Boolean,
      default: false,
    },
    voiceDuration: {
      type: Number,
      default: 0,
    },
    voiceWaveform: [
      {
        type: Number,
      },
    ],
  },
  { timestamps: true }
);

// Optimize query for fetching messages by channel / DM with timestamps pagination
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ directChatId: 1, createdAt: -1 });
messageSchema.index({ threadParentId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
