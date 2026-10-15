import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useCallStore } from '../../store/callStore';
import { useSocket } from '../../hooks/useSocket';
import { VoiceConnectedBar } from '../call/VoiceConnectedBar';
import { Avatar } from '../common/Avatar';
import { Settings, Mic, MicOff, Headphones, VolumeX } from 'lucide-react';

export const UserProfileTray = () => {
  const { user } = useAuthStore();
  const { setUserSettingsOpen } = useUIStore();
  const { isMuted, isDeafened, toggleMute, toggleDeafen } = useCallStore();
  const { socket } = useSocket();

  if (!user) return null;

  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Discord-style Voice Connection Bar if active in call */}
      <VoiceConnectedBar />

      <div className="h-14 bg-[#0F1422] px-2.5 flex items-center justify-between border-t border-slate-800/80">
        {/* User Avatar & Status */}
        <div
          onClick={() => setUserSettingsOpen(true)}
          className="flex items-center gap-2.5 min-w-0 p-1 -ml-1 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-colors group flex-1"
          title="Edit Profile & Settings"
        >
          <Avatar src={user.avatar} name={user.name} size="sm" status={user.status || 'online'} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 truncate flex items-center gap-1">
              {user.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {user.customStatus || `#${user._id.slice(-4)}`}
            </div>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="flex items-center gap-0.5 text-slate-400">
          <button
            onClick={() => toggleMute(socket)}
            className={`p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors ${
              isMuted ? 'text-rose-400 bg-rose-500/10' : ''
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => toggleDeafen(socket)}
            className={`p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors ${
              isDeafened ? 'text-rose-400 bg-rose-500/10' : ''
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setUserSettingsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
