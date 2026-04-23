import { describe, it, expect, beforeEach } from 'vitest';
import useAuthStore from '../../src/store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('starts with null user and null accessToken', () => {
    const { user, accessToken } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
  });

  describe('setAuth', () => {
    it('sets user and accessToken together', () => {
      const user = { id: 1, role: 'ADMIN', email: 'admin@example.com' };
      useAuthStore.getState().setAuth(user, 'access-token-xyz');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.accessToken).toBe('access-token-xyz');
    });

    it('overwrites a previous auth state', () => {
      useAuthStore.getState().setAuth({ id: 1 }, 'token-1');
      useAuthStore.getState().setAuth({ id: 2, role: 'THERAPIST' }, 'token-2');

      const state = useAuthStore.getState();
      expect(state.user).toEqual({ id: 2, role: 'THERAPIST' });
      expect(state.accessToken).toBe('token-2');
    });
  });

  describe('setAccessToken', () => {
    it('updates the token without touching user', () => {
      const user = { id: 5, role: 'PATIENT' };
      useAuthStore.setState({ user, accessToken: 'old-token' });

      useAuthStore.getState().setAccessToken('refreshed-token');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.accessToken).toBe('refreshed-token');
    });

    it('can set token while user is null', () => {
      useAuthStore.getState().setAccessToken('standalone-token');
      expect(useAuthStore.getState().accessToken).toBe('standalone-token');
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears both user and accessToken', () => {
      useAuthStore.setState({ user: { id: 3, role: 'THERAPIST' }, accessToken: 'some-token' });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('is idempotent when called on already-empty state', () => {
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });
  });
});
