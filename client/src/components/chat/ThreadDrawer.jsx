import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useChatStore } from '../../store/chatStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import { Avatar } from '../common/Avatar';
import EmojiPicker from 'emoji-picker-react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import {
  X,
  MessageSquare,
  Send,
  Smile,
  Paperclip,
  Loader2,
  FileIcon,
  Download,
  Sparkles,
  CornerDownRight,
  Check,
  Mic,
  Trash2,
} from 'lucide-react';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

export const ThreadDrawer = () => {
  const { user } = useAuthStore();
  const { activeThreadMessage, closeThread } = useUIStore();
  const { activeChannel } = useWorkspaceStore();
  const { activeDirectChat, threadReplies, isLoadingThread, fetchThreadReplies } = useChatStore();
  const { sendMessageViaSocket } = useSocket();

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);

  const {
    isRecording,
    isProcessing: isRecordingProcessing,
    formattedDuration,
    liveAmplitudes,
    startRecording,
    stopAndGetAudio,
    cancelRecording,
  } = useAudioRecorder();

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const repliesEndRef = useRef(null);

  const handleFinishVoiceNote = async () => {
    const audioData = await stopAndGetAudio();
    if (!audioData) return;

    const { blob, duration, waveform, mimeType } = audioData;
    const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `voice-note-${Date.now()}.${ext}`;
    const file = new File([blob], fileName, { type: mimeType });

    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading('Sending voice reply...');
    try {
      const res = await api.post('/api/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        const voiceAttachment = {
          url: res.data.file.url,
          name: 'Voice Note',
          size: res.data.file.size,
          type: res.data.file.type || mimeType,
          duration,
          waveform,
        };

        const payload = {
          channelId: activeChannel?._id,
          directChatId: activeDirectChat?._id,
          content: '',
          isVoiceNote: true,
          voiceDuration: duration,
          voiceWaveform: waveform,
          attachments: [voiceAttachment],
          threadParentId: activeThreadMessage._id,
          broadcastToChannel: alsoSendToChannel,
        };

        sendMessageViaSocket(payload);
        toast.success('Voice reply sent!', { id: toastId });
      }
    } catch (err) {
      console.error('Failed to send thread voice note:', err);
      toast.error('Failed to send voice reply', { id: toastId });
    }
  };

  // Fetch thread replies whenever the active thread changes
  useEffect(() => {
    if (activeThreadMessage?._id) {
      fetchThreadReplies(activeThreadMessage._id);
      setText('');
      setAttachments([]);
      setAlsoSendToChannel(false);
    }
  }, [activeThreadMessage?._id]);

  // Scroll to bottom on new reply
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadReplies?.length]);

  if (!activeThreadMessage) return null;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await api.post('/api/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setAttachments((prev) => [...prev, res.data.file]);
        toast.success(`Attached ${file.name}`);
      }
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    const payload = {
      channelId: activeChannel?._id || null,
      directChatId: activeDirectChat?._id || null,
      threadParentId: activeThreadMessage._id,
      broadcastToChannel: alsoSendToChannel,
      content: trimmed,
      attachments,
      replyTo: activeThreadMessage._id,
    };

    sendMessageViaSocket(payload);

    setText('');
    setAttachments([]);
    setAlsoSendToChannel(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside
      aria-label="Thread Replies"
      className="fixed inset-y-0 right-0 z-40 w-full md:static md:w-[380px] lg:w-[420px] h-full bg-[#0E1320] border-l border-slate-800/80 flex flex-col flex-shrink-0 shadow-2xl select-none"
    >
      {/* Thread Header */}
      <div className="h-14 px-4 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-[#0B0F19]">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-100 leading-none">Thread</h3>
            <span className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5 inline-block">
              {activeChannel ? `#${activeChannel.name}` : 'Direct Conversation'}
            </span>
          </div>
        </div>

        <button
          onClick={closeThread}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Close Thread"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Thread Body & Replies Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Pinned Parent Message Card */}
        <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-3.5 shadow-lg relative">
          <div className="flex items-start gap-3">
            <Avatar
              src={activeThreadMessage.sender?.avatar}
              name={activeThreadMessage.sender?.name || 'User'}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                  <span>{activeThreadMessage.sender?.name || 'User'}</span>
                  {activeThreadMessage.isAi && (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                  {formatTime(activeThreadMessage.createdAt)}
                </span>
              </div>
              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed break-words">
                {activeThreadMessage.content}
              </p>

              {/* Attachments if any */}
              {activeThreadMessage.attachments?.length > 0 && (
                <div className="mt-2 space-y-2">
                  {activeThreadMessage.attachments.map((att, i) => {
                    const isAudio =
                      activeThreadMessage.isVoiceNote ||
                      att.type?.startsWith('audio/') ||
                      att.url?.match(/\.(webm|ogg|mp3|wav|m4a|aac)$/i);
                    if (isAudio) {
                      return (
                        <VoiceNotePlayer
                          key={i}
                          src={att.url}
                          duration={att.duration || activeThreadMessage.voiceDuration}
                          waveform={att.waveform || activeThreadMessage.voiceWaveform}
                          senderName={activeThreadMessage.sender?.name}
                        />
                      );
                    }
                    return (
                      <div key={i} className="text-[11px] text-indigo-400 flex items-center gap-1 truncate">
                        <FileIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{att.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Replies Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="h-[1px] flex-1 bg-slate-800" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>{threadReplies.length}</span>
            <span>{threadReplies.length === 1 ? 'Reply' : 'Replies'}</span>
          </span>
          <div className="h-[1px] flex-1 bg-slate-800" />
        </div>

        {/* Replies List */}
        {isLoadingThread ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-xs">Loading replies...</span>
          </div>
        ) : threadReplies.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500 text-xs">
            No replies in this thread yet. Start the discussion below!
          </div>
        ) : (
          threadReplies.map((reply) => {
            const isSelf = reply.sender?._id === user?._id;
            const isAi = reply.isAi || reply.sender?.isBot;

            return (
              <div
                key={reply._id}
                className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/30 transition-colors"
              >
                <Avatar
                  src={reply.sender?.avatar}
                  name={reply.sender?.name || 'User'}
                  size="sm"
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                      <span>{reply.sender?.name || 'User'}</span>
                      {isAi && (
                        <span className="text-[8px] bg-purple-500/20 text-purple-400 font-bold px-1 rounded">
                          AI
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatTime(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed break-words">
                    {reply.content}
                  </p>

                  {/* Reply Attachments */}
                  {reply.attachments?.length > 0 && (
                    <div className="mt-1 space-y-2">
                      {reply.attachments.map((att, i) => {
                        const isAudio =
                          reply.isVoiceNote ||
                          att.type?.startsWith('audio/') ||
                          att.url?.match(/\.(webm|ogg|mp3|wav|m4a|aac)$/i);
                        if (isAudio) {
                          return (
                            <VoiceNotePlayer
                              key={i}
                              src={att.url}
                              duration={att.duration || reply.voiceDuration}
                              waveform={att.waveform || reply.voiceWaveform}
                              senderName={reply.sender?.name}
                            />
                          );
                        }
                        return (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-indigo-300 hover:text-white"
                          >
                            <FileIcon className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={repliesEndRef} />
      </div>

      {/* Thread Reply Input Dock */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0B0F19] flex flex-col gap-2">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
              >
                <FileIcon className="w-3 h-3 text-indigo-400" />
                <span className="text-[11px] truncate max-w-[120px]">{att.name}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input box */}
        <div className="relative flex items-end gap-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 focus-within:border-indigo-500/80 transition-all">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple={false}
          />

          {isRecording ? (
            <div className="flex-1 flex items-center justify-between gap-2 px-1 py-1 animate-fade-in min-h-[34px]">
              {/* Left: Glowing red dot & Timer */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </div>
                <span className="font-mono text-xs font-bold text-rose-400">
                  {formattedDuration}
                </span>
              </div>

              {/* Center: Live Waveform */}
              <div className="flex-1 flex items-center justify-center gap-[2px] h-6 px-1">
                {liveAmplitudes.slice(0, 12).map((amp, i) => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(4, Math.round(amp * 22))}px` }}
                    className="w-1 rounded-full bg-gradient-to-t from-rose-500 to-indigo-500 transition-all duration-75"
                  />
                ))}
              </div>

              {/* Right: Discard / Send */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  title="Discard voice note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleFinishVoiceNote}
                  disabled={isRecordingProcessing}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                  title="Send voice note"
                >
                  {isRecordingProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                title="Attach file"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Reply in thread..."
                className="flex-1 bg-transparent text-slate-100 text-xs placeholder-slate-500 focus:outline-none resize-none py-1 max-h-32 scrollbar-none"
              />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute right-0 bottom-full mb-2 z-50 shadow-2xl animate-fade-in">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme="dark"
                      searchPlaceholder="Search emoji..."
                      width={280}
                      height={320}
                    />
                  </div>
                )}
              </div>

              {/* Mic Voice Note button */}
              <button
                type="button"
                onClick={startRecording}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
                title="Record Voice Note"
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() && attachments.length === 0}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-all flex-shrink-0"
                title="Send reply (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Slack-style "Also send to #channel" checkbox */}
        {activeChannel && (
          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400 hover:text-slate-300 pt-0.5 select-none">
            <input
              type="checkbox"
              checked={alsoSendToChannel}
              onChange={(e) => setAlsoSendToChannel(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Also send to #{activeChannel.name}</span>
          </label>
        )}
      </div>
    </aside>
  );
};
