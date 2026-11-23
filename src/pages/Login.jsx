import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      nav(u.must_change_password ? '/change-password' : loc.state?.from || homeFor(u), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-page" style={{ background: 'linear-gradient(160deg,#f4ebe1,#faf8f5 60%)' }}>
      <form className="card stack" style={{ width: 'min(400px,100%)', padding: 32 }} onSubmit={submit}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Welcome back</h1>
          <p className="muted" style={{ margin: 0 }}>Log in to your studio or to see your photos.</p>
        </div>
        <label className="field">Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="small muted" style={{ margin: 0 }}>Forgot your password? Ask your photographer to reset it for you. Accounts are created by your studio.</p>
        <p className="small muted" style={{ margin: 0 }}>Photographer or studio? <Link to="/signup">Start a free trial</Link></p>
      </form>
    </div>
  );
}
