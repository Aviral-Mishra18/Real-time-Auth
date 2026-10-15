import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // Modals
  isCreateWorkspaceOpen: false,
  isJoinWorkspaceOpen: false,
  isCreateChannelOpen: false,
  isInviteModalOpen: false,
  isUserSettingsOpen: false,
  isSearchOpen: false,
  lightboxMedia: null, // { url, name, type }

  // Mobile sidebar toggles
  isMobileSidebarOpen: false,
  isMembersPanelOpen: true,

  // Dedicated Thread Drawer state
  activeThreadMessage: null,

  // Theme
  theme: localStorage.getItem('syncspace_theme') || 'dark',

  // Actions
  setCreateWorkspaceOpen: (open) => set({ isCreateWorkspaceOpen: open }),
  setJoinWorkspaceOpen: (open) => set({ isJoinWorkspaceOpen: open }),
  setCreateChannelOpen: (open) => set({ isCreateChannelOpen: open }),
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),
  setUserSettingsOpen: (open) => set({ isUserSettingsOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setLightboxMedia: (media) => set({ lightboxMedia: media }),
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  setMembersPanelOpen: (open) => set({ isMembersPanelOpen: open }),
  openThread: (message) => set({ activeThreadMessage: message, isMembersPanelOpen: false }),
  closeThread: () => set({ activeThreadMessage: null }),
  updateActiveThreadMessage: (message) => set({ activeThreadMessage: message }),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('syncspace_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: next };
    }),
}));
