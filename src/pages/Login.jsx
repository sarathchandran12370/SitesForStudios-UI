import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { PasswordInput } from '../components/ui.jsx';

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
    <AuthLayout quote="Every wedding you shoot, beautifully delivered." points={['Your studio dashboard', 'Private galleries for couples', 'Full-resolution downloads']}>
      <form className="stack" onSubmit={submit}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Welcome back</h1>
          <p className="muted" style={{ margin: 0 }}>Log in to your studio or to see your photos.</p>
        </div>
        <label className="field">Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Password<PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="small muted" style={{ margin: 0 }}>Forgot your password? Ask your photographer to reset it for you. Accounts are created by your studio.</p>
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '4px 0' }} />
        <p className="small muted" style={{ margin: 0 }}>Photographer or studio? <Link to="/signup">Start a free trial</Link></p>
        <p className="small muted" style={{ margin: 0 }}><Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link></p>
      </form>
    </AuthLayout>
  );
}
