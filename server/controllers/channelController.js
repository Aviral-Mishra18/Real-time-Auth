const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');

// @desc    Create a new channel in a workspace
// @route   POST /api/channels
// @access  Private
exports.createChannel = async (req, res, next) => {
  try {
    const { workspaceId, name, topic, type, members } = req.body;

    if (!workspaceId || !name) {
      return res.status(400).json({ success: false, message: 'Workspace ID and channel name are required' });
    }

    const cleanName = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');

    // Verify workspace membership
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      'members.user': req.user._id,
    });

    if (!workspace) {
      return res.status(403).json({ success: false, message: 'Not a member of this workspace' });
    }

    // Check if channel name already exists in workspace
    const existing = await Channel.findOne({ workspaceId, name: cleanName });
    if (existing) {
      return res.status(400).json({ success: false, message: `Channel #${cleanName} already exists in this workspace` });
    }

    let channelMembers = [req.user._id];
    if (type === 'public' || type === 'voice') {
      channelMembers = workspace.members.map((m) => m.user);
    } else if (Array.isArray(members)) {
      channelMembers = Array.from(new Set([req.user._id.toString(), ...members.map((m) => m.toString())]));
    }

    const channel = await Channel.create({
      workspaceId,
      name: cleanName,
      topic: topic || '',
      type: type || 'public',
      members: channelMembers,
      notepadContent: `# #${cleanName} Notes\n\n- Collaborative scratchpad for #${cleanName}\n- Type here to collaborate live with team members!`,
    });

    res.status(201).json({
      success: true,
      channel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all channels in a workspace
// @route   GET /api/channels/workspace/:workspaceId
// @access  Private
exports.getWorkspaceChannels = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // Verify workspace membership
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      'members.user': req.user._id,
    });

    if (!workspace) {
      return res.status(403).json({ success: false, message: 'Not authorized for this workspace' });
    }

    // Find public channels, voice channels, or private channels user is a member of
    const channels = await Channel.find({
      workspaceId,
      $or: [{ type: 'public' }, { type: 'voice' }, { members: req.user._id }],
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      channels,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update channel
// @route   PUT /api/channels/:id
// @access  Private
exports.updateChannel = async (req, res, next) => {
  try {
    const { name, topic } = req.body;
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (name) {
      channel.name = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    }
    if (topic !== undefined) {
      channel.topic = topic;
    }

    await channel.save();
    res.status(200).json({ success: true, channel });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete channel
// @route   DELETE /api/channels/:id
// @access  Private
exports.deleteChannel = async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (channel.name === 'general') {
      return res.status(400).json({ success: false, message: 'The #general channel cannot be deleted' });
    }

    await Channel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Channel deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update channel collaborative notepad
// @route   PUT /api/channels/:id/notepad
// @access  Private
exports.updateNotepad = async (req, res, next) => {
  try {
    const { content } = req.body;
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      {
        notepadContent: content,
        notepadLastEditedBy: req.user._id,
        notepadLastEditedAt: new Date(),
      },
      { new: true }
    ).populate('notepadLastEditedBy', 'name avatar');

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    res.status(200).json({
      success: true,
      notepadContent: channel.notepadContent,
      lastEditedBy: channel.notepadLastEditedBy,
      lastEditedAt: channel.notepadLastEditedAt,
    });
  } catch (error) {
    next(error);
  }
};
