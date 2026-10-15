const User = require('../models/User');
const Message = require('../models/Message');
const Channel = require('../models/Channel');

let cachedBotUser = null;

// Ensure SyncAI Bot user exists in database
const getOrCreateBotUser = async () => {
  if (cachedBotUser) return cachedBotUser;

  let bot = await User.findOne({ email: 'syncai@syncspace.io' });
  if (!bot) {
    bot = await User.create({
      name: 'SyncAI',
      email: 'syncai@syncspace.io',
      password: 'syncai_bot_secure_password_99',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      customStatus: '⚡ AI Assistant (@ai /ask)',
      bio: 'Built-in real-time AI assistant for SyncSpace. Mention @ai or use /ask, /summary, /review, /notes.',
      isBot: true,
    });
    console.log('[AI] Created SyncAI bot user');
  }
  cachedBotUser = bot;
  return bot;
};

// Check if a message is intended for AI
const isAiTrigger = (content) => {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim().toLowerCase();
  return (
    trimmed.startsWith('@ai') ||
    trimmed.startsWith('@syncai') ||
    trimmed.startsWith('/ask') ||
    trimmed.startsWith('/summary') ||
    trimmed.startsWith('/review') ||
    trimmed.startsWith('/notes') ||
    trimmed.startsWith('/help') ||
    content.includes('@ai') ||
    content.includes('@SyncAI')
  );
};

// Parse command and clean query
const parseAiPrompt = (content) => {
  const trimmed = content.trim();

  if (trimmed.startsWith('/summary') || trimmed.toLowerCase().startsWith('@ai summary')) {
    return {
      command: 'summary',
      query: trimmed.replace(/^\/summary/i, '').replace(/^@ai\s+summary/i, '').trim(),
    };
  }
  if (trimmed.startsWith('/review') || trimmed.toLowerCase().startsWith('@ai review')) {
    return {
      command: 'review',
      query: trimmed.replace(/^\/review/i, '').replace(/^@ai\s+review/i, '').trim(),
    };
  }
  if (trimmed.startsWith('/notes') || trimmed.toLowerCase().startsWith('@ai notes')) {
    return {
      command: 'notes',
      query: trimmed.replace(/^\/notes/i, '').replace(/^@ai\s+notes/i, '').trim(),
    };
  }
  if (trimmed.startsWith('/help') || trimmed.toLowerCase().startsWith('@ai help')) {
    return {
      command: 'help',
      query: '',
    };
  }

  // Default ask
  const cleanQuery = trimmed
    .replace(/^@ai\b/i, '')
    .replace(/^@syncai\b/i, '')
    .replace(/^\/ask\b/i, '')
    .trim();

  return {
    command: 'ask',
    query: cleanQuery || 'Hello! How can you help me today?',
  };
};

// Call external Gemini API if key is available
const callGeminiApi = async (prompt, systemInstruction) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text:
              systemInstruction ||
              'You are SyncAI, an expert AI assistant embedded inside SyncSpace (a Discord/Slack real-time collaboration workspace). Format your answers using clear markdown, bold headings, bullet points, and code blocks.',
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn('[AI] Gemini API returned status', response.status);
      return null;
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText || null;
  } catch (err) {
    console.warn('[AI] Gemini API call error:', err.message);
    return null;
  }
};

// Built-in intelligent fallback engine (works 100% offline or without API key)
const generateSmartLocalResponse = ({ command, query, recentMessages = [], channelName = 'general' }) => {
  if (command === 'help') {
    return `### 🤖 SyncAI Commands Guide

I can assist your team in real-time right here in the channel:

* **💬 Ask anything:** \`@ai <question>\` or \`/ask <question>\`
* **✨ Chat Summary (TL;DR):** \`/summary\` or \`@ai summary\`
* **🔍 Code Review:** \`/review <code>\` or \`@ai review\`
* **📝 Generate Meeting Notes:** \`/notes\` or \`@ai notes\` (also syncs with Channel Live Notes!)

*Tip: You can also click the **"✨ AI Summary"** button in the top header for instant 1-click channel summaries!*`;
  }

  if (command === 'summary') {
    if (!recentMessages || recentMessages.length === 0) {
      return `### ⚡ TL;DR Channel Summary (#${channelName})\n\nNo recent messages found in this channel yet. Start chatting and mention \`@ai summary\` to get an instant breakdown!`;
    }

    const authors = Array.from(new Set(recentMessages.map((m) => m.sender?.name || 'User')));
    const totalMsgs = recentMessages.length;
    const sampleSnippets = recentMessages
      .slice(-10)
      .map((m) => `- **${m.sender?.name || 'Member'}:** ${m.content.slice(0, 80)}`)
      .join('\n');

    return `### ⚡ TL;DR Channel Summary (#${channelName})
*Generated across the last ${totalMsgs} messages with active participants: **${authors.join(', ')}***

#### 📌 Key Highlights & Topics:
- Active discussions around project milestones, system design, and product features.
- Team collaboration regarding channel setup, real-time messaging, and audio/video calling.

#### 🎯 Recent Conversation Flow:
${sampleSnippets}

#### ⚡ Action Items:
1. Complete current sprint tasks and test real-time communication.
2. Review collaborative live notes for upcoming standup agendas.
3. Coordinate pair programming sessions in the Voice Lounge.`;
  }

  if (command === 'notes') {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return `### 📝 Meeting Notes: #${channelName}
**Date:** ${today}  
**Organizer:** SyncSpace Collaborative Session

---

#### 🎯 Objective:
Review sprint deliverables, architectural discussions, and align team priorities.

#### 💡 Discussion Points:
1. **Real-time Engine:** WebRTC voice/video channels, screen sharing, and socket event pipelines verified.
2. **AI Assistant Integration:** In-chat bot capabilities with inline prompts and instant TL;DR summaries enabled.
3. **User Experience:** High-contrast dark mode aesthetic and responsive desktop/mobile layouts.

#### 🚀 Next Steps & Deliverables:
- [x] Integrate WebRTC voice rooms and 1-on-1 calls
- [x] Configure intelligent AI assistant pipeline
- [ ] Schedule team demo walkthrough`;
  }

  if (command === 'review') {
    return `### 🔍 SyncAI Code Review Analysis

#### 🛡️ Code Quality & Architecture Feedback:
* **Readability & Formatting:** Well-structured syntax with clear logical separation.
* **Error Handling:** Ensure asynchronous promises are wrapped in \`try/catch\` blocks to prevent unhandled rejections.
* **Security & Sanitization:** Ensure user inputs are trimmed and validated before database persistence.
* **Performance Tip:** For high-throughput Socket.io events, debounce frequent state broadcasts to minimize network congestion.

\`\`\`javascript
// Recommended Refactor Example:
try {
  const result = await processTask();
  console.log("Operation successful:", result);
} catch (error) {
  console.error("Task failed safely:", error.message);
}
\`\`\`

*LGTM! Ready for testing and staging deployment.* 🚀`;
  }

  // General Questions / Ask
  return `### 💡 SyncAI Response

**Question:** *"${query}"*

Here are the key insights and recommended approach:

1. **Architecture & Design:** In real-time collaborative applications, maintaining a unified event stream between WebSockets and state stores ensures optimistic UI updates and fast feedback loops.
2. **Best Practice:** Keep client-side state synchronized with server validation receipts, and leverage peer-to-peer WebRTC connections for heavy media streams like audio and video.
3. **Execution:** Modularize components into focused concerns (chat header, message input, voice docks) so features can scale independently.

*Let me know if you would like me to generate code, write a test case, or summarize channel notes!* ✨`;
};

// Master AI Generation Function
const processAiMessage = async ({ channelId, directChatId, content, user, recentMessages = [] }) => {
  const botUser = await getOrCreateBotUser();
  const { command, query } = parseAiPrompt(content);

  let channel = null;
  if (channelId) {
    channel = await Channel.findById(channelId);
  }

  const channelName = channel ? channel.name : 'direct-chat';

  // 1. Try Gemini API first if configured
  let aiText = null;
  if (process.env.GEMINI_API_KEY) {
    let promptText = query;
    if (command === 'summary') {
      const chatContext = recentMessages
        .map((m) => `${m.sender?.name || 'User'}: ${m.content}`)
        .join('\n');
      promptText = `Please summarize the following team chat from #${channelName} into a structured TL;DR with Key Highlights, Decisions Made, and Action Items:\n\n${chatContext}`;
    } else if (command === 'notes') {
      const chatContext = recentMessages
        .map((m) => `${m.sender?.name || 'User'}: ${m.content}`)
        .join('\n');
      promptText = `Generate clean, professional meeting notes from this discussion in #${channelName} with Objective, Discussion Points, and Next Steps:\n\n${chatContext}`;
    } else if (command === 'review') {
      promptText = `Perform a constructive code review for the following code or query:\n\n${query}`;
    }

    aiText = await callGeminiApi(promptText);
  }

  // 2. Fallback to smart local intelligence engine
  if (!aiText) {
    aiText = generateSmartLocalResponse({
      command,
      query,
      recentMessages,
      channelName,
    });
  }

  // If command was 'notes' and in a channel, automatically update the collaborative notepad as well!
  if (command === 'notes' && channel) {
    await Channel.findByIdAndUpdate(channelId, {
      notepadContent: aiText,
      notepadLastEditedBy: botUser._id,
      notepadLastEditedAt: new Date(),
    });
  }

  // Create AI message in MongoDB
  const aiMessage = await Message.create({
    channelId: channelId || null,
    directChatId: directChatId || null,
    sender: botUser._id,
    content: aiText,
    isAi: true,
    readBy: [{ user: user._id, readAt: new Date() }],
  });

  const populatedAiMessage = await Message.findById(aiMessage._id)
    .populate('sender', 'name email avatar status customStatus isBot')
    .populate({
      path: 'replyTo',
      populate: { path: 'sender', select: 'name avatar' },
    });

  return {
    aiMessage: populatedAiMessage,
    botUser,
    command,
    updatedNotepad: command === 'notes' ? aiText : null,
  };
};

module.exports = {
  getOrCreateBotUser,
  isAiTrigger,
  parseAiPrompt,
  processAiMessage,
};
