import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useChatStore } from '../../store/chatStore';
import { Avatar } from '../common/Avatar';
import api from '../../api/client';
import { Pin, X, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export const PinnedMessagesModal = () => {
  const { activeChannel } = useWorkspaceStore();
  const { activeDirectChat, setActiveTab, togglePin } = useChatStore();

  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPinned = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeChannel) params.channelId = activeChannel._id;
      if (activeDirectChat) params.directChatId = activeDirectChat._id;

      const res = await api.get('/api/messages/pinned', { params });
      if (res.data.success) {
        setPinnedMessages(res.data.messages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPinned();
  }, [activeChannel?._id, activeDirectChat?._id]);

  const handleUnpin = async (id) => {
    await togglePin(id);
    setPinnedMessages((prev) => prev.filter((m) => m._id !== id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19]">
      {/* Header */}
      <div className="h-12 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Pinned Messages ({pinnedMessages.length})
          </span>
        </div>

        <button
          onClick={() => setActiveTab('chat')}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to chat</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : pinnedMessages.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No pinned messages in this channel yet. Hover over any important message and click the pin icon!
          </div>
        ) : (
          pinnedMessages.map((msg) => (
            <div
              key={msg._id}
              className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar src={msg.sender?.avatar} name={msg.sender?.name} size="sm" />
                  <span className="text-xs font-bold text-slate-200">{msg.sender?.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>

                <button
                  onClick={() => handleUnpin(msg._id)}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded"
                  title="Unpin"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs text-slate-300 pl-8">{msg.content}</div>

              {msg.pinnedBy && (
                <div className="text-[10px] text-amber-400/80 pl-8 font-medium">
                  Pinned by {msg.pinnedBy.name}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
