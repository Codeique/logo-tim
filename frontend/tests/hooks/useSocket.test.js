import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSocket } from '../../src/hooks/useSocket';
import useAuthStore from '../../src/store/authStore';

// Hoist mock objects so they can be referenced inside vi.mock factories
const mocks = vi.hoisted(() => {
  const socketOn = vi.fn();
  const socketOff = vi.fn();
  const invalidateQueries = vi.fn();
  return {
    socketOn,
    socketOff,
    invalidateQueries,
    mockSocket: { on: socketOn, off: socketOff },
  };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mocks.mockSocket),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: mocks.invalidateQueries })),
}));

// Mock as a callable hook returning the auth state
vi.mock('../../src/store/authStore', () => ({
  default: vi.fn(() => ({ accessToken: 'test-token' })),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

const getHandler = (event) => {
  const call = mocks.socketOn.mock.calls.find(([e]) => e === event);
  expect(call).toBeDefined();
  return call[1];
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({ accessToken: 'test-token' });
  });

  it('does not register any listeners when accessToken is null', () => {
    vi.mocked(useAuthStore).mockReturnValue({ accessToken: null });
    renderHook(() => useSocket());
    expect(mocks.socketOn).not.toHaveBeenCalled();
  });

  it('registers exactly 8 event listeners when authenticated', () => {
    renderHook(() => useSocket());
    expect(mocks.socketOn).toHaveBeenCalledTimes(8);
  });

  it('registers all expected socket event names', () => {
    renderHook(() => useSocket());
    const events = mocks.socketOn.mock.calls.map(([e]) => e);
    const expected = [
      'patients:updated',
      'therapists:updated',
      'rooms:updated',
      'sessions:updated',
      'transactions:updated',
      'evaluations:updated',
      'militaryRequests:updated',
      'finance:updated',
    ];
    for (const event of expected) {
      expect(events).toContain(event);
    }
  });

  it('removes all 8 listeners on unmount', () => {
    const { unmount } = renderHook(() => useSocket());
    unmount();
    expect(mocks.socketOff).toHaveBeenCalledTimes(8);
  });

  it('removes the correct event names on unmount', () => {
    const { unmount } = renderHook(() => useSocket());
    unmount();
    const offEvents = mocks.socketOff.mock.calls.map(([e]) => e);
    expect(offEvents).toContain('patients:updated');
    expect(offEvents).toContain('sessions:updated');
    expect(offEvents).toContain('finance:updated');
  });

  // ─── per-event invalidation tests ────────────────────────────────────────

  it('invalidates patients and patient queries on patients:updated', () => {
    renderHook(() => useSocket());
    getHandler('patients:updated')();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['patients'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['patient'] });
  });

  it('invalidates therapists and therapist queries on therapists:updated', () => {
    renderHook(() => useSocket());
    getHandler('therapists:updated')();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['therapists'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['therapist'] });
  });

  it('invalidates rooms on rooms:updated', () => {
    renderHook(() => useSocket());
    getHandler('rooms:updated')();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['rooms'] });
  });

  it('invalidates sessions and calendar on sessions:updated', () => {
    renderHook(() => useSocket());
    getHandler('sessions:updated')();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['calendar'] });
  });

  it('invalidates transactions, patients, and patient on transactions:updated', () => {
    renderHook(() => useSocket());
    getHandler('transactions:updated')();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['patients'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['patient'] });
  });

  it('invalidates evaluations on evaluations:updated', () => {
    renderHook(() => useSocket());
    getHandler('evaluations:updated')();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['evaluations'] });
  });

  it('invalidates militaryRequests on militaryRequests:updated', () => {
    renderHook(() => useSocket());
    getHandler('militaryRequests:updated')();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['militaryRequests'] });
  });

  it('invalidates finance on finance:updated', () => {
    renderHook(() => useSocket());
    getHandler('finance:updated')();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['finance'] });
  });
});
