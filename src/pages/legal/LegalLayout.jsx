import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL } from './details.js';

export default function LegalLayout({ title, children }) {
  useEffect(() => {
    document.title = `${title} | ${LEGAL.brand}`;
    window.scrollTo(0, 0);
  }, [title]);
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <header className="row between" style={{ padding: '18px 24px', maxWidth: 900, margin: '0 auto' }}>
        <Link className="brand" to="/" style={{ color: 'var(--ink)', padding: 0 }}><i />{LEGAL.brand}</Link>
        <nav className="row small">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </header>
      <main className="legal" style={{ maxWidth: 820, margin: '0 auto', padding: '8px 24px 80px', lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 40, marginBottom: 4 }}>{title}</h1>
        <p className="muted" style={{ marginTop: 0 }}>Effective {LEGAL.effectiveDate} · Version {LEGAL.VERSION}</p>
        {children}
      </main>
    </div>
  );
}
