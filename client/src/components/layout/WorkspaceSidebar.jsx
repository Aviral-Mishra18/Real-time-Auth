import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChatStore } from '../../store/chatStore';
import { useUIStore } from '../../store/uiStore';
import { Plus, Compass, MessageSquare, Moon, Sun } from 'lucide-react';

export const WorkspaceSidebar = () => {
  const { workspaces, activeWorkspace, selectWorkspace } = useWorkspaceStore();
  const { activeDirectChat, clearDirectChat } = useChatStore();
  const { setCreateWorkspaceOpen, setJoinWorkspaceOpen, theme, toggleTheme } = useUIStore();

  const handleHomeClick = () => {
    // Clear active workspace / focus direct messages
    clearDirectChat();
  };

  return (
    <aside className="w-[72px] h-full bg-[#080B12] flex flex-col items-center py-3 select-none flex-shrink-0 border-r border-slate-800/60 z-30">
      {/* Brand / DMs Home Icon */}
      <div className="relative group mb-2">
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r transition-all duration-200 ${
            !activeWorkspace && activeDirectChat ? 'h-10' : 'h-0 group-hover:h-5'
          }`}
        />
        <button
          onClick={handleHomeClick}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:rounded-xl shadow-lg ${
            !activeWorkspace && activeDirectChat
              ? 'bg-indigo-600 text-white rounded-xl shadow-indigo-500/25'
              : 'bg-slate-800/80 text-indigo-400 hover:bg-indigo-600 hover:text-white'
          }`}
          title="Direct Messages"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-slate-800 rounded my-1" />

      {/* Workspaces List */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2 py-1 scrollbar-none">
        {workspaces.map((ws) => {
          const isActive = activeWorkspace?._id === ws._id && !activeDirectChat;
          const initials = ws.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div key={ws._id} className="relative group">
              {/* Active / Hover pill */}
              <div
                className={`absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 bg-white rounded-r transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-0 group-hover:h-5'
                }`}
              />
              <button
                onClick={() => {
                  clearDirectChat();
                  selectWorkspace(ws);
                }}
                className={`w-12 h-12 flex items-center justify-center font-bold text-sm tracking-wider transition-all duration-200 shadow-md ${
                  isActive
                    ? 'rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white ring-2 ring-indigo-400/40'
                    : 'rounded-2xl bg-slate-800 text-slate-300 hover:rounded-xl hover:bg-indigo-500/20 hover:text-white'
                }`}
                title={ws.name}
              >
                {ws.icon ? (
                  <img src={ws.icon} alt={ws.name} className="w-full h-full object-cover rounded-[inherit]" />
                ) : (
                  initials
                )}
              </button>
            </div>
          );
        })}

        {/* Add Workspace Button */}
        <button
          onClick={() => setCreateWorkspaceOpen(true)}
          className="w-12 h-12 rounded-2xl bg-slate-800/60 text-emerald-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-200 hover:rounded-xl group"
          title="Create a Workspace"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
        </button>

        {/* Join Workspace with Code */}
        <button
          onClick={() => setJoinWorkspaceOpen(true)}
          className="w-12 h-12 rounded-2xl bg-slate-800/60 text-amber-400 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-all duration-200 hover:rounded-xl"
          title="Join Workspace via Invite Code"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Theme Toggle */}
      <div className="pt-2">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
      </div>
    </aside>
  );
};
