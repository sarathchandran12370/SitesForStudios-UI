import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [studios, setStudios] = useState([]);
  useEffect(() => {
    api('/studios/mine').then(setStudios).catch(() => {});
  }, []);
  return (
    <div className="shell">
      <aside className="side">
        <a className="brand" href="/"><i />SitesForStudios</a>
        {user.role === 'super_admin' && <NavLink className="nav" to="/admin">Platform</NavLink>}
        {user.role === 'org_admin' && <NavLink className="nav" to="/org">Organization</NavLink>}
        {studios.length > 0 && <div className="label">Studios</div>}
        {studios.slice(0, 12).map((s) => (
          <NavLink key={s.id} className="nav" to={`/studio/${s.id}`}>{s.name}</NavLink>
        ))}
        <div className="foot">
          <div>{user.name}</div>
          <div className="small">{user.email}</div>
          <div className="row" style={{ marginTop: 8, gap: 10 }}>
            <button onClick={() => nav('/change-password')}>Password</button>
            <button onClick={async () => { await logout(); nav('/login'); }}>Log out</button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet context={{ studios, reloadStudios: () => api('/studios/mine').then(setStudios) }} />
      </main>
    </div>
  );
}
