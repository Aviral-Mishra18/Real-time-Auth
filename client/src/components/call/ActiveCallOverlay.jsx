import React, { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../../store/callStore';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import { Avatar } from '../common/Avatar';
import {
  Mic,
  MicOff,
  Headphones,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Users,
} from 'lucide-react';

export const ActiveCallOverlay = () => {
  const { user } = useAuthStore();
  const {
    activeCall,
    isCallModalOpen,
    isMinimized,
    localStream,
    screenStream,
    remoteStreams,
    isMuted,
    isDeafened,
    isVideoOn,
    isScreenSharing,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    endCall,
    setCallModalOpen,
    setIsMinimized,
  } = useCallStore();
  const { socket } = useSocket();

  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});

  // Attach local video track
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOn]);

  // Attach screen share track
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing]);

  if (!activeCall || !isCallModalOpen) return null;

  const isChannel = activeCall.type === 'channel';
  const callTitle = isChannel
    ? activeCall.channelName || 'Voice Lounge'
    : activeCall.targetUser?.name || '1-on-1 Call';

  // Remote participants list
  const remoteEntries = Object.entries(remoteStreams);

  // If minimized to Picture-in-Picture floating pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-6 z-50 animate-fade-in">
        <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 shadow-2xl rounded-2xl px-4 py-2.5">
          <div className="relative flex items-center justify-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
              {callTitle}
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">Connected</div>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => toggleMute(socket)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                isMuted ? 'text-rose-400 bg-rose-500/20' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors"
              title="Expand"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => endCall(socket)}
              className="p-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/20 transition-colors"
              title="End Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0A0E1A] border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Hidden audio tags for remote audio streams */}
        {remoteEntries.map(([id, item]) => {
          const stream = item.stream || item;
          return (
            <audio
              key={id}
              autoPlay
              muted={isDeafened}
              ref={(el) => {
                if (el && el.srcObject !== stream) {
                  el.srcObject = stream;
                }
              }}
            />
          );
        })}

        {/* Top Header */}
        <div className="h-14 px-6 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {isChannel ? <Users className="w-4 h-4 text-indigo-400" /> : <Video className="w-4 h-4 text-indigo-400" />}
                {callTitle}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeCall.status === 'calling' ? 'Calling...' : 'WebRTC Encrypted Connection • Low Latency'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Minimize to Picture-in-Picture"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCallModalOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close View"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video & Stage Area */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center bg-radial-gradient">
          {/* If screen sharing is active */}
          {isScreenSharing && (
            <div className="w-full h-full max-h-[55vh] mb-3 relative bg-black/90 rounded-2xl overflow-hidden border border-indigo-500/30 flex items-center justify-center">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                You are sharing your screen
              </div>
            </div>
          )}

          {/* Participants Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full h-full max-h-[60vh] items-center justify-center">
            {/* Self Card */}
            <div className="relative w-full h-full min-h-[180px] bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center group shadow-lg">
              {isVideoOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-1 rounded-full transition-all ${!isMuted ? 'ring-4 ring-emerald-500/40' : ''}`}>
                    <Avatar src={user?.avatar} name={user?.name || 'You'} size="xl" />
                  </div>
                </div>
              )}

              {/* Tag */}
              <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>{user?.name} (You)</span>
                {isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                {isDeafened && <VolumeX className="w-3 h-3 text-rose-400" />}
              </div>
            </div>

            {/* Direct Call Peer OR Channel Peers */}
            {!isChannel && activeCall.targetUser && (
              <div className="relative w-full h-full min-h-[180px] bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center group shadow-lg">
                {remoteStreams[activeCall.targetUser._id] &&
                remoteStreams[activeCall.targetUser._id].getVideoTracks?.()?.length > 0 ? (
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && remoteStreams[activeCall.targetUser._id]) {
                        el.srcObject = remoteStreams[activeCall.targetUser._id];
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-1 rounded-full ring-4 ring-indigo-500/30">
                      <Avatar
                        src={activeCall.targetUser.avatar}
                        name={activeCall.targetUser.name}
                        size="xl"
                      />
                    </div>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>{activeCall.targetUser.name}</span>
                </div>
              </div>
            )}

            {/* Channel Voice Peers */}
            {isChannel &&
              remoteEntries.map(([socketId, item]) => {
                const remoteUser = item.user || {};
                const stream = item.stream;
                const hasVideo = stream && stream.getVideoTracks?.()?.length > 0;

                return (
                  <div
                    key={socketId}
                    className="relative w-full h-full min-h-[180px] bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center group shadow-lg"
                  >
                    {hasVideo ? (
                      <video
                        autoPlay
                        playsInline
                        ref={(el) => {
                          if (el && el.srcObject !== stream) {
                            el.srcObject = stream;
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`p-1 rounded-full transition-all ${
                            !item.state?.isMuted ? 'ring-4 ring-emerald-500/40' : ''
                          }`}
                        >
                          <Avatar
                            src={remoteUser.avatar}
                            name={remoteUser.name || 'Member'}
                            size="xl"
                          />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>{remoteUser.name || 'Member'}</span>
                      {item.state?.isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                      {item.state?.isDeafened && <VolumeX className="w-3 h-3 text-rose-400" />}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Bottom Control Bar Dock */}
        <div className="h-20 px-6 border-t border-slate-800/80 flex items-center justify-center gap-3 bg-slate-900/90 backdrop-blur-md flex-shrink-0">
          {/* Mute */}
          <button
            onClick={() => toggleMute(socket)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Deafen */}
          <button
            onClick={() => toggleDeafen(socket)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md ${
              isDeafened
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isDeafened ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            <span>{isDeafened ? 'Undeafen' : 'Deafen'}</span>
          </button>

          {/* Video Camera */}
          <button
            onClick={() => toggleVideo(socket)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md ${
              isVideoOn
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            <span>{isVideoOn ? 'Stop Camera' : 'Start Camera'}</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={() => toggleScreenShare(socket)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md ${
              isScreenSharing
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
          </button>

          {/* End Call / Leave Voice */}
          <button
            onClick={() => endCall(socket)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/30"
          >
            <PhoneOff className="w-4 h-4" />
            <span>{isChannel ? 'Disconnect' : 'End Call'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
