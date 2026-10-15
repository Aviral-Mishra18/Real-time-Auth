import React from 'react';
import { useCallStore } from '../../store/callStore';
import { useSocket } from '../../hooks/useSocket';
import { Avatar } from '../common/Avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';

export const IncomingCallDialog = () => {
  const { incomingCall, acceptDirectCall, rejectDirectCall } = useCallStore();
  const { socket } = useSocket();

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-indigo-500/50 shadow-2xl shadow-indigo-950/60 rounded-3xl p-5 w-80 text-center overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-600/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-600/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col items-center">
          {/* Avatar with pulsing rings */}
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-indigo-500/30 animate-ping" />
            <div className="absolute w-16 h-16 rounded-full bg-indigo-500/40 animate-pulse" />
            <Avatar
              src={incomingCall.caller?.avatar}
              name={incomingCall.caller?.name || 'User'}
              size="lg"
            />
          </div>

          {/* Caller Details */}
          <h4 className="text-base font-bold text-slate-100 truncate max-w-full">
            {incomingCall.caller?.name || 'Unknown Caller'}
          </h4>
          <p className="text-xs text-indigo-400 font-medium mb-5 flex items-center justify-center gap-1.5">
            {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            Incoming {isVideo ? 'Video' : 'Voice'} Call...
          </p>

          {/* Actions */}
          <div className="flex items-center justify-center gap-6 w-full">
            {/* Decline */}
            <button
              onClick={() => rejectDirectCall(socket)}
              className="flex flex-col items-center gap-1 group"
              title="Decline"
            >
              <div className="w-12 h-12 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-transform group-hover:scale-110">
                <PhoneOff className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-rose-400">
                Decline
              </span>
            </button>

            {/* Accept */}
            <button
              onClick={() => acceptDirectCall(socket)}
              className="flex flex-col items-center gap-1 group"
              title="Accept"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition-transform group-hover:scale-110 animate-bounce">
                {isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              </div>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-emerald-400">
                Accept
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
