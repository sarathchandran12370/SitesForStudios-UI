import { useState } from 'react';
import { Link } from 'react-router-dom';
import { inr } from '../api.js';

const DEMO = '/s/arjun-photography';

const plans = [
  { name: 'Website', price: 999, blurb: 'Just the website', points: ['Studio website with templates', 'Enquiry inbox and alerts', 'Your own domain', '25 GB portfolio'] },
  { name: 'Starter', price: 2999, blurb: 'Website and galleries', points: ['1 studio website', '1 TB storage', 'Client galleries and downloads', '2 staff seats'] },
  { name: 'Pro', price: 5999, blurb: 'For busy wedding seasons', points: ['All premium templates', '2 TB storage', 'RAW delivery', '5 staff seats'], featured: true },
  { name: 'Organization', price: 13999, blurb: 'Several studio brands', points: ['Up to 3 studio brands', '5 TB storage', 'Priority support', '15 staff seats'] },
];

const features = [
  { icon: '◐', title: 'A website that looks like your work', text: 'Premium templates made for wedding studios, with your portfolio, reviews and your own domain.' },
  { icon: '✉', title: 'Never miss an enquiry', text: 'Every enquiry lands in one inbox with alerts, so couples hear back from you while they are still deciding.' },
  { icon: '▦', title: 'Galleries couples love', text: 'Full-resolution and RAW downloads, favourites, comments and share links for family and guests.' },
  { icon: '◷', title: 'Bookings and invoices', text: 'A calendar for every shoot date, and invoices your clients can open from a link.' },
  { icon: '★', title: 'Reviews that sell for you', text: 'Couples leave a review from their gallery, and the best ones show up on your website.' },
  { icon: '⚇', title: 'Your whole team', text: 'Give staff their own logins. Run more than one studio brand from a single organization.' },
];

const steps = [
  { n: '01', title: 'Pick a template', text: 'Add your logo, portfolio and packages. Your site is live in an afternoon.' },
  { n: '02', title: 'Take enquiries', text: 'Couples find you, enquire, and you turn them into bookings on your calendar.' },
  { n: '03', title: 'Deliver the photos', text: 'Upload the event, send the couple their login, and let them download everything.' },
];

const templates = [
  { id: 'editorial', name: 'Editorial', bg: 'linear-gradient(160deg,#efe7dc,#c9b49a)', ink: '#2a2420', font: "'Cormorant Garamond', serif" },
  { id: 'luxe', name: 'Luxe', bg: 'linear-gradient(160deg,#1d1a18,#4a3b2c)', ink: '#e9d3a8', font: "'Cinzel', serif" },
  { id: 'cinematic', name: 'Cinematic', bg: 'linear-gradient(160deg,#0f1418,#3a4a52)', ink: '#f2f2f2', font: "'Space Grotesk', sans-serif" },
  { id: 'boho', name: 'Boho', bg: 'linear-gradient(160deg,#f3e6d6,#d4a383)', ink: '#5b3a28', font: "'Caveat', cursive" },
  { id: 'indian', name: 'Indian Traditional', bg: 'linear-gradient(160deg,#7a1a1a,#c2872f)', ink: '#fbe9c4', font: "'Marcellus', serif" },
  { id: 'grid', name: 'Grid', bg: 'linear-gradient(160deg,#fafafa,#d8d8d8)', ink: '#111', font: "'DM Serif Display', serif" },
];

const faqs = [
  { q: 'Do I need a card to start the trial?', a: 'No. You get 14 days free with every feature of the plan you pick. Add payment only when you decide to stay.' },
  { q: 'Can I use my own domain?', a: 'Yes. Connect a domain you already own, such as yourstudio.in, from your dashboard.' },
  { q: 'How do couples get their photos?', a: 'You create a login for the couple from your dashboard. They open their private gallery, mark favourites and download in full resolution, or in RAW on the Pro plan.' },
  { q: 'What happens to galleries after the wedding?', a: 'Galleries stay online for as long as you subscribe and stay within your plan storage. There is no forced archiving.' },
  { q: 'How do I pay?', a: 'Monthly, in rupees, through Razorpay. You can change or cancel your plan at any time.' },
];

// Warm placeholder "photos" for the hero gallery mock-up.
const tiles = ['#c9a27e,#7c4a2d', '#e8d5c0,#b08867', '#8c6b52,#3d2a1f', '#d9b99b,#a2714c', '#efe2d2,#c4a07f', '#6e4a35,#2a1b13', '#b9916f,#5e3c26', '#e3cbb1,#9b7353'];

export default function Landing() {
  return (
    <div className="mk">
      <header className="mk-nav">
        <div className="mk-wrap mk-nav-in">
          <Link to="/" className="brand mk-brand"><i />SitesForStudios</Link>
          <nav className="mk-links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#templates">Templates</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="row mk-nav-cta">
            <Link className="btn ghost" to="/login">Log in</Link>
            <Link className="btn primary" to="/signup">Start free trial</Link>
          </div>
        </div>
      </header>

      <section className="mk-hero">
        <div className="mk-wrap mk-hero-in">
          <div>
            <p className="mk-eyebrow">For wedding photographers and studios</p>
            <h1 className="mk-h1">Your studio website and client galleries, <em>in one place.</em></h1>
            <p className="mk-lead">
              Pick a premium template, take enquiries, and deliver full-resolution and RAW photos to couples, all from one dashboard.
            </p>
            <div className="row mk-hero-cta">
              <Link className="btn accent lg" to="/signup">Start your 14-day free trial</Link>
              <Link className="btn lg" to={DEMO}>View demo studio →</Link>
            </div>
            <p className="small muted mk-fine">No card needed · Cancel any time · Pay in ₹ with Razorpay</p>
          </div>

          <div className="mk-mock" aria-hidden="true">
            <div className="mk-mock-bar"><span /><span /><span /><b>anjali-rahul · gallery</b></div>
            <div className="mk-mock-hero">
              <div>
                <div className="mk-mock-title">Anjali & Rahul</div>
                <div className="mk-mock-sub">Haldi · Wedding · Reception</div>
              </div>
            </div>
            <div className="mk-mock-grid">
              {tiles.map((t, i) => <i key={i} style={{ background: `linear-gradient(135deg,${t})` }}>{i === 1 && <span className="mk-heart">♥</span>}</i>)}
            </div>
            <div className="mk-mock-pill">⬇ Download all · 1,248 photos</div>
          </div>
        </div>
      </section>

      <section id="features" className="mk-section">
        <div className="mk-wrap">
          <div className="mk-head">
            <p className="mk-eyebrow">Everything a studio runs on</p>
            <h2 className="mk-h2">From the first enquiry to the last download</h2>
          </div>
          <div className="mk-features">
            {features.map((f) => (
              <div key={f.title} className="mk-feature">
                <span className="mk-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p className="muted">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section mk-band">
        <div className="mk-wrap">
          <div className="mk-head">
            <p className="mk-eyebrow">How it works</p>
            <h2 className="mk-h2">Set up once. Use it every wedding.</h2>
          </div>
          <ol className="mk-steps">
            {steps.map((s) => (
              <li key={s.n}>
                <span className="mk-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="templates" className="mk-section">
        <div className="mk-wrap">
          <div className="mk-head row between">
            <div>
              <p className="mk-eyebrow">Templates</p>
              <h2 className="mk-h2">Six looks, one set of content</h2>
              <p className="muted" style={{ margin: 0, maxWidth: 520 }}>Switch templates any time. Your portfolio, reviews and packages come with you.</p>
            </div>
            <Link className="btn" to={DEMO}>See a live demo site →</Link>
          </div>
          <div className="mk-templates">
            {templates.map((t) => (
              <div key={t.id} className="mk-template" style={{ background: t.bg, color: t.ink }}>
                <span style={{ fontFamily: t.font }}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mk-section mk-band">
        <div className="mk-wrap">
          <div className="mk-head" style={{ textAlign: 'center' }}>
            <p className="mk-eyebrow">Pricing</p>
            <h2 className="mk-h2">Simple monthly plans</h2>
            <p className="muted" style={{ margin: '0 auto', maxWidth: 480 }}>Every plan starts with a 14-day free trial. Change or cancel any time.</p>
          </div>
          <div className="mk-plans">
            {plans.map((p) => (
              <div key={p.name} className={`mk-plan${p.featured ? ' featured' : ''}`}>
                {p.featured && <span className="mk-plan-tag">Most popular</span>}
                <h3>{p.name}</h3>
                <p className="small muted" style={{ margin: 0 }}>{p.blurb}</p>
                <div className="mk-price">{inr(p.price)}<span className="small muted"> / month</span></div>
                <ul className="mk-checks">{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
                <Link className={`btn ${p.featured ? 'accent' : ''}`} to="/signup">Start free trial</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mk-section">
        <div className="mk-wrap mk-faq-wrap">
          <div>
            <p className="mk-eyebrow">FAQ</p>
            <h2 className="mk-h2">Questions studios ask</h2>
          </div>
          <div className="mk-faq">{faqs.map((f) => <Faq key={f.q} {...f} />)}</div>
        </div>
      </section>

      <section className="mk-cta">
        <div className="mk-wrap">
          <h2 className="mk-h2">Ready for this wedding season?</h2>
          <p>Set up your website and first gallery today. Free for 14 days.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn accent lg" to="/signup">Start your free trial</Link>
            <Link className="btn lg mk-cta-ghost" to={DEMO}>View demo studio</Link>
          </div>
        </div>
      </section>

      <footer className="mk-foot">
        <div className="mk-wrap row between small muted">
          <span>© {new Date().getFullYear()} SitesForStudios</span>
          <span><Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link> · <Link to="/login">Log in</Link></span>
        </div>
      </footer>
    </div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`mk-faq-item${open ? ' open' : ''}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{q}</span><span className="mk-plus" aria-hidden="true">+</span>
      </button>
      {open && <p className="muted">{a}</p>}
    </div>
  );
}
