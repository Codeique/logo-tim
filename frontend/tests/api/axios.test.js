import { beforeEach, describe, it, expect, vi } from 'vitest';

// vi.hoisted runs before vi.mock factories, making these available inside them
const mocks = vi.hoisted(() => ({
  getState: vi.fn(),
  setAuth: vi.fn(),
  logout: vi.fn(),
  axiosPost: vi.fn(),
}));

vi.mock('../../src/store/authStore', () => ({
  default: { getState: mocks.getState },
}));

// Keep axios.create() working; only replace axios.post (used for token refresh)
vi.mock('axios', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    default: { ...mod.default, post: mocks.axiosPost },
  };
});

import api from '../../src/api/axios';

// ─── request interceptor ──────────────────────────────────────────────────────

describe('request interceptor', () => {
  let handler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = api.interceptors.request.handlers.find(Boolean)?.fulfilled;
  });

  it('attaches Authorization header when accessToken is present', () => {
    mocks.getState.mockReturnValue({ accessToken: 'my-token' });
    const config = { headers: {} };
    const result = handler(config);
    expect(result.headers.Authorization).toBe('Bearer my-token');
  });

  it('does not add Authorization header when accessToken is null', () => {
    mocks.getState.mockReturnValue({ accessToken: null });
    const config = { headers: {} };
    const result = handler(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('does not add Authorization header when accessToken is empty string', () => {
    mocks.getState.mockReturnValue({ accessToken: '' });
    const config = { headers: {} };
    const result = handler(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('returns the same config object (mutates in place)', () => {
    mocks.getState.mockReturnValue({ accessToken: null });
    const config = { headers: {}, url: '/test' };
    expect(handler(config)).toBe(config);
  });
});

// ─── response interceptor ─────────────────────────────────────────────────────

describe('response interceptor', () => {
  let errorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler = api.interceptors.response.handlers.find(Boolean)?.rejected;
  });

  it('passes non-401 errors through as rejections', async () => {
    const error = { response: { status: 500 }, config: {} };
    await expect(errorHandler(error)).rejects.toEqual(error);
  });

  it('passes network errors (no response) through as rejections', async () => {
    const error = { config: {} };
    await expect(errorHandler(error)).rejects.toEqual(error);
  });

  it('does not retry a request already marked _retry: true', async () => {
    const error = { response: { status: 401 }, config: { _retry: true } };
    await expect(errorHandler(error)).rejects.toEqual(error);
  });

  it('calls logout and rejects with original error when token refresh fails', async () => {
    mocks.axiosPost.mockRejectedValue(new Error('Network error'));
    mocks.getState.mockReturnValue({ logout: mocks.logout });

    const error = {
      response: { status: 401 },
      config: { _retry: false, headers: {} },
    };

    await expect(errorHandler(error)).rejects.toEqual(error);
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it('calls setAuth and updates Authorization header after successful refresh', async () => {
    const newUser = { id: 1, role: 'ADMIN' };
    const newToken = 'new-access-token';
    mocks.axiosPost.mockResolvedValue({ data: { user: newUser, accessToken: newToken } });
    mocks.getState.mockReturnValue({ setAuth: mocks.setAuth, logout: mocks.logout });

    const originalConfig = { _retry: false, headers: {} };
    const error = { response: { status: 401 }, config: originalConfig };

    // The retry hits the network in jsdom — swallow that failure and assert side effects
    await errorHandler(error).catch(() => {});

    expect(mocks.axiosPost).toHaveBeenCalledWith(
      '/api/auth/refresh',
      {},
      { withCredentials: true }
    );
    expect(mocks.setAuth).toHaveBeenCalledWith(newUser, newToken);
    expect(originalConfig.headers.Authorization).toBe(`Bearer ${newToken}`);
  });

  it('marks the config as _retry: true to prevent infinite loops', async () => {
    mocks.axiosPost.mockRejectedValue(new Error('fail'));
    mocks.getState.mockReturnValue({ logout: mocks.logout });

    const config = { _retry: false, headers: {} };
    const error = { response: { status: 401 }, config };

    await errorHandler(error).catch(() => {});

    expect(config._retry).toBe(true);
  });
});
