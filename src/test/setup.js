import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Replace fetch with a router: { 'POST /api/auth/login': [status, body] | (init) => [status, body] }. */
export function mockApi(routes) {
  const calls = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    const key = `${init.method || 'GET'} ${url}`;
    calls.push({ key, body: init.body ? JSON.parse(init.body) : undefined });
    const route = routes[key];
    if (!route) return new Response(JSON.stringify({ error: `no mock for ${key}` }), { status: 500, headers: { 'content-type': 'application/json' } });
    const [status, body] = typeof route === 'function' ? route(init) : route;
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}
