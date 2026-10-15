import { create } from 'zustand';
import api from '../api/client';
import toast from 'react-hot-toast';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('syncspace_user') || 'null'),
  token: localStorage.getItem('syncspace_token') || null,
  isAuthenticated: !!localStorage.getItem('syncspace_token'),
  isLoading: false,
  isCheckingAuth: true,

  // Initialize auth check
  checkAuth: async () => {
    set({ isCheckingAuth: true });
    const token = localStorage.getItem('syncspace_token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isCheckingAuth: false });
      return;
    }

    try {
      const res = await api.get('/api/auth/me');
      if (res.data.success) {
        set({
          user: res.data.user,
          isAuthenticated: true,
          isCheckingAuth: false,
        });
        localStorage.setItem('syncspace_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      localStorage.removeItem('syncspace_token');
      localStorage.removeItem('syncspace_user');
      set({ user: null, token: null, isAuthenticated: false, isCheckingAuth: false });
    }
  },

  // Register
  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      if (res.data.success) {
        const { token, user } = res.data;
        localStorage.setItem('syncspace_token', token);
        localStorage.setItem('syncspace_user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, isLoading: false });
        toast.success(`Welcome to SyncSpace, ${user.name}! 🚀`);
        return true;
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      set({ isLoading: false });
      return false;
    }
  },

  // Login
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data.success) {
        const { token, user } = res.data;
        localStorage.setItem('syncspace_token', token);
        localStorage.setItem('syncspace_user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, isLoading: false });
        toast.success(`Welcome back, ${user.name}! 👋`);
        return true;
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      toast.error(msg);
      set({ isLoading: false });
      return false;
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // Proceed with local logout regardless
    }
    localStorage.removeItem('syncspace_token');
    localStorage.removeItem('syncspace_user');
    set({ user: null, token: null, isAuthenticated: false });
    toast.success('Logged out successfully');
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      const res = await api.put('/api/auth/profile', data);
      if (res.data.success) {
        const updated = res.data.user;
        set({ user: updated });
        localStorage.setItem('syncspace_user', JSON.stringify(updated));
        toast.success('Profile updated!');
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
      return false;
    }
  },
}));
