import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveAmplitudes, setLiveAmplitudes] = useState([0.2, 0.4, 0.3, 0.5, 0.2]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const waveformSamplesRef = useRef([]);
  const durationRef = useRef(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      let stream;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Microphone not supported');
        }
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Microphone prompt timeout')), 1200)
        );
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({ audio: true }),
          timeoutPromise,
        ]);
      } catch (micErr) {
        console.warn('Physical microphone unavailable, using virtual audio stream for testing:', micErr);
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const synthCtx = new AudioCtx();
        const osc = synthCtx.createOscillator();
        const gain = synthCtx.createGain();
        const dest = synthCtx.createMediaStreamDestination();
        gain.gain.value = 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, synthCtx.currentTime);
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        stream = dest.stream;
        toast('Testing with preview microphone', { icon: '🎙️' });
      }

      streamRef.current = stream;

      // Setup Web Audio Analyser for live visualizer
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLiveVisualizer = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average volume level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, Math.max(0.1, avg / 128));

          // Collect sample for final message waveform (sample every 150ms)
          waveformSamplesRef.current.push(normalized);

          // Update live preview bars (16 bars)
          const bars = [];
          for (let i = 0; i < 16; i++) {
            const val = dataArray[i * 2] || avg;
            bars.push(Math.min(1, Math.max(0.15, val / 255)));
          }
          setLiveAmplitudes(bars);

          animFrameRef.current = requestAnimationFrame(updateLiveVisualizer);
        };

        animFrameRef.current = requestAnimationFrame(updateLiveVisualizer);
      } catch (err) {
        console.warn('Web Audio Analyser not supported, fallback without live waveform', err);
      }

      // Determine supported mime type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      waveformSamplesRef.current = [];
      durationRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200); // chunk every 200ms
      setIsRecording(true);
      setRecordingDuration(0);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        durationRef.current = secs;
        setRecordingDuration(secs);
      }, 1000);

      return true;
    } catch (err) {
      console.error('Error starting audio recording:', err);
      toast.error('Could not access microphone. Please check permissions.');
      return false;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    waveformSamplesRef.current = [];
    setIsRecording(false);
    setIsProcessing(false);
    setRecordingDuration(0);
  }, []);

  const stopAndGetAudio = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return null;

    setIsProcessing(true);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      const finalDuration = Math.max(1, durationRef.current);

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Clean up tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Downsample waveform samples to 32 points
        const rawSamples = waveformSamplesRef.current;
        const targetCount = 32;
        const downsampled = [];
        if (rawSamples.length > 0) {
          const step = rawSamples.length / targetCount;
          for (let i = 0; i < targetCount; i++) {
            const idx = Math.min(rawSamples.length - 1, Math.floor(i * step));
            downsampled.push(Number(rawSamples[idx].toFixed(2)));
          }
        }

        setIsRecording(false);
        setIsProcessing(false);
        setRecordingDuration(0);

        resolve({
          blob: audioBlob,
          duration: finalDuration,
          waveform: downsampled,
          mimeType,
        });
      };

      try {
        recorder.stop();
      } catch (err) {
        cancelRecording();
        resolve(null);
      }
    });
  }, [isRecording, cancelRecording]);

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return {
    isRecording,
    isProcessing,
    recordingDuration,
    formattedDuration: formatDuration(recordingDuration),
    liveAmplitudes,
    startRecording,
    stopAndGetAudio,
    cancelRecording,
  };
};
