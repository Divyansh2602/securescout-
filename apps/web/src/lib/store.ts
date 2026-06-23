import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { api } from './api';

interface User {
  id: string; email: string; name: string; role: string; orgId: string;
}

interface RegisterInput {
  email: string; password: string; name: string; orgName: string;
}

interface AuthState {
  user:     User | null;
  isAuth:   boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout:   () => Promise<void>;
  setUser:  (u: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:   null,
      isAuth: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        const { accessToken, refreshToken, user } = data.data;
        Cookies.set('access_token',  accessToken,  { secure: true, sameSite: 'strict', expires: 1/96 });
        Cookies.set('refresh_token', refreshToken, { secure: true, sameSite: 'strict', expires: 7    });
        set({ user, isAuth: true });
      },

      // Registration returns no tokens, so log in immediately afterward.
      register: async ({ email, password, name, orgName }) => {
        await api.post('/auth/register', { email, password, name, orgName });
        await get().login(email, password);
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch {}
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        set({ user: null, isAuth: false });
        window.location.href = '/auth/login';
      },

      setUser: (user) => set({ user, isAuth: true }),
    }),
    { name: 'auth', partialize: (s) => ({ user: s.user, isAuth: s.isAuth }) }
  )
);
