import React from 'react';
import { useCallStore } from '../../store/callStore';
import { useSocket } from '../../hooks/useSocket';
import {
  Wifi,
  PhoneOff,
  Mic,
  MicOff,
  Headphones,
  Monitor,
  MonitorOff,
  Maximize2,
} from 'lucide-react';

export const VoiceConnectedBar = () => {
  const {
    activeCall,
    isMuted,
    isDeafened,
    isScreenSharing,
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
    endCall,
    setCallModalOpen,
  } = useCallStore();
  const { socket } = useSocket();

  if (!activeCall) return null;

  const isChannel = activeCall.type === 'channel';
  const title = isChannel
    ? activeCall.channelName || 'Voice Lounge'
    : activeCall.targetUser?.name || '1-on-1 Call';

  return (
    <div className="bg-[#0B0F19] border-t border-slate-800/80 px-3 py-2 flex flex-col gap-1.5 transition-all">
      {/* Status & Name */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => setCallModalOpen(true)}
          className="flex items-center gap-2 cursor-pointer group min-w-0"
          title="Open Video & Call Screen"
        >
          <div className="flex items-center gap-1 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Wifi className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-emerald-400 leading-none flex items-center gap-1 group-hover:underline">
              Voice Connected
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">
              {isChannel ? `#${title}` : title}
            </div>
          </div>
        </div>

        {/* Quick Disconnect Button */}
        <button
          onClick={() => endCall(socket)}
          className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
          title="Disconnect Call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Action Dock */}
      <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800/50 text-slate-400">
        <button
          onClick={() => toggleMute(socket)}
          className={`flex items-center justify-center p-1.5 rounded-lg text-xs transition-colors ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400'
              : 'hover:bg-slate-800 hover:text-slate-200'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => toggleDeafen(socket)}
          className={`flex items-center justify-center p-1.5 rounded-lg text-xs transition-colors ${
            isDeafened
              ? 'bg-rose-500/20 text-rose-400'
              : 'hover:bg-slate-800 hover:text-slate-200'
          }`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          <Headphones className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => toggleScreenShare(socket)}
          className={`flex items-center justify-center p-1.5 rounded-lg text-xs transition-colors ${
            isScreenSharing
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'hover:bg-slate-800 hover:text-slate-200'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-3.5 h-3.5" />
          ) : (
            <Monitor className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          onClick={() => setCallModalOpen(true)}
          className="flex items-center justify-center p-1.5 rounded-lg text-xs hover:bg-slate-800 hover:text-slate-200 transition-colors"
          title="Expand View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
