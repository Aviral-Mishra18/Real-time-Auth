import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { KeyRound, ArrowRight, Loader2 } from 'lucide-react';

export const JoinWorkspaceModal = () => {
  const { isJoinWorkspaceOpen, setJoinWorkspaceOpen } = useUIStore();
  const { joinWorkspace } = useWorkspaceStore();

  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    const success = await joinWorkspace(inviteCode.trim());
    setLoading(false);

    if (success) {
      setInviteCode('');
      setJoinWorkspaceOpen(false);
    }
  };

  return (
    <Modal
      isOpen={isJoinWorkspaceOpen}
      onClose={() => setJoinWorkspaceOpen(false)}
      title="Join an Existing Workspace"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-400">
          Enter the 8-character invite code provided by a workspace administrator.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Invite Code *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7A9B3E2F"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-indigo-400 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 uppercase"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setJoinWorkspaceOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !inviteCode.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>Join Workspace</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
