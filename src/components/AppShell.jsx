import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

const daysUntil = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 86400000));
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });

/** Trial days left, or "trial ended" with the grace period. Owners get a link to billing. */
function TrialBanner({ user }) {
  const owner = user.role === 'org_admin';
  const link = owner ? <> <a href="/org/billing">Choose a plan</a></> : ' Ask your organization owner to choose a plan.';
  if (user.org_status === 'trial' && user.trial_ends_at) {
    const left = daysUntil(user.trial_ends_at);
    return (
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px', background: left <= 3 ? '#f8ecd9' : 'var(--accent-soft)', borderColor: left <= 3 ? '#e8c990' : '#e2cdb3' }}>
        <b>Free trial: {left} day{left === 1 ? '' : 's'} left</b> (ends {fmtDay(user.trial_ends_at)}).{link}
      </div>
    );
  }
  if (user.org_status === 'expired') {
    return (
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px', background: '#f8e1df', borderColor: '#e9b4ae' }}>
        <b>Your free trial has ended.</b> The dashboard is read-only and uploads are paused.
        {user.grace_ends_at && <> Your website and client galleries stay online until {fmtDay(user.grace_ends_at)}.</>}{link}
      </div>
    );
  }
  return null;
}

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
        {user.role === 'org_admin' && user.org_mode !== 'single' && <NavLink className="nav" to="/org" end>Organization</NavLink>}
        {user.role === 'org_admin' && <NavLink className="nav" to="/org/billing">Plan &amp; billing</NavLink>}
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
        <TrialBanner user={user} />
        {user.org_status === 'past_due' && (
          <div className="card" style={{ background: '#f8ecd9', borderColor: '#e8c990', marginBottom: 16, padding: '12px 16px' }}>
            <b>Payment overdue.</b> Your subscription payment did not go through. Update your payment to avoid your account being suspended.
            {user.role === 'org_admin' && <> <a href="/org/billing">Open billing</a></>}
          </div>
        )}
        <Outlet context={{ studios, reloadStudios: () => api('/studios/mine').then(setStudios) }} />
      </main>
    </div>
  );
}
