import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

const daysUntil = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 86400000));
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const ICONS = {
  platform: 'M3 12h4l3-8 4 16 3-8h4',
  org: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6',
  billing: 'M3 6h18v12H3zM3 10h18M7 15h3',
};
function Icon({ name }) {
  return (
    <svg className="nav-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

/** Trial days left, or "trial ended" with the grace period. Owners get a link to billing. */
function TrialBanner({ user }) {
  const owner = user.role === 'org_admin';
  const link = owner ? <> <a href="/org/billing">Choose a plan</a></> : ' Ask your organization owner to choose a plan.';
  if (user.org_status === 'trial' && user.trial_ends_at) {
    const left = daysUntil(user.trial_ends_at);
    return (
      <div className={`notice ${left <= 3 ? 'warn' : 'accent'}`}>
        <b>Free trial: {left} day{left === 1 ? '' : 's'} left</b> (ends {fmtDay(user.trial_ends_at)}).{link}
      </div>
    );
  }
  if (user.org_status === 'expired') {
    return (
      <div className="notice bad">
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
  const { pathname } = useLocation();
  const [studios, setStudios] = useState([]);
  // On phones the sidebar is a slide-in drawer. It closes on navigation and on Escape.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    api('/studios/mine').then(setStudios).catch(() => {});
  }, []);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  return (
    <div className={menuOpen ? 'shell menu-open' : 'shell'}>
      <header className="topbar">
        <a className="brand" href="/"><i />SitesForStudios</a>
        <button
          type="button"
          className="menu-btn"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="app-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span aria-hidden="true" />
        </button>
      </header>
      {menuOpen && <div className="side-back" onClick={() => setMenuOpen(false)} />}
      <aside className="side" id="app-nav">
        <a className="brand" href="/"><i />SitesForStudios</a>
        {user.role === 'super_admin' && <NavLink className="nav" to="/admin"><Icon name="platform" />Platform</NavLink>}
        {user.role === 'org_admin' && user.org_mode !== 'single' && <NavLink className="nav" to="/org" end><Icon name="org" />Organization</NavLink>}
        {user.role === 'org_admin' && <NavLink className="nav" to="/org/billing"><Icon name="billing" />Plan &amp; billing</NavLink>}
        {studios.length > 0 && <div className="label">Studios</div>}
        {studios.slice(0, 12).map((s) => (
          <NavLink key={s.id} className="nav" to={`/studio/${s.id}`}>
            <span className="nav-mono" aria-hidden="true">{initials(s.name)}</span>
            <span className="nav-txt">{s.name}</span>
          </NavLink>
        ))}
        <div className="foot">
          <div className="foot-user">
            <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="foot-name">{user.name}</div>
              <div className="foot-email">{user.email}</div>
            </div>
          </div>
          <div className="foot-actions">
            <button onClick={() => nav('/change-password')}>Password</button>
            <button onClick={async () => { await logout(); nav('/login'); }}>Log out</button>
          </div>
        </div>
      </aside>
      <main className="main">
        <TrialBanner user={user} />
        {user.org_status === 'past_due' && (
          <div className="notice warn">
            <b>Payment overdue.</b> Your subscription payment did not go through. Update your payment to avoid your account being suspended.
            {user.role === 'org_admin' && <> <a href="/org/billing">Open billing</a></>}
          </div>
        )}
        <Outlet context={{ studios, reloadStudios: () => api('/studios/mine').then(setStudios) }} />
      </main>
    </div>
  );
}
