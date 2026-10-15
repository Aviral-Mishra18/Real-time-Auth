import React, { useEffect, useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { useChatStore } from '../../store/chatStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { MessageBubble } from './MessageBubble';
import { Loader2, Hash, MessageSquare } from 'lucide-react';

export const MessageList = () => {
  const { messages, isLoadingMessages, isLoadingOlder, hasMore, fetchOlderMessages } = useChatStore();
  const { activeChannel } = useWorkspaceStore();
  const { activeDirectChat } = useChatStore();

  const scrollContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const previousScrollHeightRef = useRef(0);

  // Auto scroll to bottom on new message if user is already near bottom
  useEffect(() => {
    if (bottomRef.current && !isLoadingOlder) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoadingOlder]);

  // Handle infinite scroll up
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight } = e.target;
    if (scrollTop < 80 && hasMore && !isLoadingOlder) {
      previousScrollHeightRef.current = scrollHeight;
      fetchOlderMessages({
        channelId: activeChannel?._id,
        directChatId: activeDirectChat?._id,
      });
    }
  };

  // Maintain scroll position after prepending older messages
  useEffect(() => {
    if (isLoadingOlder && scrollContainerRef.current && previousScrollHeightRef.current > 0) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      scrollContainerRef.current.scrollTop = newScrollHeight - previousScrollHeightRef.current;
    }
  }, [messages, isLoadingOlder]);

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs">Loading conversation history...</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-2 py-4 space-y-1"
    >
      {/* Loading older messages indicator */}
      {isLoadingOlder && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      )}

      {/* Start of channel banner */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
            {activeChannel ? <Hash className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-bold text-slate-100">
            Welcome to {activeChannel ? `#${activeChannel.name}` : 'the conversation'}!
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            This is the very beginning of the {activeChannel ? `#${activeChannel.name} channel.` : 'chat.'} Send a message to get things started!
          </p>
        </div>
      ) : (
        messages.map((message, index) => {
          const prevMessage = messages[index - 1];

          // Check if we need a Date Divider
          const showDateDivider =
            !prevMessage || !isSameDay(new Date(message.createdAt), new Date(prevMessage.createdAt));

          // Check if this message is compact (consecutive from same sender within 5 mins)
          const isCompact =
            !showDateDivider &&
            prevMessage &&
            prevMessage.sender?._id === message.sender?._id &&
            new Date(message.createdAt) - new Date(prevMessage.createdAt) < 5 * 60 * 1000 &&
            !message.replyTo;

          return (
            <React.Fragment key={message._id || index}>
              {showDateDivider && (
                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative bg-[#0B0F19] px-3 text-[11px] font-bold text-slate-500 rounded-full border border-slate-800">
                    {format(new Date(message.createdAt), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
              )}
              <MessageBubble message={message} isCompact={isCompact} />
            </React.Fragment>
          );
        })
      )}

      <div ref={bottomRef} />
    </div>
  );
};
