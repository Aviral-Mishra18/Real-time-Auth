import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useCallStore } from '../../store/callStore';
import { useSocket } from '../../hooks/useSocket';
import { UserProfileTray } from './UserProfileTray';
import { Avatar } from '../common/Avatar';
import {
  Hash,
  Lock,
  Plus,
  ChevronDown,
  UserPlus,
  Settings,
  LogOut,
  MessageSquare,
  FileText,
  Volume2,
  MicOff,
  VolumeX,
} from 'lucide-react';

export const ChannelSidebar = () => {
  const { user } = useAuthStore();
  const { workspaces, activeWorkspace, channels, activeChannel, selectChannel } = useWorkspaceStore();
  const { directChats, activeDirectChat, selectDirectChat, onlineUserIds } = useChatStore();
  const { setCreateChannelOpen, setInviteModalOpen, setMobileSidebarOpen } = useUIStore();
  const { activeCall, joinVoiceChannel, channelVoiceStates, setCallModalOpen } = useCallStore();
  const { socket } = useSocket();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // If in Workspace mode
  if (activeWorkspace && !activeDirectChat) {
    const publicChannels = channels.filter((c) => c.type === 'public');
    const privateChannels = channels.filter((c) => c.type === 'private');
    const voiceChannels = channels.filter((c) => c.type === 'voice');

    return (
      <nav aria-label="Channels" className="w-60 h-full bg-[#101626] flex flex-col flex-shrink-0 border-r border-slate-800/80 select-none">
        {/* Workspace Title & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full h-12 px-4 flex items-center justify-between font-bold text-slate-100 hover:bg-slate-800/50 border-b border-slate-800 transition-colors"
          >
            <span className="truncate">{activeWorkspace.name}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Workspace Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute top-13 left-2 right-2 z-50 glass-dropdown rounded-xl p-1.5 shadow-2xl border border-slate-700/80 animate-fade-in text-xs font-medium text-slate-300">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setInviteModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite People (Code: {activeWorkspace.inviteCode})
                </button>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setCreateChannelOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Channel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Public Channels */}
          <div>
            <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Text Channels</span>
              <button
                onClick={() => setCreateChannelOpen(true)}
                className="hover:text-white p-0.5 rounded transition-colors"
                title="Create Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              {publicChannels.map((channel) => {
                const isActive = activeChannel?._id === channel._id;
                return (
                  <button
                    key={channel._id}
                    onClick={() => {
                      selectChannel(channel);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all group ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500 rounded-l-none'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Hash className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                    <span className="truncate flex-1 text-left">{channel.name}</span>
                    {channel.notepadContent && (
                      <span title="Contains collaborative notes">
                        <FileText className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Private Channels */}
          {privateChannels.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>Private Channels</span>
              </div>
              <div className="space-y-0.5">
                {privateChannels.map((channel) => {
                  const isActive = activeChannel?._id === channel._id;
                  return (
                    <button
                      key={channel._id}
                      onClick={() => {
                        selectChannel(channel);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all group ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500 rounded-l-none'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Lock className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                      <span className="truncate flex-1 text-left">{channel.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voice Channels (Discord-style) */}
          <div>
            <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Voice Channels</span>
              <button
                onClick={() => setCreateChannelOpen(true)}
                className="hover:text-white p-0.5 rounded transition-colors"
                title="Create Voice Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {voiceChannels.length === 0 ? (
                <div className="px-2.5 py-1 text-[11px] text-slate-500 italic">
                  No voice channels yet
                </div>
              ) : (
                voiceChannels.map((channel) => {
                  const isConnectedHere =
                    activeCall?.type === 'channel' && activeCall?.channelId === channel._id;
                  const connectedMembers = channelVoiceStates[channel._id] || [];

                  return (
                    <div key={channel._id} className="space-y-0.5">
                      <button
                        onClick={() => {
                          if (isConnectedHere) {
                            setCallModalOpen(true);
                          } else {
                            joinVoiceChannel(channel, socket);
                          }
                          selectChannel(channel);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all group ${
                          isConnectedHere
                            ? 'bg-emerald-600/20 text-emerald-300 font-semibold border-l-2 border-emerald-500 rounded-l-none'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <Volume2
                          className={`w-4 h-4 ${
                            isConnectedHere
                              ? 'text-emerald-400 animate-pulse'
                              : 'text-slate-500 group-hover:text-slate-400'
                          }`}
                        />
                        <span className="truncate flex-1 text-left">{channel.name}</span>
                        {isConnectedHere ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                            Connected
                          </span>
                        ) : connectedMembers.length > 0 ? (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">
                            {connectedMembers.length}
                          </span>
                        ) : null}
                      </button>

                      {/* Members actively in this voice room */}
                      {connectedMembers.length > 0 && (
                        <div className="pl-6 pr-2 py-0.5 space-y-1">
                          {connectedMembers.map((m) => (
                            <div
                              key={m.socketId || m.userId}
                              className="flex items-center gap-2 py-0.5 text-xs text-slate-300"
                            >
                              <img
                                src={m.avatar}
                                alt=""
                                className="w-4 h-4 rounded-full border border-slate-700"
                              />
                              <span className="truncate flex-1 text-[11px] text-slate-300">
                                {m.name}
                              </span>
                              {m.isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                              {m.isDeafened && <VolumeX className="w-3 h-3 text-rose-400" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* User Profile Tray at Bottom */}
        <UserProfileTray />
      </nav>
    );
  }

  // Direct Messages Mode
  return (
    <nav aria-label="Direct Messages" className="w-60 h-full bg-[#101626] flex flex-col flex-shrink-0 border-r border-slate-800/80 select-none">
      <div className="h-12 px-4 flex items-center justify-between font-bold text-slate-100 border-b border-slate-800">
        <span className="flex items-center gap-2 text-sm font-bold">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          Direct Messages
        </span>
      </div>

      {/* DMs List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {directChats.length === 0 ? (
          <div className="text-center px-4 py-8 text-slate-500 text-xs">
            No direct conversations yet. Click a user in workspace members to start a chat!
          </div>
        ) : (
          directChats.map((chat) => {
            const otherUser = chat.participants.find((p) => p._id !== user._id) || chat.participants[0];
            const isOnline = otherUser && onlineUserIds.includes(otherUser._id);
            const isActive = activeDirectChat?._id === chat._id;

            return (
              <button
                key={chat._id}
                onClick={() => {
                  selectDirectChat(chat);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500 rounded-l-none'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Avatar
                  src={otherUser?.avatar}
                  name={otherUser?.name}
                  size="sm"
                  status={isOnline ? 'online' : otherUser?.status || 'offline'}
                />
                <div className="min-w-0 flex-1 text-left">
                  <div className="font-semibold truncate">{otherUser?.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {chat.lastMessage?.content || otherUser?.customStatus || 'Active now'}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <UserProfileTray />
    </nav>
  );
};
