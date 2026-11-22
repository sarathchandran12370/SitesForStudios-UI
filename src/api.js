export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, headers, raw } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: raw ? headers : { 'Content-Type': 'application/json', ...headers },
    body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) {
    // The organization was suspended while this user was logged in: let the app show the notice.
    if (data?.code === 'ORG_BLOCKED') window.dispatchEvent(new CustomEvent('sfs:org-blocked'));
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const fmtBytes = (n = 0) => {
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do {
    n /= 1024;
    i++;
  } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${u[i]}`;
};

export const fmtDate = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
