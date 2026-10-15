import { create } from 'zustand';
import api from '../api/client';
import toast from 'react-hot-toast';
import { sound } from '../utils/sound';

export const useChatStore = create((set, get) => ({
  directChats: [],
  activeDirectChat: null,
  messages: [],
  isLoadingMessages: false,
  isLoadingOlder: false,
  hasMore: false,
  activeTab: 'chat', // 'chat' | 'notepad' | 'pinned' | 'members'
  typingUsers: [], // [{ _id, name, avatar }]
  onlineUserIds: [], // ['userId1', 'userId2']
  replyingTo: null,
  editingMessage: null,

  // Thread Drawer State
  threadReplies: [],
  isLoadingThread: false,

  // Set active tab
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Set replying to
  setReplyingTo: (msg) => set({ replyingTo: msg }),

  // Set editing message
  setEditingMessage: (msg) => set({ editingMessage: msg }),

  // Online users update
  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),

  // Fetch Direct Chats
  fetchDirectChats: async () => {
    try {
      const res = await api.get('/api/chats');
      if (res.data.success) {
        set({ directChats: res.data.chats });
      }
    } catch (err) {
      console.error('Failed to fetch direct chats:', err);
    }
  },

  // Open or create Direct Chat with a user
  openDirectChatWithUser: async (recipientId) => {
    try {
      const res = await api.post('/api/chats', { recipientId });
      if (res.data.success) {
        const chat = res.data.chat;
        set((state) => {
          const exists = state.directChats.some((c) => c._id === chat._id);
          return {
            directChats: exists ? state.directChats : [chat, ...state.directChats],
            activeDirectChat: chat,
          };
        });
        get().fetchMessages({ directChatId: chat._id });
        return chat;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open direct chat');
    }
  },

  // Select active direct chat
  selectDirectChat: (chat) => {
    set({ activeDirectChat: chat });
    if (chat) {
      get().fetchMessages({ directChatId: chat._id });
    }
  },

  // Clear direct chat selection (when switching to workspace channels)
  clearDirectChat: () => {
    set({ activeDirectChat: null });
  },

  // Fetch initial messages for current channel or DM
  fetchMessages: async ({ channelId, directChatId }) => {
    set({ isLoadingMessages: true, messages: [] });
    try {
      const params = {};
      if (channelId) params.channelId = channelId;
      if (directChatId) params.directChatId = directChatId;
      params.limit = 40;

      const res = await api.get('/api/messages', { params });
      if (res.data.success) {
        set({
          messages: res.data.messages,
          hasMore: res.data.hasMore,
          isLoadingMessages: false,
        });
      }
    } catch (err) {
      set({ isLoadingMessages: false });
      console.error('Failed to fetch messages:', err);
    }
  },

  // Fetch older messages (pagination / infinite scroll up)
  fetchOlderMessages: async ({ channelId, directChatId }) => {
    const currentMessages = get().messages;
    if (currentMessages.length === 0 || get().isLoadingOlder || !get().hasMore) return;

    set({ isLoadingOlder: true });
    try {
      const oldestMessage = currentMessages[0];
      const params = {
        before: oldestMessage.createdAt,
        limit: 30,
      };
      if (channelId) params.channelId = channelId;
      if (directChatId) params.directChatId = directChatId;

      const res = await api.get('/api/messages', { params });
      if (res.data.success) {
        const older = res.data.messages;
        set({
          messages: [...older, ...currentMessages],
          hasMore: res.data.hasMore,
          isLoadingOlder: false,
        });
      }
    } catch (err) {
      set({ isLoadingOlder: false });
      console.error('Failed to load older messages:', err);
    }
  },

  // Add incoming message in real-time
  addIncomingMessage: (msg, currentUserId) => {
    // Avoid duplicate message if already in list
    set((state) => {
      if (state.messages.some((m) => m._id === msg._id)) {
        return state;
      }
      return { messages: [...state.messages, msg] };
    });

    // Play chime sound if message is from someone else
    if (msg.sender?._id !== currentUserId && msg.sender !== currentUserId) {
      sound.playMessageSound();
    }
  },

  // Update existing message (edit or reactions)
  updateMessage: (updatedMsg) => {
    set((state) => ({
      messages: state.messages.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)),
    }));
  },

  // Delete message
  deleteMessageLocally: (deletedMsg) => {
    set((state) => ({
      messages: state.messages.map((m) => (m._id === deletedMsg._id ? deletedMsg : m)),
    }));
  },

  // Read receipts update
  markMessagesAsReadLocally: (messageIds, user, readAt) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (messageIds.includes(m._id)) {
          const alreadyRead = m.readBy?.some((r) => r.user?._id === user._id || r.user === user._id);
          if (!alreadyRead) {
            return {
              ...m,
              readBy: [...(m.readBy || []), { user, readAt }],
            };
          }
        }
        return m;
      }),
    }));
  },

  // Add typing user
  addTypingUser: (user) => {
    set((state) => {
      const exists = state.typingUsers.some((u) => u._id === user._id);
      if (exists) return state;
      return { typingUsers: [...state.typingUsers, user] };
    });
  },

  // Remove typing user
  removeTypingUser: (userId) => {
    set((state) => ({
      typingUsers: state.typingUsers.filter((u) => u._id !== userId),
    }));
  },

  // Send message REST fallback / helper
  sendMessage: async ({ channelId, directChatId, content, attachments, replyTo }) => {
    try {
      const res = await api.post('/api/messages', {
        channelId,
        directChatId,
        content,
        attachments,
        replyTo,
      });
      if (res.data.success) {
        return res.data.message;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
      throw err;
    }
  },

  // Edit message
  editMessage: async (messageId, content) => {
    try {
      const res = await api.put(`/api/messages/${messageId}`, { content });
      if (res.data.success) {
        get().updateMessage(res.data.message);
        set({ editingMessage: null });
        toast.success('Message updated');
        return res.data.message;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to edit message');
    }
  },

  // Delete message
  deleteMessage: async (messageId) => {
    try {
      const res = await api.delete(`/api/messages/${messageId}`);
      if (res.data.success) {
        get().deleteMessageLocally(res.data.message);
        toast.success('Message deleted');
        return res.data.message;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete message');
    }
  },

  // Toggle reaction
  toggleReaction: async (messageId, emoji) => {
    try {
      const res = await api.post(`/api/messages/${messageId}/react`, { emoji });
      if (res.data.success) {
        get().updateMessage(res.data.message);
        return res.data.message;
      }
    } catch (err) {
      console.error('Failed to react:', err);
    }
  },

  // Toggle pin
  togglePin: async (messageId) => {
    try {
      const res = await api.post(`/api/messages/${messageId}/pin`);
      if (res.data.success) {
        get().updateMessage(res.data.message);
        toast.success(res.data.message.isPinned ? 'Message pinned! 📌' : 'Message unpinned');
        return res.data.message;
      }
    } catch (err) {
      toast.error('Failed to pin message');
    }
  },

  // Fetch replies for an open thread
  fetchThreadReplies: async (threadParentId) => {
    if (!threadParentId) return;
    set({ isLoadingThread: true, threadReplies: [] });
    try {
      const res = await api.get(`/api/messages/thread/${threadParentId}`);
      if (res.data.success) {
        set({
          threadReplies: res.data.replies,
          isLoadingThread: false,
        });
        return res.data;
      }
    } catch (err) {
      console.error('Failed to fetch thread replies:', err);
      set({ isLoadingThread: false });
    }
  },

  // Add thread reply in real-time
  addThreadReplyLocally: (reply, parentMessage) => {
    set((state) => {
      // Add to threadReplies if not already present
      const alreadyInThread = state.threadReplies.some((r) => r._id === reply._id);
      const newReplies = alreadyInThread ? state.threadReplies : [...state.threadReplies, reply];

      // Update parent message in main messages list
      const updatedMessages = state.messages.map((m) =>
        m._id === parentMessage._id ? { ...m, ...parentMessage } : m
      );

      return {
        threadReplies: newReplies,
        messages: updatedMessages,
      };
    });
  },

  // Send a reply in a thread
  sendThreadReply: async (payload) => {
    try {
      const res = await api.post('/api/messages', payload);
      if (res.data.success) {
        return res.data.message;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send thread reply');
      throw err;
    }
  },
}));
