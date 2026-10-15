import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  useEffect(() => {
    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#080B12] text-slate-400 gap-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 animate-ping absolute" />
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/40">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">
          Starting SyncSpace...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F19]">
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-slate-900 !text-slate-100 !border !border-slate-700/80 !shadow-2xl !text-xs !font-medium',
          duration: 3500,
        }}
      />

      {isAuthenticated ? (
        <DashboardPage />
      ) : authView === 'login' ? (
        <LoginPage onSwitchToRegister={() => setAuthView('register')} />
      ) : (
        <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
      )}
    </div>
  );
}
