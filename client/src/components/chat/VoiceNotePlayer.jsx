import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Mic, RotateCcw } from 'lucide-react';

export const VoiceNotePlayer = ({ src, duration = 0, waveform = [], senderName = 'User' }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Generate 32 default organic waveform bars if none provided
  const bars = React.useMemo(() => {
    if (waveform && waveform.length >= 10) {
      // Sample or interpolate down to 32 bars
      const targetCount = 32;
      const step = waveform.length / targetCount;
      const sampled = [];
      for (let i = 0; i < targetCount; i++) {
        const idx = Math.floor(i * step);
        sampled.push(waveform[idx] || 0.3);
      }
      return sampled;
    }

    // Default harmonic voice pattern
    return [
      0.2, 0.4, 0.6, 0.3, 0.7, 0.9, 0.5, 0.8, 0.4, 0.6, 0.8, 1.0, 0.7, 0.5, 0.8, 0.6,
      0.9, 0.7, 0.4, 0.6, 0.8, 0.5, 0.7, 0.9, 0.6, 0.4, 0.5, 0.7, 0.5, 0.4, 0.3, 0.2,
    ];
  }, [waveform]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Audio playback failed:', err);
      });
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * (totalDuration || 1);

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const togglePlaybackRate = () => {
    const audio = audioRef.current;
    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];

    setPlaybackRate(newRate);
    if (audio) {
      audio.playbackRate = newRate;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-gradient-to-r from-slate-900/90 to-indigo-950/40 border border-indigo-500/30 shadow-xl max-w-sm w-full select-none">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Top Header Tag */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
        <span className="flex items-center gap-1 font-semibold text-indigo-300">
          <Mic className="w-3 h-3 text-indigo-400" />
          <span>Voice Note</span>
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>

      {/* Main Player Row */}
      <div className="flex items-center gap-3">
        {/* Play / Pause Circular Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
          title={isPlaying ? 'Pause' : 'Play voice note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white translate-x-0.5" />
          )}
        </button>

        {/* Interactive Scrubbable Waveform */}
        <div
          onClick={handleSeek}
          className="flex-1 flex items-center gap-[3px] h-9 cursor-pointer py-1 group/wave"
          title="Click to seek"
        >
          {bars.map((amplitude, i) => {
            const barPercent = (i / bars.length) * 100;
            const isFilled = progressPercent >= barPercent;
            // Height between 6px and 28px
            const heightPx = Math.max(6, Math.min(28, Math.round(amplitude * 28)));

            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center h-full"
              >
                <div
                  style={{ height: `${heightPx}px` }}
                  className={`w-full rounded-full transition-all duration-100 ${
                    isFilled
                      ? 'bg-gradient-to-t from-indigo-400 to-purple-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                      : 'bg-slate-700/80 group-hover/wave:bg-slate-600'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Playback Speed Pill Button */}
        <button
          type="button"
          onClick={togglePlaybackRate}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-750 text-[10px] font-bold text-slate-300 hover:text-white transition-colors flex-shrink-0"
          title="Toggle speed (1x, 1.5x, 2x)"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};
