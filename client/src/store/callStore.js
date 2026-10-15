import { create } from 'zustand';
import { sound } from '../utils/sound';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useCallStore = create((set, get) => ({
  // Active call state
  activeCall: null, // { type: 'direct' | 'channel', targetUser, channelId, channelName, callType: 'audio' | 'video', status: 'calling' | 'connected' }
  incomingCall: null, // { caller: { _id, name, avatar }, callType: 'audio' | 'video', signalData }
  
  // Media streams
  localStream: null,
  screenStream: null,
  remoteStreams: {}, // direct: { [userId]: MediaStream }, voice: { [socketId]: { stream, user, state } }
  
  // Audio / Video control flags
  isMuted: false,
  isDeafened: false,
  isVideoOn: false,
  isScreenSharing: false,
  
  // UI Display
  isCallModalOpen: false,
  isMinimized: false,
  
  // Workspace voice channels presence: { [channelId]: Array<{ socketId, userId, name, avatar, isMuted, isDeafened, isVideoOn, isScreenSharing }> }
  channelVoiceStates: {},

  // Set workspace voice channel presence list
  setChannelVoiceStates: (states) => set({ channelVoiceStates: states || {} }),

  // Set incoming call
  setIncomingCall: (incoming) => {
    if (incoming) {
      sound.startRingtone();
    } else {
      sound.stopRingtone();
    }
    set({ incomingCall: incoming });
  },

  setCallModalOpen: (isOpen) => set({ isCallModalOpen: isOpen }),
  setIsMinimized: (isMinimized) => set({ isMinimized }),

  // ==========================================
  // Direct 1-on-1 WebRTC Calling
  // ==========================================
  startDirectCall: async (targetUser, callType = 'audio', socket) => {
    if (!socket || !targetUser) return;
    try {
      sound.playPing();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video' ? { width: 1280, height: 720 } : false,
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);
      window.__directPeerConnection = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set((state) => ({
            remoteStreams: {
              ...state.remoteStreams,
              [targetUser._id]: event.streams[0],
            },
          }));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call:ice_candidate', {
            targetUserId: targetUser._id,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call:initiate', {
        targetUserId: targetUser._id,
        callType,
        signalData: offer,
      });

      set({
        localStream: stream,
        activeCall: {
          type: 'direct',
          targetUser,
          callType,
          status: 'calling',
        },
        isMuted: false,
        isDeafened: false,
        isVideoOn: callType === 'video',
        isScreenSharing: false,
        isCallModalOpen: true,
        isMinimized: false,
      });
    } catch (err) {
      console.error('Failed to start call:', err);
      toast.error('Could not access microphone/camera');
    }
  },

  acceptDirectCall: async (socket) => {
    const { incomingCall } = get();
    if (!incomingCall || !socket) return;
    sound.stopRingtone();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'video' ? { width: 1280, height: 720 } : false,
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);
      window.__directPeerConnection = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set((state) => ({
            remoteStreams: {
              ...state.remoteStreams,
              [incomingCall.caller._id]: event.streams[0],
            },
          }));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call:ice_candidate', {
            targetUserId: incomingCall.caller._id,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', {
        targetUserId: incomingCall.caller._id,
        signalData: answer,
      });

      set({
        localStream: stream,
        activeCall: {
          type: 'direct',
          targetUser: incomingCall.caller,
          callType: incomingCall.callType,
          status: 'connected',
        },
        incomingCall: null,
        isMuted: false,
        isDeafened: false,
        isVideoOn: incomingCall.callType === 'video',
        isScreenSharing: false,
        isCallModalOpen: true,
        isMinimized: false,
      });
    } catch (err) {
      console.error('Failed to accept call:', err);
      toast.error('Could not access microphone/camera');
    }
  },

  handleDirectCallAnswered: async (signalData) => {
    const pc = window.__directPeerConnection;
    if (pc && signalData) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        set((state) => ({
          activeCall: state.activeCall ? { ...state.activeCall, status: 'connected' } : null,
        }));
      } catch (err) {
        console.error('Error setting remote description on answer:', err);
      }
    }
  },

  handleDirectIceCandidate: async (candidate) => {
    const pc = window.__directPeerConnection;
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  },

  rejectDirectCall: (socket) => {
    const { incomingCall } = get();
    sound.stopRingtone();
    if (incomingCall && socket) {
      socket.emit('call:reject', { targetUserId: incomingCall.caller._id });
    }
    set({ incomingCall: null });
  },

  endCall: (socket) => {
    sound.stopRingtone();
    sound.playCallEnd();

    const { activeCall, localStream, screenStream } = get();

    if (activeCall && socket) {
      if (activeCall.type === 'direct' && activeCall.targetUser) {
        socket.emit('call:end', { targetUserId: activeCall.targetUser._id });
      } else if (activeCall.type === 'channel') {
        socket.emit('voice:leave');
      }
    }

    // Stop all local media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    // Close direct connection
    if (window.__directPeerConnection) {
      window.__directPeerConnection.close();
      window.__directPeerConnection = null;
    }

    // Close voice room peer connections
    if (window.__voicePeerConnections) {
      Object.values(window.__voicePeerConnections).forEach((pc) => pc.close());
      window.__voicePeerConnections = {};
    }

    set({
      activeCall: null,
      incomingCall: null,
      localStream: null,
      screenStream: null,
      remoteStreams: {},
      isCallModalOpen: false,
      isMinimized: false,
      isMuted: false,
      isDeafened: false,
      isVideoOn: false,
      isScreenSharing: false,
    });
  },

  // ==========================================
  // Discord-style Voice Channels (Multi-user)
  // ==========================================
  joinVoiceChannel: async (channel, socket) => {
    if (!channel || !socket) return;
    const { activeCall, endCall } = get();

    // If already in a call or different voice channel, leave first
    if (activeCall) {
      endCall(socket);
    }

    try {
      sound.playVoiceJoin();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      window.__voicePeerConnections = {};

      set({
        localStream: stream,
        activeCall: {
          type: 'channel',
          channelId: channel._id,
          channelName: channel.name,
          status: 'connected',
          callType: 'audio',
        },
        remoteStreams: {},
        isMuted: false,
        isDeafened: false,
        isVideoOn: false,
        isScreenSharing: false,
        isCallModalOpen: true,
        isMinimized: false,
      });

      socket.emit('voice:join', { channelId: channel._id });
    } catch (err) {
      console.error('Failed to join voice channel:', err);
      toast.error('Could not access microphone');
    }
  },

  // When joining, connect to existing participants
  handleVoiceRoomUsers: async (users, socket) => {
    const { localStream, activeCall } = get();
    if (!localStream || !activeCall) return;

    for (const remoteUser of users) {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      window.__voicePeerConnections[remoteUser.socketId] = pc;

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set((state) => ({
            remoteStreams: {
              ...state.remoteStreams,
              [remoteUser.socketId]: {
                stream: event.streams[0],
                user: remoteUser,
                state: remoteUser,
              },
            },
          }));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice:signal', {
            toSocketId: remoteUser.socketId,
            signal: { candidate: event.candidate },
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('voice:signal', {
        toSocketId: remoteUser.socketId,
        signal: { sdp: offer },
      });
    }
  },

  // Handle incoming signaling from peers in the voice channel
  handleVoiceSignal: async ({ fromSocketId, fromUser, signal }, socket) => {
    const { localStream } = get();
    let pc = window.__voicePeerConnections?.[fromSocketId];

    if (!pc) {
      pc = new RTCPeerConnection(ICE_SERVERS);
      window.__voicePeerConnections = window.__voicePeerConnections || {};
      window.__voicePeerConnections[fromSocketId] = pc;

      if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set((state) => ({
            remoteStreams: {
              ...state.remoteStreams,
              [fromSocketId]: {
                stream: event.streams[0],
                user: fromUser,
                state: fromUser,
              },
            },
          }));
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice:signal', {
            toSocketId: fromSocketId,
            signal: { candidate: event.candidate },
          });
        }
      };
    }

    if (signal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      if (signal.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:signal', {
          toSocketId: fromSocketId,
          signal: { sdp: answer },
        });
      }
    } else if (signal.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (err) {
        console.error('Error adding voice ICE candidate:', err);
      }
    }
  },

  handleVoiceUserLeft: (socketId) => {
    if (window.__voicePeerConnections?.[socketId]) {
      window.__voicePeerConnections[socketId].close();
      delete window.__voicePeerConnections[socketId];
    }
    set((state) => {
      const copy = { ...state.remoteStreams };
      delete copy[socketId];
      return { remoteStreams: copy };
    });
  },

  handleVoiceUserStateUpdated: (socketId, participantState) => {
    set((state) => {
      const existing = state.remoteStreams[socketId];
      if (existing) {
        return {
          remoteStreams: {
            ...state.remoteStreams,
            [socketId]: {
              ...existing,
              state: { ...existing.state, ...participantState },
            },
          },
        };
      }
      return state;
    });
  },

  // ==========================================
  // Controls: Mute, Deafen, Camera, Screen Share
  // ==========================================
  toggleMute: (socket) => {
    const { isMuted, localStream, activeCall } = get();
    const newMuted = !isMuted;

    if (newMuted) {
      sound.playMute();
    } else {
      sound.playUnmute();
    }

    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }

    if (activeCall?.type === 'channel' && socket) {
      socket.emit('voice:state_change', {
        channelId: activeCall.channelId,
        isMuted: newMuted,
      });
    }

    set({ isMuted: newMuted });
  },

  toggleDeafen: (socket) => {
    const { isDeafened, isMuted, localStream, activeCall } = get();
    const newDeafened = !isDeafened;

    if (newDeafened) {
      sound.playMute();
    } else {
      sound.playUnmute();
    }

    // Deafen also mutes mic automatically
    if (newDeafened && !isMuted && localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      set({ isMuted: true });
    }

    if (activeCall?.type === 'channel' && socket) {
      socket.emit('voice:state_change', {
        channelId: activeCall.channelId,
        isDeafened: newDeafened,
        isMuted: newDeafened ? true : isMuted,
      });
    }

    set({ isDeafened: newDeafened });
  },

  toggleVideo: async (socket) => {
    const { isVideoOn, localStream, activeCall } = get();

    try {
      if (!isVideoOn) {
        // Turn Camera ON
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (localStream) {
          localStream.addTrack(videoTrack);

          // Add or replace track in all peer connections
          const pcs = [
            window.__directPeerConnection,
            ...Object.values(window.__voicePeerConnections || {}),
          ].filter(Boolean);

          pcs.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            } else {
              pc.addTrack(videoTrack, localStream);
            }
          });
        }

        if (activeCall?.type === 'channel' && socket) {
          socket.emit('voice:state_change', {
            channelId: activeCall.channelId,
            isVideoOn: true,
          });
        }

        set({ isVideoOn: true });
      } else {
        // Turn Camera OFF
        if (localStream) {
          localStream.getVideoTracks().forEach((track) => {
            track.stop();
            localStream.removeTrack(track);
          });
        }

        if (activeCall?.type === 'channel' && socket) {
          socket.emit('voice:state_change', {
            channelId: activeCall.channelId,
            isVideoOn: false,
          });
        }

        set({ isVideoOn: false });
      }
    } catch (err) {
      console.error('Failed to toggle video:', err);
      toast.error('Camera could not be accessed');
    }
  },

  toggleScreenShare: async (socket) => {
    const { isScreenSharing, localStream, activeCall } = get();

    try {
      if (!isScreenSharing) {
        // Start Screen Sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const screenTrack = displayStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          get().stopScreenShare(socket);
        };

        const pcs = [
          window.__directPeerConnection,
          ...Object.values(window.__voicePeerConnections || {}),
        ].filter(Boolean);

        pcs.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else if (localStream) {
            pc.addTrack(screenTrack, displayStream);
          }
        });

        if (activeCall?.type === 'channel' && socket) {
          socket.emit('voice:state_change', {
            channelId: activeCall.channelId,
            isScreenSharing: true,
          });
        }

        set({ screenStream: displayStream, isScreenSharing: true });
      } else {
        get().stopScreenShare(socket);
      }
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  },

  stopScreenShare: (socket) => {
    const { screenStream, localStream, activeCall } = get();
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    // Revert back to camera track if camera was active
    const cameraTrack = localStream?.getVideoTracks()[0] || null;
    const pcs = [
      window.__directPeerConnection,
      ...Object.values(window.__voicePeerConnections || {}),
    ].filter(Boolean);

    pcs.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(cameraTrack);
      }
    });

    if (activeCall?.type === 'channel' && socket) {
      socket.emit('voice:state_change', {
        channelId: activeCall.channelId,
        isScreenSharing: false,
      });
    }

    set({ screenStream: null, isScreenSharing: false });
  },
}));
