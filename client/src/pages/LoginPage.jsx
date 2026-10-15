import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { MessageSquare, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const LoginPage = ({ onSwitchToRegister }) => {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  const fillDemoAccount = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080B12] relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md glass rounded-3xl p-8 shadow-2xl border border-slate-700/60 z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30 mb-4">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Welcome back to SyncSpace</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Log in to continue collaborating in real-time with your team.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>Sign In</span>
          </button>
        </form>

        {/* Demo Accounts Quick Login */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick Demo Accounts
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('alex@syncspace.io', 'password123')}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-left transition-colors text-xs text-slate-300"
            >
              <div className="font-semibold text-indigo-400">Alex Rivers</div>
              <div className="text-[10px] text-slate-500">Engineering Lead</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('sarah@syncspace.io', 'password123')}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-left transition-colors text-xs text-slate-300"
            >
              <div className="font-semibold text-violet-400">Sarah Chen</div>
              <div className="text-[10px] text-slate-500">Product Designer</div>
            </button>
          </div>
        </div>

        {/* Switch to Register */}
        <div className="text-center mt-6 text-xs text-slate-400">
          Don't have an account yet?{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};
