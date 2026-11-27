// Gallery building blocks shared by the client portal (pages/portal) and guest share links (pages/share).
import { useEffect, useRef, useState } from 'react';
import { fmtBytes } from '../api.js';

export const DESIGN_DEFAULTS = { layout: 'masonry', theme: 'light', font: 'classic', cover: 'full' };

/** Class names that apply the studio's gallery design (see .gallery in styles.css). */
export function galleryClass(design) {
  const d = { ...DESIGN_DEFAULTS, ...(design || {}) };
  return `gallery theme-${d.theme} gfont-${d.font} layout-${d.layout}`;
}

/** When downloads are off, make saving previews a little harder. It is not real protection: that is the API's job. */
export const protectProps = (on) => (on ? { onContextMenu: (e) => e.preventDefault(), draggable: false } : {});

export function GalleryHero({ design, title, subtitle, cover }) {
  const kind = design?.cover || 'full';
  if (kind === 'minimal' || !cover) {
    return (
      <div className="g-hero minimal">
        <h1>{title}</h1>
        {subtitle && <div className="muted">{subtitle}</div>}
        <span className="rule" />
      </div>
    );
  }
  if (kind === 'split') {
    return (
      <div className="g-hero split">
        <div className="img" style={{ backgroundImage: `url("${cover}")` }} />
        <div className="txt">
          <h1>{title}</h1>
          {subtitle && <div className="muted">{subtitle}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="event-hero g-hero full" style={{ backgroundImage: `url("${cover}")` }}>
      <div>
        <h1>{title}</h1>
        {subtitle && <div style={{ opacity: 0.9 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

/**
 * The photo grid. `picked`/`onPick` add a heart (album selection); `selected`/`onSelect` add a tick (download selection).
 * Leave either pair out to hide it.
 */
export function PhotoGrid({ photos, layout = 'masonry', onOpen, picked, onPick, selected, onSelect, commented, protect }) {
  return (
    <div className={`g-grid ${layout}`}>
      {photos.map((p, i) => {
        const ratio = p.width && p.height ? p.width / p.height : 1.5;
        return (
          <div
            key={p.id}
            className={`m ${selected?.has(p.id) ? 'sel' : ''} ${picked?.has(p.id) ? 'picked' : ''}`}
            style={layout === 'rows' ? { flexGrow: ratio, flexBasis: `${ratio * 220}px` } : undefined}
            onClick={() => onOpen(i)}
            {...protectProps(protect)}
          >
            <img src={p.thumb} alt={p.filename} loading="lazy" style={layout === 'masonry' ? { aspectRatio: `${ratio}` } : undefined} {...protectProps(protect)} />
            {onPick && (
              <button className={`heart ${picked.has(p.id) ? 'on' : ''}`} aria-label={picked.has(p.id) ? 'Remove from favourites' : 'Add to favourites'} onClick={(e) => { e.stopPropagation(); onPick(p.id); }}>
                {picked.has(p.id) ? '♥' : '♡'}
              </button>
            )}
            {onSelect && (
              <button className="check" aria-label="Select for download" onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}>{selected.has(p.id) ? '✓' : ''}</button>
            )}
            {commented?.has(p.id) && <span className="dot" title="Has comments">💬</span>}
          </div>
        );
      })}
    </div>
  );
}

export function VideoList({ videos, downloadHref }) {
  return (
    <div className="g-videos">
      {videos.map((v) => (
        <figure key={v.id} className="g-video">
          <video controls preload="metadata" playsInline controlsList={downloadHref ? undefined : 'nodownload'} onContextMenu={downloadHref ? undefined : (e) => e.preventDefault()}>
            <source src={v.src} type={v.contentType === 'video/quicktime' ? 'video/mp4' : v.contentType} />
          </video>
          <figcaption className="row between small">
            <span>{v.filename} · {fmtBytes(v.bytes)}</span>
            {downloadHref && <a className="btn sm" href={downloadHref(v)}>⤓ Download</a>}
          </figcaption>
        </figure>
      ))}
      {!videos.length && <p className="muted">No videos yet.</p>}
    </div>
  );
}

/** Full-screen viewer. `aside` renders a side panel (comments) for the current photo. */
export function Lightbox({ photos, index, setIndex, downloadHref, picked, onPick, aside, protect }) {
  const p = photos[index];
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('textarea, input')) return;
      if (e.key === 'Escape') setIndex(-1);
      if (e.key === 'ArrowRight') setIndex(Math.min(photos.length - 1, index + 1));
      if (e.key === 'ArrowLeft') setIndex(Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, photos.length]);
  if (!p) return null;
  return (
    <div className={`lightbox ${aside ? 'with-aside' : ''}`}>
      <div className="bar">
        <span className="small">{p.filename} · {index + 1} / {photos.length}</span>
        <div className="row">
          {onPick && <button className={`btn sm ${picked.has(p.id) ? 'on' : ''}`} onClick={() => onPick(p.id)}>{picked.has(p.id) ? '♥ In favourites' : '♡ Add to favourites'}</button>}
          {downloadHref && <a className="btn sm" href={downloadHref(p)}>⤓ Download</a>}
          <button className="btn sm" onClick={() => setIndex(-1)}>Close ✕</button>
        </div>
      </div>
      <div className="lb-body">
        <div className="stage" onClick={(e) => e.target === e.currentTarget && setIndex(-1)} {...protectProps(protect)}>
          <img src={p.web} alt={p.filename} {...protectProps(protect)} />
          {index > 0 && <button className="nav" style={{ left: 8 }} onClick={() => setIndex(index - 1)} aria-label="Previous">‹</button>}
          {index < photos.length - 1 && <button className="nav" style={{ right: 8 }} onClick={() => setIndex(index + 1)} aria-label="Next">›</button>}
        </div>
        {aside && <aside className="lb-aside">{aside(p)}</aside>}
      </div>
    </div>
  );
}

/** "Find me" with a selfie. `search(file)` returns the matching photos. */
export function FindMe({ search, onFound, found }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const ref = useRef();
  const run = async (file) => {
    setBusy(true);
    setMsg('');
    try {
      const r = await search(file);
      onFound(r);
      setMsg(r.length ? `Found you in ${r.length} photo(s).` : 'No matches. Try a clear, front-facing selfie in good light.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between">
        <div>
          <h3 style={{ margin: 0 }}>Find yourself</h3>
          <p className="small muted" style={{ margin: 0 }}>Take or upload a selfie to see every photo you appear in. The selfie is not saved.</p>
        </div>
        <button className="btn accent" disabled={busy} onClick={() => ref.current.click()}>{busy ? 'Searching…' : 'Find me with a selfie'}</button>
        <input ref={ref} type="file" accept="image/*" capture="user" hidden onChange={(e) => { if (e.target.files[0]) run(e.target.files[0]); e.target.value = ''; }} />
      </div>
      {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
      {found && <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => { onFound(null); setMsg(''); }}>Clear selfie results</button>}
    </div>
  );
}

const waLink = (n) => `https://wa.me/${String(n).replace(/\D/g, '')}`;
const igLink = (h) => (/^https?:/.test(h) ? h : `https://instagram.com/${String(h).replace(/^@/, '')}`);
const ytLink = (h) => (/^https?:/.test(h) ? h : `https://youtube.com/${String(h).startsWith('@') ? h : `@${h}`}`);

/** The studio's contact details, shown at the end of every gallery. */
export function ContactCard({ studio }) {
  if (!studio) return null;
  const links = [
    studio.whatsapp && ['WhatsApp', waLink(studio.whatsapp)],
    studio.phone && ['Call', `tel:${studio.phone}`],
    studio.email && ['Email', `mailto:${studio.email}`],
    studio.instagram && ['Instagram', igLink(studio.instagram)],
    studio.youtube && ['YouTube', ytLink(studio.youtube)],
    studio.website && ['Website', studio.website],
  ].filter(Boolean);
  return (
    <section className="g-contact" style={{ '--accent': studio.accent }}>
      {studio.logoUrl ? <img className="logo" src={studio.logoUrl} alt={studio.name} /> : <div className="mono">{studio.name.slice(0, 1)}</div>}
      <div className="who">
        <div className="small muted">Photographed by</div>
        <div className="name">{studio.name}</div>
        {(studio.tagline || studio.city) && <div className="small muted">{[studio.tagline, studio.city].filter(Boolean).join(' · ')}</div>}
        {studio.phone && <div className="small">{studio.phone}{studio.email ? ` · ${studio.email}` : ''}</div>}
      </div>
      <div className="row links">
        {links.map(([label, href]) => (
          <a key={label} className="btn sm" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{label}</a>
        ))}
      </div>
    </section>
  );
}
