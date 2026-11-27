import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../auth.jsx';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export default function PortalTop({ title }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isManager = user && user.role !== 'client';
  const name = title || user?.studio_name || 'My photos';
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="portal-top">
      <Link to="/portal" className="pt-studio">
        <span className="pt-mono" aria-hidden="true">{initials(name)}</span>
        <span className="studio">{name}</span>
      </Link>
      <nav className="pt-nav" aria-label="Portal">
        {isManager && <Link className="btn sm" to={homeFor(user)}>Studio dashboard</Link>}
        {!isManager && <NavLink to="/portal" className={() => (pathname.startsWith('/portal/invoices') ? '' : 'active')}>My photos</NavLink>}
        {!isManager && <NavLink to="/portal/invoices">Invoices</NavLink>}
      </nav>
      <div className="pt-account" ref={menuRef}>
        <button type="button" className="pt-avatar" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen(!open)}>
          {initials(user?.name)}
        </button>
        {open && (
          <div className="pt-menu" role="menu">
            {user && (
              <div className="pt-menu-who">
                <b>{user.name}</b>
                <span>{user.email}</span>
              </div>
            )}
            <Link role="menuitem" to="/change-password">Change password</Link>
            <Link role="menuitem" to="/privacy">Privacy</Link>
            <button role="menuitem" type="button" onClick={async () => { await logout(); nav('/login'); }}>Log out</button>
          </div>
        )}
      </div>
    </header>
  );
}
