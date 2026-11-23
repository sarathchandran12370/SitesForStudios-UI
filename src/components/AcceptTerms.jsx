import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

/** Shown once to anyone who has not accepted the current Terms of Service and Privacy Policy. */
export default function AcceptTerms() {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const updated = !!user.terms_version;

  const accept = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/accept-terms', { method: 'POST', body: { version: user.terms_current_version } });
      await refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="center-page">
      <form className="card stack" style={{ width: 'min(480px,100%)', padding: 32 }} onSubmit={accept}>
        <h1 style={{ margin: 0 }}>{updated ? 'Our terms have changed' : 'Before you continue'}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {updated
            ? 'We have updated our Terms of Service and Privacy Policy. Please read and accept them to continue.'
            : 'Please read and accept our Terms of Service and Privacy Policy. They explain how your photos and personal data are handled.'}
        </p>
        <label className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ marginTop: 4 }} />
          <span>
            I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>.
          </span>
        </label>
        {error && <div className="error">{error}</div>}
        <div className="row between">
          <button type="button" className="btn ghost" onClick={async () => { await logout(); nav('/login'); }}>Log out</button>
          <button className="btn primary" disabled={!checked || busy}>{busy ? 'Saving…' : 'Accept and continue'}</button>
        </div>
      </form>
    </div>
  );
}
