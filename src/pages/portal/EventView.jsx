import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDate } from '../../api.js';
import PortalTop from './PortalTop.jsx';

// Tabs: Highlights · All photos (by ceremony) · People (face clusters, naming, Find me).
export default function EventView() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [tab, setTab] = useState('highlights');
  const [ceremony, setCeremony] = useState('');
  const [cluster, setCluster] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [people, setPeople] = useState([]);
  const [found, setFound] = useState(null); // results of Find me
  const [selected, setSelected] = useState(new Set());
  const [open, setOpen] = useState(-1);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/portal/events/${eventId}`).then((e) => { setEvent(e); if (!e.highlightCount) setTab('all'); }).catch((e) => setError(e.message));
  }, [eventId]);

  const loadPeople = useCallback(() => api(`/portal/events/${eventId}/people`).then(setPeople), [eventId]);

  useEffect(() => {
    if (!event) return;
    setSelected(new Set());
    if (tab === 'people') {
      loadPeople();
      if (!cluster) return setPhotos([]);
    }
    if (tab === 'people' && found) return;
    const qs = new URLSearchParams();
    if (tab === 'highlights') qs.set('highlights', '1');
    if (tab === 'all' && ceremony) qs.set('ceremony', ceremony);
    if (tab === 'people' && cluster) qs.set('cluster', cluster.id);
    api(`/portal/events/${eventId}/photos?${qs}`).then(setPhotos);
  }, [event, tab, ceremony, cluster, found]);

  if (error) return <div className="center-page"><div className="card">{error} <Link to="/portal">Back</Link></div></div>;
  if (!event) return <div className="center-page muted">Loading…</div>;

  const shown = tab === 'people' && found ? found : photos;
  const cover = photos[0]?.web;
  const ids = [...selected];
  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const zip = (type, extra = '') => `/api/portal/events/${eventId}/download?type=${type}${extra}`;

  return (
    <div className="portal">
      <PortalTop title={event.studioName} />
      <div className="portal-body">
        <Link to="/portal" className="small muted">← My events</Link>
        <div className="event-hero" style={{ backgroundImage: cover ? `url(${cover})` : undefined, marginTop: 10 }}>
          <div>
            <h1>{event.title}</h1>
            <div style={{ opacity: 0.9 }}>{[fmtDate(event.eventDate), event.venue].filter(Boolean).join(' · ')}</div>
          </div>
        </div>

        <div className="row between" style={{ marginBottom: 12 }}>
          <nav className="tabs" style={{ marginBottom: 0, borderBottom: 0 }}>
            {event.highlightCount > 0 && <button className={tab === 'highlights' ? 'active' : ''} onClick={() => setTab('highlights')}>Highlights ({event.highlightCount})</button>}
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All photos</button>
            <button className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}>People</button>
          </nav>
          <div className="row">
            <a className="btn sm" href={zip(tab === 'highlights' ? 'highlights' : ceremony && tab === 'all' ? 'ceremony' : 'all', ceremony && tab === 'all' ? `&ceremony=${encodeURIComponent(ceremony)}` : '')}>
              ⤓ Download {tab === 'highlights' ? 'highlights' : ceremony && tab === 'all' ? ceremony : 'all photos'}
            </a>
            {event.rawAvailable && <a className="btn sm" href={zip('raw')}>⤓ RAW files ({event.rawCount})</a>}
          </div>
        </div>

        {tab === 'all' && (
          <div className="chips" style={{ marginBottom: 16 }}>
            <button className={`chip ${!ceremony ? 'active' : ''}`} onClick={() => setCeremony('')}>All ceremonies</button>
            {event.ceremonies.map((c) => <button key={c.name} className={`chip ${ceremony === c.name ? 'active' : ''}`} onClick={() => setCeremony(c.name)}>{c.name} ({c.count})</button>)}
          </div>
        )}

        {tab === 'people' && (
          <PeoplePanel
            event={event}
            people={people}
            cluster={cluster}
            setCluster={(c) => { setFound(null); setCluster(c); }}
            onRenamed={loadPeople}
            onFound={(r) => { setCluster(null); setFound(r); }}
            found={found}
          />
        )}

        <div className="masonry">
          {shown.map((p, i) => (
            <div key={p.id} className={`m ${selected.has(p.id) ? 'sel' : ''}`} onClick={() => setOpen(i)}>
              <img src={p.thumb} alt={p.filename} loading="lazy" style={{ aspectRatio: p.width && p.height ? `${p.width}/${p.height}` : undefined }} />
              <button className="check" aria-label="Select" onClick={(e) => { e.stopPropagation(); toggle(p.id); }}>{selected.has(p.id) ? '✓' : ''}</button>
            </div>
          ))}
        </div>
        {!shown.length && tab !== 'people' && <p className="muted">No photos here yet.</p>}
      </div>

      {selected.size > 0 && (
        <div className="download-bar">
          <span>{selected.size} selected</span>
          <a className="btn sm" href={zip('selected', `&ids=${ids.join(',')}`)}>⤓ Download</a>
          <button className="btn sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      {open >= 0 && shown[open] && <Lightbox photos={shown} index={open} setIndex={setOpen} />}
    </div>
  );
}

function PeoplePanel({ event, people, cluster, setCluster, onRenamed, onFound, found }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const selfieRef = useRef();
  useEffect(() => setName(cluster?.label || ''), [cluster]);

  if (!event.facesEnabled) {
    return <div className="card muted" style={{ marginBottom: 16 }}>Face recognition is not turned on for this event yet. Ask your studio if you would like it.</div>;
  }
  const findMe = async (file) => {
    setBusy(true);
    setMsg('');
    try {
      const r = await api(`/portal/events/${event.id}/find-me`, { method: 'POST', raw: true, body: file, headers: { 'Content-Type': file.type || 'image/jpeg' } });
      onFound(r);
      setMsg(r.length ? `Found you in ${r.length} photo(s).` : 'No matches. Try a clear, front-facing selfie in good light.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    await api(`/portal/clusters/${cluster.id}`, { method: 'PATCH', body: { label: name } });
    onRenamed();
  };
  const merge = async (intoId) => {
    if (!intoId) return;
    await api(`/portal/clusters/${cluster.id}/merge`, { method: 'POST', body: { intoId } });
    setCluster(null);
    onRenamed();
  };

  return (
    <div className="card stack" style={{ marginBottom: 18 }}>
      <div className="row between">
        <div>
          <h3 style={{ margin: 0 }}>Find yourself</h3>
          <p className="small muted" style={{ margin: 0 }}>Take or upload a selfie to see every photo you appear in. The selfie is not saved.</p>
        </div>
        <button className="btn accent" disabled={busy} onClick={() => selfieRef.current.click()}>{busy ? 'Searching…' : 'Find me with a selfie'}</button>
        <input ref={selfieRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => e.target.files[0] && findMe(e.target.files[0])} />
      </div>
      {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
      {found && <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => onFound(null)}>Clear selfie results</button>}
      <div className="people">
        {people.map((p) => (
          <button key={p.id} className={`person ${cluster?.id === p.id ? 'active' : ''}`} onClick={() => setCluster(cluster?.id === p.id ? null : p)}>
            <img src={p.cover} alt={p.label || 'Unnamed person'} loading="lazy" />
            <div className="small" style={{ fontWeight: 500 }}>{p.label || 'Add name'}</div>
            <div className="small muted">{p.photoCount} photos</div>
          </button>
        ))}
        {!people.length && <span className="muted small">No faces found yet. People appear here after the photos are processed.</span>}
      </div>
      {cluster && (
        <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <input style={{ maxWidth: 260 }} placeholder="Name this person, e.g. Grandma" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <button className="btn primary sm" onClick={save}>Save name</button>
          <select style={{ width: 'auto' }} value="" onChange={(e) => merge(e.target.value)}>
            <option value="">Same person as…</option>
            {people.filter((p) => p.id !== cluster.id).map((p) => <option key={p.id} value={p.id}>{p.label || `Unnamed (${p.photoCount} photos)`}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function Lightbox({ photos, index, setIndex }) {
  const p = photos[index];
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setIndex(-1);
      if (e.key === 'ArrowRight') setIndex(Math.min(photos.length - 1, index + 1));
      if (e.key === 'ArrowLeft') setIndex(Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, photos.length]);
  return (
    <div className="lightbox">
      <div className="bar">
        <span className="small">{p.filename} · {index + 1} / {photos.length}</span>
        <div className="row">
          <a className="btn sm" href={`/api/portal/photos/${p.id}/download`}>⤓ Full resolution</a>
          <button className="btn sm" onClick={() => setIndex(-1)}>Close ✕</button>
        </div>
      </div>
      <div className="stage" onClick={(e) => e.target === e.currentTarget && setIndex(-1)}>
        <img src={p.web} alt={p.filename} />
        {index > 0 && <button className="nav" style={{ left: 8 }} onClick={() => setIndex(index - 1)} aria-label="Previous">‹</button>}
        {index < photos.length - 1 && <button className="nav" style={{ right: 8 }} onClick={() => setIndex(index + 1)} aria-label="Next">›</button>}
      </div>
    </div>
  );
}
