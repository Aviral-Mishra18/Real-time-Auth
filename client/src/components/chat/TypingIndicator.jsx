import React from 'react';
import { useChatStore } from '../../store/chatStore';

export const TypingIndicator = () => {
  const { typingUsers } = useChatStore();

  if (!typingUsers || typingUsers.length === 0) return <div className="h-6" />;

  let typingText = '';
  if (typingUsers.length === 1) {
    typingText = `${typingUsers[0].name} is typing...`;
  } else if (typingUsers.length === 2) {
    typingText = `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
  } else {
    typingText = `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
  }

  return (
    <div className="h-6 px-4 flex items-center gap-2 text-xs text-indigo-400 font-medium select-none animate-fade-in">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
      </div>
      <span>{typingText}</span>
    </div>
  );
};
