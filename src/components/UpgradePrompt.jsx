import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

/** Shown where a feature is not part of the current plan (e.g. client galleries on the Website plan). */
export default function UpgradePrompt({ title = 'Client galleries are not in your plan', children }) {
  const { user } = useAuth();
  const owner = user?.role === 'org_admin';
  return (
    <div className="card stack" style={{ background: 'var(--accent-soft)', borderColor: '#e2cdb3' }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p className="muted" style={{ margin: 0 }}>
        {children ||
          'The Website plan includes your studio website, enquiries, custom domain and portfolio. Upgrade to Starter or above to add client logins, online galleries, full-resolution downloads and face search.'}
      </p>
      <div>
        {owner ? (
          <Link className="btn accent" to="/org/billing">See plans and upgrade</Link>
        ) : (
          <span className="small muted">Ask your organization owner to upgrade the plan.</span>
        )}
      </div>
    </div>
  );
}
