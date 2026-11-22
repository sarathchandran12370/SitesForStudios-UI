import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const refresh = useCallback(async () => {
    try {
      const { user } = await api('/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    }
  }, []);
  useEffect(() => {
    refresh();
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

export function homeFor(user) {
  if (!user) return '/login';
  if (user.must_change_password) return '/change-password';
  switch (user.role) {
    case 'super_admin':
      return '/admin';
    case 'org_admin':
      return '/org';
    case 'studio_admin':
    case 'staff':
      return `/studio/${user.studio_id}`;
    default:
      return '/portal';
  }
}
