import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useCallStore } from '../../store/callStore';
import { useSocket } from '../../hooks/useSocket';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Avatar } from '../common/Avatar';
import {
  Hash,
  Lock,
  Pin,
  FileText,
  MessageSquare,
  Users,
  Search,
  Menu,
  Phone,
  Video,
  Volume2,
  Sparkles,
  Loader2,
} from 'lucide-react';

export const ChatHeader = () => {
  const { user } = useAuthStore();
  const { activeWorkspace, activeChannel } = useWorkspaceStore();
  const { activeDirectChat, activeTab, setActiveTab, onlineUserIds } = useChatStore();
  const { isMembersPanelOpen, setMembersPanelOpen, setMobileSidebarOpen } = useUIStore();
  const { activeCall, startDirectCall, joinVoiceChannel, setCallModalOpen } = useCallStore();
  const { socket } = useSocket();

  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleSummarize = async () => {
    if (!activeChannel || isSummarizing) return;
    setIsSummarizing(true);
    toast.loading('✨ SyncAI is analyzing and summarizing channel chat...', { id: 'ai-summary' });
    try {
      const res = await api.post(`/api/ai/summarize/${activeChannel._id}`);
      if (res.data.success) {
        toast.success('✨ Channel summary posted to chat!', { id: 'ai-summary' });
      }
    } catch (err) {
      toast.error('Failed to generate AI summary', { id: 'ai-summary' });
    } finally {
      setIsSummarizing(false);
    }
  };

  const otherUser = activeDirectChat
    ? activeDirectChat.participants.find((p) => p._id !== user?._id) || activeDirectChat.participants[0]
    : null;
  const isRecipientOnline = otherUser && onlineUserIds.includes(otherUser._id);

  return (
    <header className="h-14 px-4 bg-[#0E1320] border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 z-20">
      {/* Left: Mobile Menu & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {activeDirectChat && otherUser ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={otherUser.avatar}
              name={otherUser.name}
              size="sm"
              status={isRecipientOnline ? 'online' : 'offline'}
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-100 truncate">{otherUser.name}</div>
              <div className="text-[11px] text-slate-400 truncate">
                {isRecipientOnline ? (
                  <span className="text-emerald-400">Online</span>
                ) : (
                  'Offline'
                )}
                {otherUser.customStatus && ` • ${otherUser.customStatus}`}
              </div>
            </div>
          </div>
        ) : activeChannel ? (
          <div className="flex items-center gap-2 min-w-0">
            {activeChannel.type === 'voice' ? (
              <Volume2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : activeChannel.type === 'private' ? (
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            ) : (
              <Hash className="w-5 h-5 text-slate-400 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-100 truncate flex items-center gap-2">
                <span>{activeChannel.name}</span>
                {activeChannel.type === 'voice' && (
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                    Voice Channel
                  </span>
                )}
              </div>
              {activeChannel.topic && (
                <div className="text-[11px] text-slate-400 truncate max-w-md hidden sm:block">
                  {activeChannel.topic}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm font-semibold text-slate-400">Select a channel or conversation</div>
        )}
      </div>

      {/* Right: Tabs & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Direct Call Controls (in DMs) */}
        {activeDirectChat && otherUser && (
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 mr-1">
            <button
              onClick={() => startDirectCall(otherUser, 'audio', socket)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-emerald-600/30 transition-colors"
              title="Start Voice Call"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={() => startDirectCall(otherUser, 'video', socket)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-indigo-600/30 transition-colors"
              title="Start Video Call"
            >
              <Video className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
        )}

        {/* Voice Channel Join Button */}
        {activeChannel && activeChannel.type === 'voice' && (
          <button
            onClick={() => {
              if (activeCall?.type === 'channel' && activeCall?.channelId === activeChannel._id) {
                setCallModalOpen(true);
              } else {
                joinVoiceChannel(activeChannel, socket);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              activeCall?.type === 'channel' && activeCall?.channelId === activeChannel._id
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>
              {activeCall?.type === 'channel' && activeCall?.channelId === activeChannel._id
                ? 'Connected (View Call)'
                : 'Join Voice'}
            </span>
          </button>
        )}

        {/* Tab switcher: Chat vs Collaborative Notepad (for text channels) */}
        {activeChannel && activeChannel.type !== 'voice' && (
          <div className="flex items-center gap-2">
            {/* 1-Click AI Summary Button */}
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-pink-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white hover:border-indigo-400 hover:from-indigo-600/50 hover:to-pink-600/50 transition-all shadow-sm"
              title="Instant TL;DR summary of recent channel discussion"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>{isSummarizing ? 'Summarizing...' : 'AI Summary'}</span>
            </button>

            <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'chat'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => setActiveTab('notepad')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'notepad'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Live Notes</span>
              </button>
            </div>
          </div>
        )}

        {/* Pinned Messages Tab */}
        <button
          onClick={() => setActiveTab(activeTab === 'pinned' ? 'chat' : 'pinned')}
          className={`p-2 rounded-xl transition-colors ${
            activeTab === 'pinned'
              ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Pinned Messages"
        >
          <Pin className="w-4 h-4" />
        </button>

        {/* Members Sidebar Toggle (workspace mode) */}
        {activeWorkspace && !activeDirectChat && (
          <button
            onClick={() => setMembersPanelOpen(!isMembersPanelOpen)}
            className={`p-2 rounded-xl transition-colors ${
              isMembersPanelOpen
                ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="Toggle Member List"
          >
            <Users className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
