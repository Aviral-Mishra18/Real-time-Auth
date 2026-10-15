import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../common/Avatar';
import { RefreshCw, LogOut, Check, Loader2 } from 'lucide-react';

export const UserSettingsModal = () => {
  const { isUserSettingsOpen, setUserSettingsOpen } = useUIStore();
  const { user, updateProfile, logout } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [customStatus, setCustomStatus] = useState(user?.customStatus || '');
  const [status, setStatus] = useState(user?.status || 'online');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await updateProfile({
      name,
      customStatus,
      status,
      bio,
      avatar,
    });
    setLoading(false);
    if (success) {
      setUserSettingsOpen(false);
    }
  };

  return (
    <Modal
      isOpen={isUserSettingsOpen}
      onClose={() => setUserSettingsOpen(false)}
      title="User Settings & Profile"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar & Randomizer */}
        <div className="flex items-center gap-4 p-3 bg-slate-900 rounded-xl border border-slate-800">
          <Avatar src={avatar} name={name} size="xl" status={status} />
          <div className="space-y-1.5 flex-1">
            <div className="text-xs font-bold text-slate-200">Profile Picture</div>
            <button
              type="button"
              onClick={handleRandomAvatar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate Random Avatar</span>
            </button>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Display Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Status Indicator */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Online Presence
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'online', label: 'Online', color: 'bg-emerald-500' },
              { id: 'idle', label: 'Idle', color: 'bg-amber-500' },
              { id: 'dnd', label: 'Do Not Disturb', color: 'bg-rose-500' },
              { id: 'offline', label: 'Invisible', color: 'bg-slate-500' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-all ${
                  status === s.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Custom Status Message
          </label>
          <input
            type="text"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            placeholder="e.g. 🚀 Shipping SyncSpace 2.0"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            About Me / Bio
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell your team about yourself..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Bottom Actions & Logout */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              setUserSettingsOpen(false);
              logout();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUserSettingsOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-600/30"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
