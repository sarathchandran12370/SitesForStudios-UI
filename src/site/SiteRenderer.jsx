import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import './site.css';

const DEFAULT_SECTIONS = ['about', 'portfolio', 'packages', 'testimonials', 'faq', 'contact'].map((id) => ({ id, enabled: true }));

export default function SiteRenderer({ byHost }) {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [enquiry, setEnquiry] = useState(false);

  useEffect(() => {
    api(byHost ? `/sites-by-host/${encodeURIComponent(byHost)}` : `/sites/${slug}`).then(setData).catch((e) => setError(e.message));
  }, [slug, byHost]);

  useEffect(() => {
    if (!enquiry) return;
    const onKey = (e) => e.key === 'Escape' && setEnquiry(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enquiry]);

  useEffect(() => {
    if (!data) return;
    document.title = data.site.seo?.title || data.studio.name;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = data.site.seo?.description || '';
  }, [data]);

  if (error) return <div className="center-page"><div><h2>Site not found</h2><p className="muted">{error}</p></div></div>;
  if (!data) return <div className="center-page muted">Loading…</div>;

  const { studio, site, hero, portfolio, templateId } = data;
  const sections = (site.sections?.length ? site.sections : DEFAULT_SECTIONS).filter((s) => s.enabled);
  const has = (id) => sections.some((s) => s.id === id);
  const accent = site.theme?.accent || '#9a6b3c';
  const allPhotos = portfolio.flatMap((p) => p.photos);
  const loginPath = byHost ? '/login' : '/login';
  const navItems = [['about', 'About'], ['portfolio', 'Portfolio'], ['packages', 'Packages'], ['faq', 'FAQ'], ['contact', 'Contact']].filter(([id]) => has(id));

  return (
    <div className={`site tpl-${templateId} font-${site.theme?.fontPair || 'editorial'}`} style={{ '--accent': accent }}>
      {!studio.published && <div style={{ background: '#1c1917', color: '#fff', textAlign: 'center', fontSize: 13, padding: 6 }}>Preview — this website is not published yet.</div>}
      <header className="site-header">
        <div className="wrap">
          <a className="logo" href="#top">{site.logoUrl ? <img src={site.logoUrl} alt={studio.name} /> : studio.name}</a>
          <nav>{navItems.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <div className="actions">
            <Link className="login" to={loginPath}>Client login</Link>
            <button className="s-btn" onClick={() => setEnquiry(true)}>Book an enquiry</button>
          </div>
        </div>
      </header>

      <Hero images={hero} studio={studio} site={site} onEnquire={() => setEnquiry(true)} />

      {sections.map(({ id }) => {
        switch (id) {
          case 'about':
            return (
              <section key={id} id="about" className="s">
                <div className="wrap about-grid">
                  <div className="img" style={{ backgroundImage: allPhotos[1] ? `url(${allPhotos[1].web})` : undefined }} />
                  <div>
                    <div className="eyebrow">About us</div>
                    <h2 style={{ fontSize: 'clamp(34px,4vw,50px)', margin: '10px 0 18px' }}>{site.tagline || studio.name}</h2>
                    <p>{site.about || `${studio.name} photographs weddings with care and an eye for the moments in between.`}</p>
                    <button className="s-btn outline" onClick={() => setEnquiry(true)}>Check your date</button>
                  </div>
                </div>
              </section>
            );
          case 'portfolio':
            return portfolio.length ? (
              <section key={id} id="portfolio" className="s" style={{ paddingTop: 40 }}>
                <div className="wrap">
                  <div className="s-head"><div className="eyebrow">Portfolio</div><h2>Recent weddings</h2></div>
                  {portfolio.map((story) => (
                    <div key={story.id} className="portfolio-story">
                      <div className="meta"><h3>{story.title}</h3><span className="eyebrow" style={{ color: 'var(--muted)' }}>{story.venue}</span></div>
                      <div className="p-grid">
                        {story.photos.slice(0, 7).map((p, i) => (
                          <div key={p.id} className={`pi ${i === 0 ? 'wide' : p.h > p.w ? 'tall' : ''}`} style={{ backgroundImage: `url(${p.web})` }} role="img" aria-label={story.title} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null;
          case 'packages':
            return site.packages?.length ? (
              <section key={id} id="packages" className="s" style={{ background: 'var(--panel)' }}>
                <div className="wrap">
                  <div className="s-head"><div className="eyebrow">Investment</div><h2>Packages</h2></div>
                  <div className="packages">
                    {site.packages.map((p, i) => (
                      <div key={i} className="package">
                        <h3>{p.name}</h3>
                        <div className="price">{p.price}</div>
                        <ul>{p.features.map((f, j) => <li key={j}>{f}</li>)}</ul>
                        <button className="s-btn outline" onClick={() => setEnquiry(true)}>Enquire</button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null;
          case 'testimonials':
            return site.testimonials?.length ? (
              <section key={id} className="s">
                <div className="wrap">
                  <div className="s-head"><div className="eyebrow">Kind words</div><h2>From our couples</h2></div>
                  <div className="quotes">{site.testimonials.map((t, i) => <div key={i} className="quote"><p>“{t.quote}”</p><span>{t.author}</span></div>)}</div>
                </div>
              </section>
            ) : null;
          case 'faq':
            return site.faq?.length ? (
              <section key={id} id="faq" className="s" style={{ background: 'var(--panel)' }}>
                <div className="wrap">
                  <div className="s-head"><div className="eyebrow">Questions</div><h2>FAQ</h2></div>
                  <div className="faq">{site.faq.map((f, i) => <details key={i}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
                </div>
              </section>
            ) : null;
          case 'contact':
            return (
              <section key={id} id="contact" className="s">
                <div className="wrap contact-grid">
                  <div className="info">
                    <div className="eyebrow">Get in touch</div>
                    <h2 style={{ fontSize: 'clamp(34px,4vw,50px)', margin: '10px 0 14px' }}>Tell us about your wedding</h2>
                    <p>
                      {site.contact?.city && <>{site.contact.city}<br /></>}
                      {site.contact?.phone && <><a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a><br /></>}
                      {site.contact?.email && <><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a><br /></>}
                      {site.contact?.instagram && <><a href={site.contact.instagram} target="_blank" rel="noreferrer">Instagram</a><br /></>}
                    </p>
                  </div>
                  <EnquiryForm slug={studio.slug} />
                </div>
              </section>
            );
          default:
            return null;
        }
      })}

      <footer className="site-footer">
        <div className="wrap">
          <span>© {new Date().getFullYear()} {studio.name}</span>
          <span><Link to={loginPath}>Client login</Link> · Website by SitesForStudios</span>
        </div>
      </footer>
      {site.contact?.whatsapp && <a className="wa-float" href={`https://wa.me/${site.contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">✆</a>}
      {enquiry && (
        <div className="enquiry-modal" onMouseDown={(e) => e.target === e.currentTarget && setEnquiry(false)}>
          <div className="box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div><div className="eyebrow">Book an enquiry</div><h2 style={{ fontSize: 38, margin: '8px 0 20px' }}>Check your date</h2></div>
              <button className="s-btn outline" style={{ padding: '6px 12px' }} onClick={() => setEnquiry(false)} aria-label="Close">✕</button>
            </div>
            <EnquiryForm slug={studio.slug} />
          </div>
        </div>
      )}
    </div>
  );
}

function Hero({ images, studio, site, onEnquire }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);
  return (
    <section className="hero" id="top">
      {images.map((src, j) => <div key={src} className={`slide ${j === i ? 'on' : ''}`} style={{ backgroundImage: `url(${src})` }} />)}
      <div className="copy">
        <div className="wrap">
          <div className="eyebrow">{site.contact?.city || 'Wedding photography'}</div>
          <h1>{studio.name}</h1>
          <p>{site.tagline}</p>
          <button className="s-btn" onClick={onEnquire}>Book an enquiry</button>
        </div>
      </div>
    </section>
  );
}

export function EnquiryForm({ slug }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', eventDate: '', city: '', eventType: 'Wedding', budget: '', message: '', website: '' });
  const [state, setState] = useState({ busy: false, error: '', done: null });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '', done: null });
    try {
      const r = await api(`/sites/${slug}/enquiries`, { method: 'POST', body: f });
      setState({ busy: false, error: '', done: r });
    } catch (err) {
      setState({ busy: false, error: err.message, done: null });
    }
  };
  if (state.done) {
    return (
      <div>
        <h3 style={{ fontSize: 30, margin: '0 0 8px' }}>Thank you, {f.name.split(' ')[0]}.</h3>
        <p style={{ color: 'var(--muted)' }}>
          {state.done.dateAvailable === true && 'Good news: your date looks free. '}
          {state.done.dateAvailable === false && 'We already have a wedding on that date, but we will reach out with options. '}
          We will get back to you within a day.
        </p>
      </div>
    );
  }
  return (
    <form className="e-form" onSubmit={submit}>
      <label>Your names<input value={f.name} onChange={set('name')} required minLength={2} /></label>
      <label>Phone / WhatsApp<input type="tel" value={f.phone} onChange={set('phone')} required minLength={6} /></label>
      <label>Email<input type="email" value={f.email} onChange={set('email')} /></label>
      <label>Wedding date<input type="date" value={f.eventDate} onChange={set('eventDate')} /></label>
      <label>Venue or city<input value={f.city} onChange={set('city')} /></label>
      <label>Event
        <select value={f.eventType} onChange={set('eventType')}>
          {['Wedding', 'Engagement', 'Pre-wedding', 'Reception', 'Other'].map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="full">Budget
        <select value={f.budget} onChange={set('budget')}>
          <option value="">Prefer not to say</option>
          {['Under ₹1 lakh', '₹1–2 lakh', '₹2–4 lakh', 'Above ₹4 lakh'].map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="full">Tell us about your plans<textarea rows={3} value={f.message} onChange={set('message')} /></label>
      <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
      {state.error && <div className="full" style={{ color: '#b3261e' }}>{state.error}</div>}
      <div className="full"><button className="s-btn" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send enquiry'}</button></div>
    </form>
  );
}
