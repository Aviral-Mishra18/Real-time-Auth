const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const { connectDB } = require('./config/db');
const User = require('./models/User');
const Workspace = require('./models/Workspace');
const Channel = require('./models/Channel');
const Message = require('./models/Message');

const seedData = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    console.log('[Seed] Connected to database');

    // Check if demo users already exist
    const existing = await User.findOne({ email: 'alex@syncspace.io' });
    if (existing) {
      console.log('[Seed] Demo data already exists. Skipping seed.');
      process.exit(0);
    }

    console.log('[Seed] Seeding sample demo users and workspaces...');

    // Create Demo Users
    const alex = await User.create({
      name: 'Alex Rivers',
      email: 'alex@syncspace.io',
      password: 'password123',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      customStatus: '🚀 Building SyncSpace 2.0',
      bio: 'Full-stack lead & architect passionate about real-time distributed systems.',
    });

    const sarah = await User.create({
      name: 'Sarah Chen',
      email: 'sarah@syncspace.io',
      password: 'password123',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      customStatus: '🎨 Refining design tokens',
      bio: 'Lead product designer crafting crisp micro-interactions and dark mode experiences.',
    });

    const david = await User.create({
      name: 'David Miller',
      email: 'david@syncspace.io',
      password: 'password123',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: 'idle',
      customStatus: '☕ Grabbing coffee',
      bio: 'DevOps & infrastructure engineer.',
    });

    // Create Workspace
    const workspace = await Workspace.create({
      name: 'Acme HQ',
      description: 'Primary workspace for Acme core product engineering, design, and collaboration.',
      owner: alex._id,
      members: [
        { user: alex._id, role: 'owner' },
        { user: sarah._id, role: 'admin' },
        { user: david._id, role: 'member' },
      ],
      inviteCode: 'SYNC2025',
    });

    // Create Channels
    const generalChannel = await Channel.create({
      workspaceId: workspace._id,
      name: 'general',
      topic: 'Company-wide announcements & general team discussions',
      type: 'public',
      members: [alex._id, sarah._id, david._id],
      notepadContent: '# Acme HQ Team Knowledge Base\n\n### Welcome to SyncSpace!\n- **Sprint Goals**: Ship real-time chat with Socket.io & MongoDB\n- **Notepad**: Real-time collaborative shared notes\n- **Standup**: Every weekday at 10:00 AM UTC',
    });

    const devChannel = await Channel.create({
      workspaceId: workspace._id,
      name: 'development',
      topic: 'Frontend & backend engineering discussions, code reviews, and releases',
      type: 'public',
      members: [alex._id, sarah._id, david._id],
      notepadContent: '# Development Guidelines\n\n- Use Node.js & Socket.io for backend\n- React + Tailwind for UI\n- Test real-time message broadcasting before deployment',
    });

    const designChannel = await Channel.create({
      workspaceId: workspace._id,
      name: 'design',
      topic: 'Figma mockups, UI tokens, and design critique',
      type: 'public',
      members: [alex._id, sarah._id, david._id],
      notepadContent: '# Design System Tokens\n\n- Primary: Indigo 600 (`#4f46e5`)\n- Surface: Dark slate (`#0B0F19`)\n- Typography: Inter & JetBrains Mono',
    });

    const voiceChannel = await Channel.create({
      workspaceId: workspace._id,
      name: 'voice-lounge',
      topic: 'Team audio hangouts, pair programming & screen sharing',
      type: 'voice',
      members: [alex._id, sarah._id, david._id],
      notepadContent: '# Voice Lounge Notes\n\n- Quick meeting scratchpad & call agendas',
    });

    // Sample Messages in #general
    await Message.create([
      {
        channelId: generalChannel._id,
        sender: alex._id,
        content: 'Hey team! Welcome to our new real-time collaboration workspace **SyncSpace** 🚀',
        reactions: [{ emoji: '🎉', users: [sarah._id, david._id] }, { emoji: '🔥', users: [alex._id] }],
        readBy: [{ user: alex._id, readAt: new Date() }, { user: sarah._id, readAt: new Date() }],
      },
      {
        channelId: generalChannel._id,
        sender: sarah._id,
        content: 'Loving the real-time typing indicators and live collaborative notepad in every channel! ✨',
        reactions: [{ emoji: '❤️', users: [alex._id] }],
        readBy: [{ user: sarah._id, readAt: new Date() }],
      },
      {
        channelId: generalChannel._id,
        sender: alex._id,
        content: 'Check out the code blocks support as well:\n```js\nconst sync = new SocketHandler({ live: true });\nconsole.log("Team synced up!");\n```',
        isPinned: true,
        pinnedBy: alex._id,
        pinnedAt: new Date(),
        readBy: [{ user: alex._id, readAt: new Date() }],
      },
    ]);

    console.log('[Seed] Demo data seeded successfully! Demo invite code: SYNC2025');
    return { success: true };
  } catch (err) {
    console.error('[Seed] Error seeding data:', err);
    if (require.main === module) process.exit(1);
  }
};

if (require.main === module) {
  seedData().then(() => process.exit(0));
}

module.exports = { seedData };
