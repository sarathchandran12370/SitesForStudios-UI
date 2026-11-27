import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { PasswordInput } from '../components/ui.jsx';
import { studioContext, useStudioBrand } from '../components/studioBrand.js';
import { isAppHost } from '../hosts.js';

// Clients coming from a studio website (custom domain, or ?studio=<slug>) see that studio's
// branding and none of the platform's name or links.
export default function Login() {
  const { user, login, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [ctx] = useState(() => studioContext(loc.search));
  const brand = useStudioBrand(ctx);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onStudioDomain = !isAppHost(window.location.hostname);
  // Not while a login is being checked: a rejected account is logged straight back out below.
  if (user && !busy) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      // A studio's own domain only serves its client portal; the team uses the dashboard.
      if (onStudioDomain && (u.role !== 'client' || (brand && u.studio_slug && u.studio_slug !== brand.slug))) {
        await logout();
        setError(u.role !== 'client'
          ? 'This page is for clients. Studio team members, please log in from your studio dashboard.'
          : `This account is not a client of ${brand.name}. Please use the login link on your own photographer's website.`);
        return;
      }
      nav(u.must_change_password ? '/change-password' : loc.state?.from || homeFor(u), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // While a studio's branding loads, show no brand at all rather than flashing the platform's.
  const whiteLabel = !!ctx && (brand !== null || onStudioDomain);
  const studioName = brand?.name;
  const layout = whiteLabel
    ? { brand: brand || 'none', quote: studioName ? `Your photos from ${studioName}` : null, points: studioName ? ['Your private gallery', 'Favourites and album selection', 'Full-resolution downloads'] : [] }
    : { quote: 'Every wedding you shoot, beautifully delivered.', points: ['Your studio dashboard', 'Private galleries for couples', 'Full-resolution downloads'] };

  return (
    <AuthLayout {...layout}>
      <form className="stack" onSubmit={submit}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{whiteLabel ? 'Client login' : 'Welcome back'}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {whiteLabel ? `Log in to see your photos${studioName ? ` from ${studioName}` : ''}.` : 'Log in to your studio or to see your photos.'}
          </p>
        </div>
        <label className="field">Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Password<PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className={`btn ${whiteLabel ? 'accent' : 'primary'}`} disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        {whiteLabel ? (
          <p className="small muted" style={{ margin: 0 }}>
            Forgot your password? Ask {studioName || 'your photographer'} to reset it for you. Your login was created by the studio.
          </p>
        ) : (
          <>
            <p className="small muted" style={{ margin: 0 }}>Forgot your password? Ask your photographer to reset it for you. Accounts are created by your studio.</p>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '4px 0' }} />
            <p className="small muted" style={{ margin: 0 }}>Photographer or studio? <Link to="/signup">Start a free trial</Link></p>
            <p className="small muted" style={{ margin: 0 }}><Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link></p>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
