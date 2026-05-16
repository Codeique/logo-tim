import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'logotim-auth',
      // Never persist the access token — it lives in memory only.
      // The HttpOnly refresh-token cookie is what survives browser restarts.
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useAuthStore;
