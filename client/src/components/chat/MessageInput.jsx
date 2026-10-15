import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChatStore } from '../../store/chatStore';
import { useSocket } from '../../hooks/useSocket';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  Paperclip,
  Smile,
  Send,
  X,
  FileIcon,
  Image as ImageIcon,
  Loader2,
  CornerDownRight,
  Sparkles,
  Bot,
  Code2,
  BookOpen,
  Mic,
  Trash2,
} from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

export const MessageInput = () => {
  const { activeChannel } = useWorkspaceStore();
  const { activeDirectChat, replyingTo, setReplyingTo, editingMessage, setEditingMessage, editMessage } = useChatStore();
  const { sendMessageViaSocket, sendTypingStart, sendTypingStop } = useSocket();

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);

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
  const typingTimeoutRef = useRef(null);

  // Sync text when editing a message
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleFinishVoiceNote = async () => {
    const audioData = await stopAndGetAudio();
    if (!audioData) return;

    const { blob, duration, waveform, mimeType } = audioData;
    const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `voice-note-${Date.now()}.${ext}`;
    const file = new File([blob], fileName, { type: mimeType });

    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading('Sending voice note...');
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
          replyTo: replyingTo?._id || null,
        };

        sendMessageViaSocket(payload);
        toast.success('Voice note sent!', { id: toastId });
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('Failed to send voice note:', err);
      toast.error('Failed to send voice note', { id: toastId });
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);

    // Auto-grow textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }

    // Debounce typing indicator
    sendTypingStart();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 2000);
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

  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = text.trim();

    if (!trimmed && attachments.length === 0) return;

    // Handle Edit Mode
    if (editingMessage) {
      await editMessage(editingMessage._id, trimmed);
      setText('');
      setEditingMessage(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    // Send New Message
    const payload = {
      channelId: activeChannel?._id,
      directChatId: activeDirectChat?._id,
      content: trimmed,
      attachments,
      replyTo: replyingTo?._id || null,
    };

    sendMessageViaSocket(payload);

    // Reset input states
    setText('');
    setAttachments([]);
    setReplyingTo(null);
    sendTypingStop();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const targetName = activeChannel ? `#${activeChannel.name}` : 'conversation';

  return (
    <div className="p-3 bg-[#0B0F19] border-t border-slate-800/80">
      {/* Replying Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-slate-800/80 px-3 py-1.5 rounded-t-xl text-xs text-slate-300 border-t border-x border-slate-700/60 animate-fade-in">
          <div className="flex items-center gap-2 truncate">
            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Replying to <strong className="text-white">{replyingTo.sender?.name}</strong>
            </span>
            <span className="italic text-slate-400 truncate max-w-sm">"{replyingTo.content}"</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between bg-indigo-950/40 px-3 py-1.5 rounded-t-xl text-xs text-indigo-300 border-t border-x border-indigo-700/40 animate-fade-in">
          <span>Editing message</span>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-1 text-indigo-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-slate-900 border-x border-t border-slate-700/60 rounded-t-xl">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-200 border border-slate-700"
            >
              <FileIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[150px]">{att.name}</span>
              <button
                onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                className="p-0.5 hover:text-rose-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Box */}
      <div className="relative flex items-end gap-2 bg-slate-900/90 rounded-2xl border border-slate-700/80 p-2 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all shadow-inner">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          multiple={false}
        />

        {/* Attachment Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
          title="Attach a file or image"
        >
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> : <Paperclip className="w-5 h-5" />}
        </button>

        {/* AI Quick Menu Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAiMenu(!showAiMenu)}
            className="p-2 text-purple-400 hover:text-purple-200 hover:bg-purple-600/20 rounded-xl transition-colors flex-shrink-0"
            title="Ask SyncAI Assistant (/ask, /summary, /review, /notes)"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* AI Commands Popover */}
          {showAiMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAiMenu(false)} />
              <div className="absolute left-0 bottom-full mb-3 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border border-purple-500/40 rounded-2xl shadow-2xl p-2 animate-fade-in text-left">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 border-b border-slate-800">
                  <Bot className="w-3.5 h-3.5" />
                  <span>SyncAI Quick Commands</span>
                </div>

                <div className="space-y-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setText('/ask ');
                      setShowAiMenu(false);
                      textareaRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-purple-600/20 text-slate-200 hover:text-white transition-all text-left"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100">/ask &lt;prompt&gt;</div>
                      <div className="text-[10px] text-slate-400">Ask any technical question or advice</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setText('/summary');
                      setShowAiMenu(false);
                      textareaRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-indigo-600/20 text-slate-200 hover:text-white transition-all text-left"
                  >
                    <BookOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100">/summary</div>
                      <div className="text-[10px] text-slate-400">Instant TL;DR of recent channel chat</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setText('/review ');
                      setShowAiMenu(false);
                      textareaRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-emerald-600/20 text-slate-200 hover:text-white transition-all text-left"
                  >
                    <Code2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100">/review &lt;code&gt;</div>
                      <div className="text-[10px] text-slate-400">Perform code review and find bugs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setText('/notes');
                      setShowAiMenu(false);
                      textareaRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-pink-600/20 text-slate-200 hover:text-white transition-all text-left"
                  >
                    <Bot className="w-4 h-4 text-pink-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-100">/notes</div>
                      <div className="text-[10px] text-slate-400">Create meeting notes & sync to notepad</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {isRecording ? (
          <div className="flex-1 flex items-center justify-between gap-3 px-2 py-1 animate-fade-in min-h-[38px]">
            {/* Left: Glowing Red Pulse & Live Timer */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </div>
              <span className="font-mono text-xs font-bold text-rose-400">
                {formattedDuration}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Recording audio...
              </span>
            </div>

            {/* Center: Live Audio Waveform Visualizer */}
            <div className="flex-1 max-w-xs flex items-center justify-center gap-[3px] h-7 px-2">
              {liveAmplitudes.map((amp, i) => (
                <div
                  key={i}
                  style={{ height: `${Math.max(4, Math.round(amp * 26))}px` }}
                  className="w-1 rounded-full bg-gradient-to-t from-rose-500 to-indigo-500 transition-all duration-75 shadow-sm"
                />
              ))}
            </div>

            {/* Right: Discard / Send Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Cancel / Trash */}
              <button
                id="voice-cancel-btn"
                type="button"
                onClick={cancelRecording}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Discard voice note"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Stop & Send */}
              <button
                id="voice-send-btn"
                type="button"
                onClick={handleFinishVoiceNote}
                disabled={isRecordingProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                title="Send voice note"
              >
                {isRecordingProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${targetName} or type @ai, /ask, /summary...`}
              className="flex-1 bg-transparent text-slate-100 text-sm placeholder-slate-500 focus:outline-none resize-none py-1.5 max-h-40 scrollbar-none"
            />

            {/* Emoji Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-xl transition-colors flex-shrink-0"
                title="Add Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div className="absolute right-0 bottom-full mb-3 z-50 shadow-2xl animate-fade-in">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme="dark"
                    searchPlaceholder="Search emoji..."
                    width={320}
                    height={380}
                  />
                </div>
              )}
            </div>

            {/* Voice Note Mic Button */}
            <button
              id="mic-record-btn"
              type="button"
              onClick={startRecording}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex-shrink-0"
              title="Record Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() && attachments.length === 0}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all shadow-md flex-shrink-0"
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
