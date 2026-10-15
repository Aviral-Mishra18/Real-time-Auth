const crypto = require('crypto');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');

const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters hex
};

// @desc    Create a new workspace
// @route   POST /api/workspaces
// @access  Private
exports.createWorkspace = async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Workspace name is required' });
    }

    const inviteCode = generateInviteCode();

    const workspace = await Workspace.create({
      name,
      description: description || '',
      icon: icon || '',
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
      inviteCode,
    });

    // Create default channels: #general and #random
    const generalChannel = await Channel.create({
      workspaceId: workspace._id,
      name: 'general',
      topic: 'General team discussions & updates',
      type: 'public',
      members: [req.user._id],
    });

    const randomChannel = await Channel.create({
      workspaceId: workspace._id,
      name: 'random',
      topic: 'Non-work banter, memes, and fun topics',
      type: 'public',
      members: [req.user._id],
    });

    const populatedWorkspace = await Workspace.findById(workspace._id).populate('members.user', 'name email avatar status customStatus');

    res.status(201).json({
      success: true,
      workspace: populatedWorkspace,
      defaultChannelId: generalChannel._id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all workspaces user is a member of
// @route   GET /api/workspaces
// @access  Private
exports.getMyWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
    })
      .populate('members.user', 'name email avatar status customStatus')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get workspace details by ID
// @route   GET /api/workspaces/:id
// @access  Private
exports.getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      'members.user': req.user._id,
    }).populate('members.user', 'name email avatar status customStatus bio lastSeen');

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found or unauthorized' });
    }

    const channels = await Channel.find({ workspaceId: workspace._id });

    res.status(200).json({
      success: true,
      workspace,
      channels,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join workspace via invite code
// @route   POST /api/workspaces/join
// @access  Private
exports.joinByInviteCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Invite code is required' });
    }

    const workspace = await Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() });

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invite code' });
    }

    // Check if already a member
    const isMember = workspace.members.some((m) => m.user.toString() === req.user._id.toString());
    if (isMember) {
      return res.status(400).json({ success: false, message: 'You are already a member of this workspace', workspaceId: workspace._id });
    }

    // Add to workspace members
    workspace.members.push({ user: req.user._id, role: 'member' });
    await workspace.save();

    // Auto add user to public channels in this workspace
    await Channel.updateMany(
      { workspaceId: workspace._id, type: 'public' },
      { $addToSet: { members: req.user._id } }
    );

    const populatedWorkspace = await Workspace.findById(workspace._id).populate('members.user', 'name email avatar status customStatus');

    res.status(200).json({
      success: true,
      message: `Successfully joined ${workspace.name}!`,
      workspace: populatedWorkspace,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update workspace details (Owner or Admin only)
// @route   PUT /api/workspaces/:id
// @access  Private
exports.updateWorkspace = async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Check permissions
    const memberRecord = workspace.members.find((m) => m.user.toString() === req.user._id.toString());
    if (!memberRecord || !['owner', 'admin'].includes(memberRecord.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this workspace' });
    }

    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (icon !== undefined) workspace.icon = icon;

    await workspace.save();
    const updated = await Workspace.findById(workspace._id).populate('members.user', 'name email avatar status customStatus');

    res.status(200).json({ success: true, workspace: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate invite code
// @route   POST /api/workspaces/:id/regenerate-invite
// @access  Private
exports.regenerateInviteCode = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });

    const memberRecord = workspace.members.find((m) => m.user.toString() === req.user._id.toString());
    if (!memberRecord || !['owner', 'admin'].includes(memberRecord.role)) {
      return res.status(403).json({ success: false, message: 'Only workspace admins can regenerate invite codes' });
    }

    workspace.inviteCode = generateInviteCode();
    await workspace.save();

    res.status(200).json({ success: true, inviteCode: workspace.inviteCode });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave workspace
// @route   POST /api/workspaces/:id/leave
// @access  Private
exports.leaveWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });

    if (workspace.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Workspace owner cannot leave. Transfer ownership or delete workspace.' });
    }

    workspace.members = workspace.members.filter((m) => m.user.toString() !== req.user._id.toString());
    await workspace.save();

    res.status(200).json({ success: true, message: 'Left workspace successfully' });
  } catch (error) {
    next(error);
  }
};
