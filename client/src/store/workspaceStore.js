import { create } from 'zustand';
import api from '../api/client';
import toast from 'react-hot-toast';

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  channels: [],
  activeChannel: null,
  isLoadingWorkspaces: false,
  isLoadingChannels: false,

  // Fetch all workspaces user is a member of
  fetchWorkspaces: async () => {
    set({ isLoadingWorkspaces: true });
    try {
      const res = await api.get('/api/workspaces');
      if (res.data.success) {
        const workspaces = res.data.workspaces;
        set({ workspaces, isLoadingWorkspaces: false });

        // If no active workspace or active is no longer in list, select the first one
        const currentActive = get().activeWorkspace;
        if (workspaces.length > 0) {
          if (!currentActive || !workspaces.some((w) => w._id === currentActive._id)) {
            get().selectWorkspace(workspaces[0]);
          }
        } else {
          set({ activeWorkspace: null, channels: [], activeChannel: null });
        }
      }
    } catch (err) {
      set({ isLoadingWorkspaces: false });
      console.error('Failed to fetch workspaces:', err);
    }
  },

  // Select a workspace and load its channels
  selectWorkspace: async (workspace) => {
    if (!workspace) return;
    set({ activeWorkspace: workspace, isLoadingChannels: true });

    try {
      const res = await api.get(`/api/channels/workspace/${workspace._id}`);
      if (res.data.success) {
        const channels = res.data.channels;
        const general = channels.find((c) => c.name === 'general') || channels[0] || null;
        set({
          channels,
          activeChannel: general,
          isLoadingChannels: false,
        });
      }
    } catch (err) {
      set({ isLoadingChannels: false });
      console.error('Failed to load channels:', err);
    }
  },

  // Select a specific channel
  selectChannel: (channel) => {
    set({ activeChannel: channel });
  },

  // Create workspace
  createWorkspace: async (name, description) => {
    try {
      const res = await api.post('/api/workspaces', { name, description });
      if (res.data.success) {
        toast.success(`Workspace "${name}" created! 🎉`);
        await get().fetchWorkspaces();
        // Select the newly created workspace
        const newWs = res.data.workspace;
        if (newWs) {
          get().selectWorkspace(newWs);
        }
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create workspace');
      return false;
    }
  },

  // Join workspace by invite code
  joinWorkspace: async (inviteCode) => {
    try {
      const res = await api.post('/api/workspaces/join', { inviteCode });
      if (res.data.success) {
        toast.success(res.data.message || 'Joined workspace successfully! 🚀');
        await get().fetchWorkspaces();
        if (res.data.workspace) {
          get().selectWorkspace(res.data.workspace);
        }
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join workspace');
      return false;
    }
  },

  // Create channel in active workspace
  createChannel: async (name, topic, type) => {
    const ws = get().activeWorkspace;
    if (!ws) return false;

    try {
      const res = await api.post('/api/channels', {
        workspaceId: ws._id,
        name,
        topic,
        type,
      });

      if (res.data.success) {
        const newChannel = res.data.channel;
        set((state) => ({
          channels: [...state.channels, newChannel],
          activeChannel: newChannel,
        }));
        toast.success(`Channel #${newChannel.name} created!`);
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create channel');
      return false;
    }
  },

  // Update channel notepad content locally & API
  updateChannelNotepad: async (channelId, content) => {
    set((state) => ({
      channels: state.channels.map((c) => (c._id === channelId ? { ...c, notepadContent: content } : c)),
      activeChannel: state.activeChannel?._id === channelId ? { ...state.activeChannel, notepadContent: content } : state.activeChannel,
    }));

    try {
      await api.put(`/api/channels/${channelId}/notepad`, { content });
    } catch (err) {
      console.error('Failed to sync notepad to server:', err);
    }
  },
}));
