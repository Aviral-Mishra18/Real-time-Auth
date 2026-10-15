import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Hash, Lock, Volume2, Loader2 } from 'lucide-react';

export const CreateChannelModal = () => {
  const { isCreateChannelOpen, setCreateChannelOpen } = useUIStore();
  const { activeWorkspace, createChannel } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('public');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const success = await createChannel(name.trim(), topic.trim(), type);
    setLoading(false);

    if (success) {
      setName('');
      setTopic('');
      setType('public');
      setCreateChannelOpen(false);
    }
  };

  return (
    <Modal
      isOpen={isCreateChannelOpen}
      onClose={() => setCreateChannelOpen(false)}
      title="Create Channel"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-400">
          Channels are where your team communicates on a specific topic or project.
        </p>

        {/* Channel Type */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Channel Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('public')}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                type === 'public'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Hash className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-200">Public</div>
                <div className="text-[10px] text-slate-400">Text channel</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('voice')}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                type === 'voice'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white'
                  : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Volume2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-200">Voice</div>
                <div className="text-[10px] text-slate-400">Audio & video</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('private')}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                type === 'private'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Lock className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-200">Private</div>
                <div className="text-[10px] text-slate-400">Only invited</div>
              </div>
            </button>
          </div>
        </div>

        {/* Channel Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Channel Name *
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-500 text-sm font-bold">#</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9_-]/g, '')
                )
              }
              placeholder="e.g. project-launch"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Topic (Optional)
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What is this channel about?"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setCreateChannelOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Create Channel</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
