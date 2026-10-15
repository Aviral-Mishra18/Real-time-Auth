import React, { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Avatar } from '../common/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useSocket } from '../../hooks/useSocket';
import { useUIStore } from '../../store/uiStore';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import {
  Smile,
  Reply,
  Pin,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  FileIcon,
  Download,
  MoreHorizontal,
  Sparkles,
  Bot,
  MessageSquare,
} from 'lucide-react';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀'];

export const MessageBubble = ({ message, isCompact = false }) => {
  const { user: currentUser } = useAuthStore();
  const { setReplyingTo, setEditingMessage, deleteMessage } = useChatStore();
  const { sendReaction } = useSocket();
  const { setLightboxMedia, openThread } = useUIStore();

  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const isSelf = message.sender?._id === currentUser?._id;
  const isDeleted = message.isDeleted;
  const isAi = message.isAi || message.sender?.isBot || message.sender?.name === 'SyncAI';

  // Format message timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const handleEmojiClick = (emoji) => {
    sendReaction(message._id, emoji);
    setShowEmojiMenu(false);
  };

  const handlePinClick = async () => {
    const { togglePin } = useChatStore.getState();
    await togglePin(message._id);
  };

  // Render text with rich markdown, headings, bullet lists, and code formatting
  const renderFormattedText = (text) => {
    if (!text) return null;

    const codeBlockRegex = /```([a-zA-Z]*)\n?([\s\S]*?)```/g;
    if (text.includes('```')) {
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={lastIndex} className="whitespace-pre-wrap">
              {renderInlineMarkdown(text.slice(lastIndex, match.index))}
            </span>
          );
        }
        const lang = match[1] || '';
        const code = match[2];
        parts.push(
          <div key={match.index} className="my-2 rounded-xl overflow-hidden border border-slate-800 bg-[#070A12] shadow-inner">
            {lang && (
              <div className="px-3 py-1 bg-slate-900 text-[10px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                {lang}
              </div>
            )}
            <pre className="p-3 text-emerald-400 font-mono text-xs overflow-x-auto">
              <code>{code}</code>
            </pre>
          </div>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        parts.push(
          <span key={lastIndex} className="whitespace-pre-wrap">
            {renderInlineMarkdown(text.slice(lastIndex))}
          </span>
        );
      }
      return <div className="leading-relaxed">{parts}</div>;
    }

    return (
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {renderInlineMarkdown(text)}
      </div>
    );
  };

  const renderInlineMarkdown = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-indigo-300 mt-2 mb-1 flex items-center gap-1.5">
            {line.slice(4)}
          </h4>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h5 key={idx} className="text-xs font-bold text-slate-200 mt-1.5 mb-0.5">
            {line.slice(5)}
          </h5>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={idx} className="flex items-start gap-2 pl-2 my-0.5 text-xs text-slate-300">
            <span className="text-indigo-400 mt-1 text-[8px]">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
      }
      return (
        <span key={idx}>
          {line}
          {idx < lines.length - 1 ? '\n' : ''}
        </span>
      );
    });
  };

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiMenu(false);
      }}
      className={`group relative flex gap-3 px-4 py-1.5 hover:bg-slate-800/30 transition-colors ${
        message.isPinned
          ? 'bg-amber-500/5 border-l-2 border-amber-500/60'
          : isAi
          ? 'bg-indigo-950/20 border-l-2 border-indigo-500/70 shadow-sm'
          : ''
      }`}
    >
      {/* Sender Avatar */}
      {!isCompact ? (
        <Avatar src={message.sender?.avatar} name={message.sender?.name} size="md" className="mt-0.5" />
      ) : (
        <div className="w-10 text-[10px] text-slate-500 text-right opacity-0 group-hover:opacity-100 select-none pt-1">
          {format(new Date(message.createdAt), 'HH:mm')}
        </div>
      )}

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        {/* Sender Name & Timestamp */}
        {!isCompact && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-slate-200 hover:underline cursor-pointer flex items-center gap-1.5">
              <span>{message.sender?.name || 'Unknown User'}</span>
              {isAi && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-2.5 h-2.5" /> AI BOT
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-500">{formatTime(message.createdAt)}</span>
            {message.isEdited && (
              <span className="text-[10px] text-slate-500 italic">(edited)</span>
            )}
            {message.isPinned && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full font-medium">
                <Pin className="w-2.5 h-2.5" /> Pinned
              </span>
            )}
          </div>
        )}

        {/* Reply Context if message is a reply */}
        {message.replyTo && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded-lg mb-1.5 border-l-2 border-indigo-500/60">
            <Reply className="w-3 h-3 text-indigo-400 rotate-180" />
            <span className="font-semibold text-slate-300">
              {message.replyTo.sender?.name || 'User'}:
            </span>
            <span className="truncate italic text-slate-400">{message.replyTo.content}</span>
          </div>
        )}

        {/* Message Content */}
        {message.content && (
          <div className={`text-sm ${isDeleted ? 'italic text-slate-500' : 'text-slate-200'}`}>
            {renderFormattedText(message.content)}
          </div>
        )}

        {/* Attachments & Voice Notes */}
        {message.attachments && message.attachments.length > 0 && !isDeleted && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att, idx) => {
              const isAudio =
                message.isVoiceNote ||
                att.type?.startsWith('audio/') ||
                att.url?.match(/\.(webm|ogg|mp3|wav|m4a|aac)$/i);
              const isImage =
                !isAudio &&
                (att.type?.startsWith('image/') ||
                  att.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i));

              if (isAudio) {
                return (
                  <VoiceNotePlayer
                    key={idx}
                    src={att.url}
                    duration={att.duration || message.voiceDuration}
                    waveform={att.waveform || message.voiceWaveform}
                    senderName={message.sender?.name}
                  />
                );
              }

              if (isImage) {
                return (
                  <div
                    key={idx}
                    onClick={() => setLightboxMedia(att)}
                    className="relative group/att rounded-xl overflow-hidden max-w-sm border border-slate-700/50 cursor-pointer shadow-md bg-slate-900"
                  >
                    <img
                      src={att.url}
                      alt={att.name}
                      className="max-h-60 rounded-xl object-cover hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                );
              }

              return (
                <a
                  key={idx}
                  href={att.url}
                  download={att.name}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition-colors max-w-xs"
                >
                  <FileIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{att.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'File'}
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 hover:text-white flex-shrink-0" />
                </a>
              );
            })}
          </div>
        )}

        {/* Emoji Reactions List */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.reactions.map((r, i) => {
              const hasReacted = r.users?.some(
                (u) => (typeof u === 'string' ? u : u?._id) === currentUser?._id
              );
              return (
                <button
                  key={i}
                  onClick={() => handleEmojiClick(r.emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-all ${
                    hasReacted
                      ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 font-semibold shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/40 text-slate-300'
                  }`}
                  title={`${r.users?.length || 1} people reacted`}
                >
                  <span>{r.emoji}</span>
                  <span className="text-[11px]">{r.users?.length || 1}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Slack-style Thread Summary Pill */}
        {message.replyCount > 0 && (
          <div className="mt-2 flex items-center">
            <button
              onClick={() => openThread(message)}
              className="group/thread inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-950/30 hover:bg-indigo-900/40 border border-indigo-500/30 hover:border-indigo-500/60 transition-all text-xs text-indigo-300"
            >
              <div className="flex -space-x-1.5 items-center">
                {message.replyParticipants && message.replyParticipants.length > 0 ? (
                  message.replyParticipants.slice(0, 3).map((p, idx) => (
                    <div
                      key={p._id || idx}
                      className="w-4 h-4 rounded-full ring-2 ring-[#0E1320] bg-indigo-700 overflow-hidden flex items-center justify-center text-[8px] font-bold text-white uppercase flex-shrink-0"
                      title={p.name}
                    >
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        (p.name || 'U')[0]
                      )}
                    </div>
                  ))
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </div>

              <span className="font-semibold text-indigo-300 group-hover/thread:underline">
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </span>

              {message.lastReplyAt && (
                <span className="text-[10px] text-slate-400 font-normal">
                  Last reply {formatTime(message.lastReplyAt)}
                </span>
              )}

              <span className="text-[10px] text-indigo-400 font-medium opacity-0 group-hover/thread:opacity-100 transition-opacity ml-0.5">
                View thread →
              </span>
            </button>
          </div>
        )}

        {/* Broadcasted from thread indicator */}
        {message.broadcastToChannel && (
          <div className="flex items-center gap-1.5 text-[10px] text-indigo-400/90 font-medium mt-1.5">
            <MessageSquare className="w-3 h-3 text-indigo-400" />
            <span>Replies in thread</span>
          </div>
        )}
      </div>

      {/* Hover Actions Toolbar */}
      {showActions && !isDeleted && (
        <div className="absolute right-4 -top-3 z-10 flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-1 py-0.5 shadow-xl animate-fade-in text-slate-400">
          {/* Quick Reaction Emojis popup */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiMenu(!showEmojiMenu)}
              className="p-1.5 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Add Reaction"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showEmojiMenu && (
              <div className="absolute right-0 bottom-full mb-1 flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-20">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-1.5 hover:scale-125 transition-transform text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply in Thread */}
          <button
            onClick={() => openThread(message)}
            className="p-1.5 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Reply in thread"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Reply (Quote in main chat) */}
          <button
            onClick={() => setReplyingTo(message)}
            className="p-1.5 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Quote Reply"
          >
            <Reply className="w-4 h-4" />
          </button>

          {/* Pin */}
          <button
            onClick={handlePinClick}
            className={`p-1.5 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors ${
              message.isPinned ? 'text-amber-400' : ''
            }`}
            title={message.isPinned ? 'Unpin message' : 'Pin message'}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Self Message Actions: Edit & Delete */}
          {isSelf && (
            <>
              <button
                onClick={() => setEditingMessage(message)}
                className="p-1.5 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Edit message"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteMessage(message._id)}
                className="p-1.5 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
