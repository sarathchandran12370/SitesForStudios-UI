import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const refresh = useCallback(async () => {
    try {
      const { user } = await api('/auth/me');
      setUser(user);
      return user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);
  useEffect(() => {
    refresh();
    const onBlocked = () => refresh();
    window.addEventListener('sfs:org-blocked', onBlocked);
    return () => window.removeEventListener('sfs:org-blocked', onBlocked);
  }, [refresh]);

  const login = async (email, password) => {
    const { user } = await api('/auth/login', { method: 'POST', body: { email, password } });
    setUser(user);
    return user;
  };
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  };
  return <AuthCtx.Provider value={{ user, login, logout, refresh }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/** Where to send someone after they log out: clients go back to their studio's branded login. */
export const loginPathFor = (user) => (user?.role === 'client' && user.studio_slug ? `/login?studio=${encodeURIComponent(user.studio_slug)}` : '/login');

/** Suspended or cancelled organizations lose access (Super Admin never does). */
export const isOrgBlocked = (user) => !!user && user.role !== 'super_admin' && ['suspended', 'cancelled'].includes(user.org_status);

export function homeFor(user) {
  if (!user) return '/login';
  if (user.must_change_password) return '/change-password';
  switch (user.role) {
    case 'super_admin':
      return '/admin';
    case 'org_admin':
      // One-studio organizations only see their Studio dashboard until they move to a multi-studio plan.
      return user.org_mode === 'single' && user.home_studio_id ? `/studio/${user.home_studio_id}` : '/org';
    case 'studio_admin':
    case 'staff':
      return `/studio/${user.studio_id}`;
    default:
      return '/portal';
  }
}
