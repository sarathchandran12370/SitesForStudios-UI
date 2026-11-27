import { Link } from 'react-router-dom';

/** Split layout for login and sign-up: brand panel on the left (hidden on phones), form on the right. */
export default function AuthLayout({ quote, points = [], wide = false, children }) {
  return (
    <div className="auth">
      <aside className="auth-art">
        <Link to="/" className="brand"><i />SitesForStudios</Link>
        <div>
          <p className="auth-quote">{quote}</p>
          {points.length > 0 && <ul className="auth-points">{points.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      </aside>
      <main className="auth-main">
        <div className={`auth-card${wide ? ' wide' : ''}`}>
          <Link to="/" className="brand auth-mobile-brand"><i />SitesForStudios</Link>
          {children}
        </div>
      </main>
    </div>
  );
}
