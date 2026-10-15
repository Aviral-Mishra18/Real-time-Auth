import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChatStore } from '../../store/chatStore';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';
import { MessageInput } from './MessageInput';
import { CollaborativeNotepad } from '../collaboration/CollaborativeNotepad';
import { PinnedMessagesModal } from './PinnedMessagesModal';
import { MessageSquare } from 'lucide-react';

export const ChatArea = () => {
  const { activeWorkspace, activeChannel } = useWorkspaceStore();
  const { activeDirectChat, activeTab } = useChatStore();

  const hasSelection = activeChannel || activeDirectChat;

  if (!hasSelection) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-[#0B0F19] text-center p-8 select-none">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-2xl">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Welcome to SyncSpace</h2>
        <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
          Select a channel from the left sidebar or start a direct conversation with your team members to begin collaborating in real-time.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full bg-[#0B0F19] min-w-0 relative">
      <ChatHeader />

      {activeTab === 'notepad' && activeChannel ? (
        <CollaborativeNotepad />
      ) : activeTab === 'pinned' ? (
        <PinnedMessagesModal />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <MessageList />
          <TypingIndicator />
          <MessageInput />
        </div>
      )}
    </main>
  );
};
