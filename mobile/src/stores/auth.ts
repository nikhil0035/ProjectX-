import { create } from "zustand";

import { api } from "@/api/client";
import { clearToken, getToken, saveToken } from "@/lib/authStorage";

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  email: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  loading: true,
  authenticated: false,
  email: null,

  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ loading: false, authenticated: false });
      return;
    }
    try {
      const me = await api.auth.me();
      set({ loading: false, authenticated: true, email: me.email });
    } catch {
      await clearToken();
      set({ loading: false, authenticated: false });
    }
  },

  login: async (email, password) => {
    const { access_token } = await api.auth.login({ email, password });
    await saveToken(access_token);
    const me = await api.auth.me();
    set({ authenticated: true, email: me.email });
  },

  register: async (email, password, displayName) => {
    const { access_token } = await api.auth.register({
      email,
      password,
      display_name: displayName,
    });
    await saveToken(access_token);
    set({ authenticated: true, email });
  },

  logout: async () => {
    await clearToken();
    set({ authenticated: false, email: null });
  },
}));
