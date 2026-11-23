import { Link } from 'react-router-dom';
import { inr } from '../api.js';

const plans = [
  { name: 'Website', price: 999, points: ['Studio website with templates', 'Enquiry inbox and alerts', 'Your own domain', '10 GB portfolio'] },
  { name: 'Starter', price: 3499, points: ['1 studio website', '500 GB storage', 'Face search on 3 events a month', '4 templates'] },
  { name: 'Pro', price: 6999, points: ['All premium templates', '1.5 TB storage', 'RAW delivery', 'Face search on 8 events a month'], featured: true },
  { name: 'Organization', price: 14999, points: ['Up to 3 studio brands', '4 TB storage', 'White label', '10 staff seats'] },
];

export default function Landing() {
  return (
    <div style={{ background: '#faf8f5' }}>
      <header className="row between" style={{ padding: '18px 24px', maxWidth: 1140, margin: '0 auto' }}>
        <div className="brand" style={{ color: 'var(--ink)', padding: 0 }}><i />SitesForStudios</div>
        <div className="row">
          <Link className="btn ghost" to="/s/arjun-photography">See a demo site</Link>
          <Link className="btn" to="/login">Log in</Link>
          <Link className="btn primary" to="/signup">Start free trial</Link>
        </div>
      </header>
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '64px 24px 40px', display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', alignItems: 'center' }}>
        <div>
          <p className="badge accent">For wedding photographers and studios</p>
          <h1 style={{ fontSize: 'clamp(40px,6vw,64px)', lineHeight: 1.02, margin: '14px 0' }}>Your studio website and client galleries, in one place.</h1>
          <p className="muted" style={{ fontSize: 18, maxWidth: 520 }}>
            Pick a premium template, take enquiries, and deliver full-resolution and RAW photos to couples. Guests find themselves with face search.
          </p>
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn accent" to="/signup">Start your 14-day free trial</Link>
            <Link className="btn" to="/s/arjun-photography">View demo studio</Link>
          </div>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden', aspectRatio: '4/3', background: 'linear-gradient(135deg,#d9b99b,#7c4a2d)', display: 'grid', placeItems: 'end start' }}>
          <div style={{ padding: 28, color: '#fff' }}>
            <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 34 }}>Anjali & Rahul</div>
            <div style={{ opacity: 0.85 }}>16 photos · Haldi · Wedding · Reception</div>
          </div>
        </div>
      </section>
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '24px 24px 80px' }}>
        <h2>Simple monthly plans</h2>
        <div className="grid2" style={{ marginTop: 16 }}>
          {plans.map((p) => (
            <div key={p.name} className="card" style={p.featured ? { borderColor: 'var(--accent)' } : undefined}>
              <h3>{p.name}</h3>
              <div style={{ fontSize: 30, fontFamily: 'Cormorant Garamond', fontWeight: 600 }}>{inr(p.price)}<span className="small muted"> / month</span></div>
              <ul className="muted" style={{ paddingLeft: 18 }}>{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
      <footer style={{ maxWidth: 1140, margin: '0 auto', padding: '24px', borderTop: '1px solid var(--line)' }} className="row between small muted">
        <span>© {new Date().getFullYear()} SitesForStudios</span>
        <span><Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link></span>
      </footer>
    </div>
  );
}
