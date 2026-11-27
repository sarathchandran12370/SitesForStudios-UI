// Guest gallery opened from a share link (/g/:token). No account needed; the studio may set a password.
// Guests can view, use Find me and (when allowed) download. No RAW, favourites or comments.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, fmtDate } from '../../api.js';
import { galleryClass, GalleryHero, PhotoGrid, VideoList, Lightbox, FindMe, ContactCard } from '../../components/gallery.jsx';

export default function ShareGallery() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('highlights');
  const [ceremony, setCeremony] = useState('');
  const [photos, setPhotos] = useState([]);
  const [found, setFound] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [open, setOpen] = useState(-1);
  const [cover, setCover] = useState(null);
  const base = `/share/${token}`;

  const load = () =>
    api(base)
      .then((i) => {
        setInfo(i);
        if (!i.locked && !i.highlightCount) setTab('all');
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    if (!info || info.locked || tab === 'find') return;
    setSelected(new Set());
    const qs = new URLSearchParams();
    if (tab === 'highlights') qs.set('highlights', '1');
    if (tab === 'videos') qs.set('videos', '1');
    if (tab === 'all' && ceremony) qs.set('ceremony', ceremony);
    api(`${base}/photos?${qs}`).then((list) => {
      setPhotos(list);
      setCover((c) => c || list.find((p) => p.web)?.web || null);
    });
  }, [info?.locked, tab, ceremony]);

  useEffect(() => {
    if (info?.title) document.title = `${info.title} · ${info.studioName}`;
  }, [info?.title]);

  if (error) return <div className="center-page"><div className="card" style={{ maxWidth: 420 }}>{error}</div></div>;
  if (!info) return <div className="center-page muted">Loading…</div>;
  if (info.locked) return <Unlock info={info} token={token} onUnlocked={load} />;

  const canDownload = info.downloads !== 'none';
  const shown = tab === 'find' ? found || [] : photos;
  const zip = (type, extra = '') => `/api${base}/download?type=${type}${extra}`;
  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const search = (file) => api(`${base}/find-me`, { method: 'POST', raw: true, body: file, headers: { 'Content-Type': file.type || 'image/jpeg' } });

  return (
    <div className={`portal ${galleryClass(info.design)}`}>
      <header className="share-top">
        {info.studio?.logoUrl ? <img src={info.studio.logoUrl} alt={info.studioName} /> : <span className="studio">{info.studioName}</span>}
        {info.studio?.website && <a className="btn sm" href={info.studio.website} target="_blank" rel="noreferrer">Visit website</a>}
      </header>
      <div className="portal-body">
        <GalleryHero design={info.design} title={info.title} subtitle={[fmtDate(info.eventDate), info.venue].filter(Boolean).join(' · ')} cover={cover} />

        <div className="row between" style={{ marginBottom: 12 }}>
          <nav className="tabs" style={{ marginBottom: 0, borderBottom: 0 }}>
            {info.highlightCount > 0 && <button className={tab === 'highlights' ? 'active' : ''} onClick={() => setTab('highlights')}>Highlights ({info.highlightCount})</button>}
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All photos</button>
            {info.videoCount > 0 && <button className={tab === 'videos' ? 'active' : ''} onClick={() => setTab('videos')}>Videos ({info.videoCount})</button>}
            {info.facesEnabled && <button className={tab === 'find' ? 'active' : ''} onClick={() => setTab('find')}>Find me</button>}
          </nav>
          {canDownload && (tab === 'all' || tab === 'highlights') && (
            <a className="btn sm" href={zip(tab === 'highlights' ? 'highlights' : ceremony ? 'ceremony' : 'all', ceremony && tab === 'all' ? `&ceremony=${encodeURIComponent(ceremony)}` : '')}>
              ⤓ Download {tab === 'highlights' ? 'highlights' : ceremony || 'all photos'}
            </a>
          )}
        </div>

        {tab === 'all' && (
          <div className="chips" style={{ marginBottom: 16 }}>
            <button className={`chip ${!ceremony ? 'active' : ''}`} onClick={() => setCeremony('')}>All ceremonies</button>
            {info.ceremonies.map((c) => <button key={c.name} className={`chip ${ceremony === c.name ? 'active' : ''}`} onClick={() => setCeremony(c.name)}>{c.name} ({c.count})</button>)}
          </div>
        )}
        {tab === 'find' && <div className="card" style={{ marginBottom: 18 }}><FindMe search={search} onFound={setFound} found={found} /></div>}

        {tab === 'videos' ? (
          <VideoList videos={photos} downloadHref={info.downloads === 'full' ? (v) => `/api${base}/photos/${v.id}/download` : null} />
        ) : (
          <PhotoGrid photos={shown} layout={info.design.layout} onOpen={setOpen} selected={selected} onSelect={canDownload ? toggle : null} protect={!canDownload} />
        )}
        {tab !== 'videos' && tab !== 'find' && !shown.length && <p className="muted">No photos here yet.</p>}

        <ContactCard studio={info.studio} />
      </div>

      {selected.size > 0 && (
        <div className="download-bar">
          <span>{selected.size} selected</span>
          <a className="btn sm" href={zip('selected', `&ids=${[...selected].join(',')}`)}>⤓ Download</a>
          <button className="btn sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      {open >= 0 && shown[open] && (
        <Lightbox photos={shown} index={open} setIndex={setOpen} protect={!canDownload} downloadHref={canDownload ? (p) => `/api${base}/photos/${p.id}/download` : null} />
      )}
    </div>
  );
}

function Unlock({ info, token, onUnlocked }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/share/${token}/unlock`, { method: 'POST', body: { password } });
      onUnlocked();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <div className={`center-page ${galleryClass(info.design)}`}>
      <form className="card stack" style={{ width: 'min(380px, 100%)', textAlign: 'center' }} onSubmit={submit}>
        {info.studio?.logoUrl && <img src={info.studio.logoUrl} alt={info.studioName} style={{ height: 48, objectFit: 'contain' }} />}
        <div className="small muted">{info.studioName}</div>
        <h2 style={{ margin: 0 }}>{info.title}</h2>
        <p className="small muted" style={{ margin: 0 }}>This gallery is private. Enter the password your photographer gave you.</p>
        <input type="password" autoFocus placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <span className="small error">{error}</span>}
        <button className="btn accent" disabled={busy || !password}>{busy ? 'Opening…' : 'View photos'}</button>
      </form>
    </div>
  );
}
