import { useNavigate } from 'react-router-dom';
import { useAuth, loginPathFor } from '../auth.jsx';

// Shown when the user's organization is suspended or cancelled.
export default function AccountBlocked() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const cancelled = user?.org_status === 'cancelled';
  return (
    <div className="center-page">
      <div className="card stack" style={{ width: 'min(460px,100%)', padding: 32 }}>
        <h1 style={{ margin: 0 }}>{cancelled ? 'Account closed' : 'Account suspended'}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {user?.role === 'client'
            ? `Your photos from ${user.studio_name || 'your studio'} are not available right now. Please contact your photographer.`
            : `${user?.org_name || 'This organization'} is ${cancelled ? 'closed' : 'suspended'}, so dashboards, client galleries and websites are offline. Please contact SitesForStudios support to restore access.`}
        </p>
        <div><button className="btn" onClick={async () => { const to = loginPathFor(user); await logout(); nav(to); }}>Log out</button></div>
      </div>
    </div>
  );
}
