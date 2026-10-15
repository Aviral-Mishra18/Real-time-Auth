import React, { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useChatStore } from '../store/chatStore';
import { useUIStore } from '../store/uiStore';
import { useSocket } from '../hooks/useSocket';

import { WorkspaceSidebar } from '../components/layout/WorkspaceSidebar';
import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { MembersSidebar } from '../components/layout/MembersSidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { ThreadDrawer } from '../components/chat/ThreadDrawer';

import { CreateWorkspaceModal } from '../components/modals/CreateWorkspaceModal';
import { JoinWorkspaceModal } from '../components/modals/JoinWorkspaceModal';
import { CreateChannelModal } from '../components/modals/CreateChannelModal';
import { InviteMembersModal } from '../components/modals/InviteMembersModal';
import { UserSettingsModal } from '../components/modals/UserSettingsModal';
import { MediaLightbox } from '../components/modals/MediaLightbox';
import { IncomingCallDialog } from '../components/call/IncomingCallDialog';
import { ActiveCallOverlay } from '../components/call/ActiveCallOverlay';

export const DashboardPage = () => {
  // Activate socket connection
  useSocket();

  const { fetchWorkspaces } = useWorkspaceStore();
  const { fetchDirectChats, fetchMessages } = useChatStore();
  const { activeWorkspace, activeChannel } = useWorkspaceStore();
  const { activeDirectChat } = useChatStore();
  const { isMobileSidebarOpen, setMobileSidebarOpen, activeThreadMessage } = useUIStore();

  useEffect(() => {
    fetchWorkspaces();
    fetchDirectChats();
  }, []);

  // Fetch messages whenever active channel or DM changes
  useEffect(() => {
    if (activeChannel) {
      fetchMessages({ channelId: activeChannel._id });
    }
  }, [activeChannel?._id]);

  useEffect(() => {
    if (activeDirectChat) {
      fetchMessages({ directChatId: activeDirectChat._id });
    }
  }, [activeDirectChat?._id]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F19] select-none">
      {/* 1. Left Workspace Server Rail */}
      <WorkspaceSidebar />

      {/* 2. Channel Sidebar (Desktop & Mobile Drawer) */}
      <div className="hidden md:flex h-full">
        <ChannelSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-50 flex h-full">
            <ChannelSidebar />
          </div>
        </div>
      )}

      {/* 3. Main Chat & Collaboration Center Area */}
      <ChatArea />

      {/* 4. Right Panel: Thread Drawer or Members Sidebar */}
      {activeThreadMessage ? (
        <ThreadDrawer />
      ) : (
        <div className="hidden lg:flex h-full">
          <MembersSidebar />
        </div>
      )}

      {/* Global Modals & Call Dialogs */}
      <CreateWorkspaceModal />
      <JoinWorkspaceModal />
      <CreateChannelModal />
      <InviteMembersModal />
      <UserSettingsModal />
      <MediaLightbox />
      <IncomingCallDialog />
      <ActiveCallOverlay />
    </div>
  );
};
