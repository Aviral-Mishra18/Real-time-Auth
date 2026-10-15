const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
      lowercase: true,
      maxlength: [40, 'Channel name cannot exceed 40 characters'],
    },
    topic: {
      type: String,
      default: '',
      maxlength: [250, 'Topic cannot exceed 250 characters'],
    },
    type: {
      type: String,
      enum: ['public', 'private', 'announcement', 'voice'],
      default: 'public',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    notepadContent: {
      type: String,
      default: '# Channel Collaborative Notes\n\nWelcome to your channel notepad! Everything written here syncs in real-time with team members.',
    },
    notepadLastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notepadLastEditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure unique channel name within the same workspace
channelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Channel', channelSchema);
