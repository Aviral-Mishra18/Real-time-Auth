import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Building2, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CreateWorkspaceModal = () => {
  const { isCreateWorkspaceOpen, setCreateWorkspaceOpen } = useUIStore();
  const { createWorkspace } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const success = await createWorkspace(name.trim(), description.trim());
    setLoading(false);

    if (success) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      setName('');
      setDescription('');
      setCreateWorkspaceOpen(false);
    }
  };

  return (
    <Modal
      isOpen={isCreateWorkspaceOpen}
      onClose={() => setCreateWorkspaceOpen(false)}
      title="Create a Workspace"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-400">
          Your workspace is where your team gathers, collaborates, and shares ideas in organized channels.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Workspace Name *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Engineering or Design Team"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this workspace for?"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setCreateWorkspaceOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Create Workspace</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
