import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import './site.css';

const DEFAULT_SECTIONS = ['about', 'portfolio', 'packages', 'testimonials', 'faq', 'contact'].map((id) => ({ id, enabled: true }));

/**
 * Layout per template. Content is the same for every template (the studio's settings); a template
 * picks the hero and portfolio layouts and its decorations. Colours and fonts live in site.css (.tpl-<id>).
 */
export const TEMPLATE_LAYOUTS = {
  editorial: { hero: 'full', portfolio: 'collage' },
  luxe: { hero: 'full', portfolio: 'collage' },
  cinematic: { hero: 'full', portfolio: 'collage' },
  boho: { hero: 'split', portfolio: 'film', script: true },
  indian: { hero: 'arch', portfolio: 'collage', ornaments: true },
  grid: { hero: 'mosaic', portfolio: 'uniform', numbered: true },
};
export const layoutFor = (templateId) => TEMPLATE_LAYOUTS[templateId] || TEMPLATE_LAYOUTS.editorial;

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

  return <StudioSite data={data} enquiry={enquiry} setEnquiry={setEnquiry} />;
}

/** The whole studio website. Exported so it can be rendered with sample data (tests, previews). */
export function StudioSite({ data, enquiry = false, setEnquiry = () => {} }) {
  const { studio, site, hero, portfolio, templateId, aboutImage, reviews = [] } = data;
  // Testimonials the studio typed in, then reviews clients left from their galleries (published by the studio).
  const quotes = [...(site.testimonials || []), ...reviews];
  const layout = layoutFor(templateId);
  const sections = (site.sections?.length ? site.sections : DEFAULT_SECTIONS).filter((s) => s.enabled);
  const has = (id) => sections.some((s) => s.id === id);
  const accent = site.theme?.accent || '#9a6b3c';
  const fontPair = site.theme?.fontPair || 'template';
  const allPhotos = portfolio.flatMap((p) => p.photos);
  const navItems = [['about', 'About'], ['portfolio', 'Portfolio'], ['packages', 'Packages'], ['faq', 'FAQ'], ['contact', 'Contact']].filter(([id]) => has(id));
  const open = () => setEnquiry(true);
  const heroImages = hero.length ? hero : allPhotos.slice(0, 5).map((p) => p.web);
  let n = 0; // section number for numbered templates
  const head = (eyebrow, title) => <SectionHead eyebrow={eyebrow} title={title} layout={layout} index={++n} />;

  return (
    <div className={`site tpl-${TEMPLATE_LAYOUTS[templateId] ? templateId : 'editorial'}${fontPair !== 'template' ? ` font-${fontPair}` : ''}`} style={{ '--accent': accent }}>
      {!studio.published && <div style={{ background: '#1c1917', color: '#fff', textAlign: 'center', fontSize: 13, padding: 6 }}>Preview — this website is not published yet.</div>}
      <header className="site-header">
        <div className="wrap">
          <a className="logo" href="#top">{site.logoUrl ? <img src={site.logoUrl} alt={studio.name} /> : studio.name}</a>
          <nav>{navItems.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <div className="actions">
            <Link className="login" to={`/login?studio=${studio.slug}`}>Client login</Link>
            <button className="s-btn" onClick={open}>Book an enquiry</button>
          </div>
        </div>
      </header>

      {layout.hero === 'split' && <HeroSplit images={heroImages} studio={studio} site={site} onEnquire={open} />}
      {layout.hero === 'arch' && <HeroArch images={heroImages} studio={studio} site={site} onEnquire={open} />}
      {layout.hero === 'mosaic' && <HeroMosaic images={heroImages} studio={studio} site={site} onEnquire={open} />}
      {layout.hero === 'full' && <HeroFull images={heroImages} studio={studio} site={site} onEnquire={open} />}

      {sections.map(({ id }) => {
        switch (id) {
          case 'about':
            return (
              <section key={id} id="about" className="s">
                <div className="wrap about-grid">
                  <div className="img" style={{ backgroundImage: (aboutImage || allPhotos[1]?.web) ? `url(${aboutImage || allPhotos[1].web})` : undefined }} />
                  <div>
                    {layout.numbered ? <div className="num-label">{String(++n).padStart(2, '0')} — About</div> : <div className="eyebrow">About us</div>}
                    {layout.script && <div className="script-note">hello, we're {studio.name.split(' ')[0]}</div>}
                    <h2 style={{ fontSize: 'clamp(34px,4vw,50px)', margin: '10px 0 18px' }}>{site.tagline || studio.name}</h2>
                    <p>{site.about || `${studio.name} photographs weddings with care and an eye for the moments in between.`}</p>
                    <button className="s-btn outline" onClick={open}>Check your date</button>
                  </div>
                </div>
              </section>
            );
          case 'portfolio':
            return portfolio.length ? (
              <section key={id} id="portfolio" className="s" style={{ paddingTop: 40 }}>
                <div className="wrap">
                  {head('Portfolio', 'Recent weddings')}
                  {layout.portfolio === 'film' && <PortfolioFilm stories={portfolio} />}
                  {layout.portfolio === 'uniform' && <PortfolioUniform stories={portfolio} />}
                  {layout.portfolio === 'collage' && <PortfolioCollage stories={portfolio} />}
                </div>
              </section>
            ) : null;
          case 'packages':
            return site.packages?.length ? (
              <section key={id} id="packages" className="s alt-bg">
                <div className="wrap">
                  {head('Investment', 'Packages')}
                  <div className="packages">
                    {site.packages.map((p, i) => (
                      <div key={i} className="package">
                        <h3>{p.name}</h3>
                        <div className="price">{p.price}</div>
                        <ul>{p.features.map((f, j) => <li key={j}>{f}</li>)}</ul>
                        <button className="s-btn outline" onClick={open}>Enquire</button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null;
          case 'testimonials':
            return quotes.length ? (
              <section key={id} className="s">
                <div className="wrap">
                  {head('Kind words', 'From our couples')}
                  <div className="quotes">{quotes.map((t, i) => <div key={i} className="quote">{t.rating ? <div className="stars-static" aria-label={`${t.rating} out of 5`}>{'★'.repeat(t.rating)}</div> : null}<p>“{t.quote}”</p><span>{t.author}</span></div>)}</div>
                </div>
              </section>
            ) : null;
          case 'faq':
            return site.faq?.length ? (
              <section key={id} id="faq" className="s alt-bg">
                <div className="wrap">
                  {head('Questions', 'FAQ')}
                  <div className="faq">{site.faq.map((f, i) => <details key={i}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
                </div>
              </section>
            ) : null;
          case 'contact':
            return (
              <section key={id} id="contact" className="s">
                <div className="wrap contact-grid">
                  <div className="info">
                    {layout.numbered ? <div className="num-label">{String(++n).padStart(2, '0')} — Contact</div> : <div className="eyebrow">Get in touch</div>}
                    {layout.ornaments && <Ornament small />}
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
          <span><Link to={`/login?studio=${studio.slug}`}>Client login</Link> · Website by SitesForStudios</span>
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

// ---------------------------------------------------------------- shared pieces

function SectionHead({ eyebrow, title, layout, index }) {
  if (layout.numbered) {
    return (
      <div className="s-head numbered">
        <div className="num-label">{String(index).padStart(2, '0')} — {eyebrow}</div>
        <h2>{title}</h2>
      </div>
    );
  }
  return (
    <div className="s-head">
      {layout.ornaments ? <Ornament /> : <div className="eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      {layout.ornaments && <div className="eyebrow" style={{ marginTop: 10 }}>{eyebrow}</div>}
    </div>
  );
}

/** Symmetric gold motif used by the Indian Traditional template. */
export function Ornament({ small }) {
  const w = small ? 120 : 220;
  return (
    <svg className="ornament" width={w} height={small ? 18 : 28} viewBox="0 0 220 28" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M0 14H78" />
        <path d="M142 14H220" />
        <path d="M84 14c6-8 14-8 20 0-6 8-14 8-20 0z" />
        <path d="M116 14c6-8 14-8 20 0-6 8-14 8-20 0z" />
      </g>
      <path d="M110 3l6 11-6 11-6-11z" fill="currentColor" />
      <circle cx="80" cy="14" r="2" fill="currentColor" />
      <circle cx="140" cy="14" r="2" fill="currentColor" />
      <circle cx="40" cy="14" r="1.5" fill="currentColor" />
      <circle cx="180" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

function useSlideshow(count, ms = 6000) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % count), ms);
    return () => clearInterval(t);
  }, [count, ms]);
  return i;
}

function Slides({ images, className }) {
  const i = useSlideshow(images.length);
  return images.map((src, j) => <div key={src} className={`${className} ${j === i ? 'on' : ''}`} style={{ backgroundImage: `url(${src})` }} />);
}

// ---------------------------------------------------------------- heroes

/** Full-bleed slideshow (Editorial, Classic Luxe, Dark Cinematic). */
function HeroFull({ images, studio, site, onEnquire }) {
  return (
    <section className="hero" id="top">
      <Slides images={images} className="slide" />
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

/** Boho Film: words on the left, a tall arched photo on the right. */
function HeroSplit({ images, studio, site, onEnquire }) {
  return (
    <section className="h-split" id="top">
      <div className="wrap h-split-inner">
        <div className="h-split-copy">
          <div className="script-note">{site.contact?.city ? `from ${site.contact.city.split(',')[0]}, with love` : 'with love'}</div>
          <h1>{studio.name}</h1>
          <p>{site.tagline}</p>
          <div className="row-btns">
            <button className="s-btn" onClick={onEnquire}>Book an enquiry</button>
            <a className="s-btn outline" href="#portfolio">See our work</a>
          </div>
        </div>
        <div className="h-split-media">
          <Slides images={images} className="arch-slide" />
          <span className="stamp">film · love · light</span>
        </div>
      </div>
    </section>
  );
}

/** Indian Traditional: centred photo in an arched frame with gold borders and ornaments. */
function HeroArch({ images, studio, site, onEnquire }) {
  return (
    <section className="h-arch" id="top">
      <div className="wrap h-arch-inner">
        <Ornament />
        <div className="eyebrow" style={{ margin: '14px 0 6px' }}>{site.contact?.city || 'Wedding photography'}</div>
        <h1>{studio.name}</h1>
        <p className="h-arch-tag">{site.tagline}</p>
        <div className="arch-frame">
          <div className="arch-window"><Slides images={images} className="arch-slide" /></div>
        </div>
        <button className="s-btn" onClick={onEnquire}>Book an enquiry</button>
      </div>
    </section>
  );
}

/** Modern Grid: big headline over a mosaic of up to five photos. */
function HeroMosaic({ images, studio, site, onEnquire }) {
  const five = [0, 1, 2, 3, 4].map((k) => images[k % Math.max(images.length, 1)]).filter(Boolean);
  return (
    <section className="h-mosaic" id="top">
      <div className="wrap">
        <div className="h-mosaic-head">
          <h1>{studio.name}</h1>
          <div className="h-mosaic-side">
            <p>{site.tagline}</p>
            <button className="s-btn" onClick={onEnquire}>Book an enquiry</button>
          </div>
        </div>
        <div className="mosaic">
          {five.map((src, k) => <div key={k} className={`m${k}`} style={{ backgroundImage: `url(${src})` }} />)}
        </div>
        <div className="num-label" style={{ marginTop: 14 }}>{site.contact?.city || 'Wedding photography'} — Weddings · Pre-weddings · Films</div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- portfolios

function PortfolioCollage({ stories }) {
  return stories.map((story) => (
    <div key={story.id} className="portfolio-story">
      <div className="meta"><h3>{story.title}</h3><span className="eyebrow" style={{ color: 'var(--muted)' }}>{story.venue}</span></div>
      <div className="p-grid">
        {story.photos.slice(0, 7).map((p, i) => (
          <div key={p.id} className={`pi ${i === 0 ? 'wide' : p.h > p.w ? 'tall' : ''}`} style={{ backgroundImage: `url(${p.web})` }} role="img" aria-label={story.title} />
        ))}
      </div>
    </div>
  ));
}

const TILT = [-2.2, 1.6, -1.1, 2.4, -1.7, 1.2];

/** Boho Film: polaroid-style prints in a scrollable film strip. */
function PortfolioFilm({ stories }) {
  return stories.map((story) => (
    <div key={story.id} className="film-story">
      <div className="film-title"><span className="script-note">{story.title}</span>{story.venue && <span className="eyebrow">{story.venue}</span>}</div>
      <div className="film-strip">
        {story.photos.slice(0, 8).map((p, i) => (
          <figure key={p.id} className="polaroid" style={{ '--tilt': `${TILT[i % TILT.length]}deg` }}>
            <div className="ph" style={{ backgroundImage: `url(${p.web})` }} role="img" aria-label={story.title} />
          </figure>
        ))}
      </div>
    </div>
  ));
}

/** Modern Grid: strict square grid, story name on hover. */
function PortfolioUniform({ stories }) {
  const tiles = stories.flatMap((s) => s.photos.slice(0, 6).map((p) => ({ ...p, story: s })));
  return (
    <div className="uniform">
      {tiles.slice(0, 12).map((p) => (
        <a key={p.id} className="tile" href="#contact" style={{ backgroundImage: `url(${p.web})` }} aria-label={p.story.title}>
          <span>{p.story.title}{p.story.venue ? ` · ${p.story.venue}` : ''}</span>
        </a>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- enquiry form

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
