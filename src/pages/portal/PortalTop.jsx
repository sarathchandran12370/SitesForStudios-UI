import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../auth.jsx';

export default function PortalTop({ title }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const isManager = user && user.role !== 'client';
  return (
    <header className="portal-top">
      <Link to="/portal" className="studio" style={{ textDecoration: 'none' }}>{title || user?.studio_name || 'My photos'}</Link>
      <div className="row">
        {isManager && <Link className="btn sm" to={homeFor(user)}>Studio dashboard</Link>}
        <Link className="btn sm ghost" to="/change-password">Change password</Link>
        <button className="btn sm" onClick={async () => { await logout(); nav('/login'); }}>Log out</button>
      </div>
    </header>
  );
}
