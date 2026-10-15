import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Avatar } from '../common/Avatar';
import { Crown, Shield, MessageSquare, X } from 'lucide-react';

export const MembersSidebar = () => {
  const { user: currentUser } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const { onlineUserIds, openDirectChatWithUser } = useChatStore();
  const { isMembersPanelOpen, setMembersPanelOpen } = useUIStore();

  if (!isMembersPanelOpen || !activeWorkspace) return null;

  const members = activeWorkspace.members || [];

  // Split into Online and Offline
  const onlineMembers = members.filter((m) => onlineUserIds.includes(m.user?._id));
  const offlineMembers = members.filter((m) => !onlineUserIds.includes(m.user?._id));

  const renderMember = (memberRecord) => {
    const memUser = memberRecord.user;
    if (!memUser) return null;

    const isSelf = memUser._id === currentUser?._id;
    const isOnline = onlineUserIds.includes(memUser._id);

    return (
      <div
        key={memUser._id}
        className="group flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            src={memUser.avatar}
            name={memUser.name}
            size="sm"
            status={isOnline ? 'online' : 'offline'}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 truncate">
              <span className="truncate">{memUser.name}</span>
              {memberRecord.role === 'owner' && (
                <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" title="Workspace Owner" />
              )}
              {memberRecord.role === 'admin' && (
                <Shield className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" title="Admin" />
              )}
            </div>
            {memUser.customStatus && (
              <div className="text-[10px] text-slate-400 truncate">{memUser.customStatus}</div>
            )}
          </div>
        </div>

        {/* Start Direct Message Button */}
        {!isSelf && (
          <button
            onClick={() => openDirectChatWithUser(memUser._id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
            title={`Message ${memUser.name}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <aside className="w-60 h-full bg-[#101626] flex flex-col flex-shrink-0 border-l border-slate-800/80 select-none">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-800">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Members — {members.length}
        </span>
        <button
          onClick={() => setMembersPanelOpen(false)}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Online Section */}
        <div>
          <div className="px-2 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online — {onlineMembers.length}
          </div>
          <div className="space-y-0.5">{onlineMembers.map(renderMember)}</div>
        </div>

        {/* Offline Section */}
        {offlineMembers.length > 0 && (
          <div>
            <div className="px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Offline — {offlineMembers.length}
            </div>
            <div className="space-y-0.5 opacity-75">{offlineMembers.map(renderMember)}</div>
          </div>
        )}
      </div>
    </aside>
  );
};
