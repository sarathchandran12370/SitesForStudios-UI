import { describe, it, expect, vi } from 'vitest';
import { api, ApiError, fmtBytes, inr } from '../api.js';
import { mockApi } from './setup.js';

describe('api()', () => {
  it('returns JSON and sends JSON bodies', async () => {
    const calls = mockApi({ 'POST /api/things': [201, { ok: true }] });
    expect(await api('/things', { method: 'POST', body: { a: 1 } })).toEqual({ ok: true });
    expect(calls[0].body).toEqual({ a: 1 });
  });

  it('throws ApiError with the server message', async () => {
    mockApi({ 'GET /api/x': [402, { error: 'Upgrade your plan' }] });
    await expect(api('/x')).rejects.toMatchObject({ status: 402, message: 'Upgrade your plan' });
    await expect(api('/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('announces a suspended organization so the app can show the notice', async () => {
    mockApi({ 'GET /api/x': [403, { error: 'suspended', code: 'ORG_BLOCKED' }] });
    const listener = vi.fn();
    window.addEventListener('sfs:org-blocked', listener);
    await expect(api('/x')).rejects.toThrow();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('sfs:org-blocked', listener);
  });
});

describe('formatters', () => {
  it('formats bytes and rupees', () => {
    expect(fmtBytes(512)).toBe('512 B');
    expect(fmtBytes(1536)).toBe('1.5 KB');
    expect(fmtBytes(25 * 1024 ** 3)).toBe('25.0 GB');
    expect(inr(149990)).toBe('₹1,49,990');
  });
});
