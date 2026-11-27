import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtBytes, fmtDate } from '../../api.js';
import { EventForm } from './StudioEvents.jsx';
import { GallerySettings, ShareLink, Selections, CommentThreads } from './EventGallery.jsx';

const CEREMONIES = ['Engagement', 'Haldi', 'Mehndi', 'Sangeet', 'Wedding', 'Reception', 'Pre-wedding'];
const PARALLEL = 4;

export default function EventManage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [studio, setStudio] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [kind, setKind] = useState('image');
  const [ceremonyFilter, setCeremonyFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [only, setOnly] = useState(null); // { ids, name }: show one client's album selection

  const loadEvent = async () => {
    const e = await api(`/events/${eventId}`);
    setEvent(e);
    if (!studio) setStudio(await api(`/studios/${e.studio_id}`));
  };
  const loadPhotos = () => api(`/events/${eventId}/photos?kind=${kind}${ceremonyFilter ? `&ceremony=${encodeURIComponent(ceremonyFilter)}` : ''}`).then(setPhotos);

  useEffect(() => {
    loadEvent();
  }, [eventId]);
  useEffect(() => {
    setSelected(new Set());
    loadPhotos();
  }, [eventId, kind, ceremonyFilter]);
  const showSelection = (ids, name) => {
    setKind('image');
    setCeremonyFilter('');
    setOnly({ ids: new Set(ids), name });
    document.getElementById('event-files')?.scrollIntoView({ behavior: 'smooth' });
  };
  // Refresh while photos are still processing.
  useEffect(() => {
    if (!photos.some((p) => p.status === 'uploaded' || p.status === 'processing')) return;
    const t = setTimeout(() => { loadPhotos(); loadEvent(); }, 2000);
    return () => clearTimeout(t);
  }, [photos]);

  if (!event || !studio) return <p className="muted">Loading…</p>;
  const ids = [...selected];
  const galleries = studio.plan?.client_galleries !== false;
  const files = only ? photos.filter((p) => only.ids.has(p.id)) : photos;
  const bulk = async (body, method = 'PATCH') => {
    await api(`/events/${eventId}/photos`, { method, body: { photoIds: ids, ...body } });
    setSelected(new Set());
    loadPhotos();
    loadEvent();
  };
  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  return (
    <>
      <Link to={`/studio/${event.studio_id}/events`} className="small muted">← {studio.name}</Link>
      <div className="page-head" style={{ marginTop: 6 }}>
        <div>
          <h1>{event.title}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {[fmtDate(event.event_date), event.venue, fmtBytes(event.storage_bytes)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setEditing(true)}>Settings</button>
          {studio.plan?.client_galleries !== false && <Link className="btn" to={`/portal/events/${event.id}`}>Client view</Link>}
        </div>
      </div>

      {studio.plan?.client_galleries === false ? (
        <div className="card small muted">
          Portfolio album: photos you mark as <b>Highlight</b> appear in your website portfolio when the album is set to show in the portfolio.
          Client galleries and downloads come with Starter and above.
        </div>
      ) : (
      <div className="card stack">
        <div className="row between">
          <h3 style={{ margin: 0 }}>Clients with access</h3>
          <Link className="btn sm" to={`/studio/${event.studio_id}/clients`}>Manage clients</Link>
        </div>
        <div className="row small">
          {event.clients.map((c) => <span key={c.id} className="badge">{c.name} · {c.access_level === 'primary' ? 'couple' : 'guest'}</span>)}
          {!event.clients.length && <span className="muted">No clients yet. Add the couple from the Clients tab so they can log in.</span>}
        </div>
        {event.clients.length > 0 && <NotifyClients event={event} onDone={loadEvent} />}
      </div>
      )}

      {galleries && (
        <>
          <Selections event={event} onShow={showSelection} />
          <CommentThreads event={event} />
          <GallerySettings event={event} studioName={studio.name} onSaved={loadEvent} />
          <ShareLink event={event} onSaved={loadEvent} />
        </>
      )}

      <Uploader event={event} videos={galleries} onDone={(n) => { setMessage(`${n} file(s) uploaded. Processing…`); loadPhotos(); loadEvent(); }} />
      {message && <p className="ok">{message}</p>}

      <div className="card stack" id="event-files">
        {only && (
          <div className="row" style={{ background: 'var(--accent-soft)', padding: 10, borderRadius: 8 }}>
            <span>Showing <b>{only.name}</b>'s selection ({only.ids.size} photos)</span>
            <button className="btn sm" onClick={() => setOnly(null)}>Show all photos</button>
          </div>
        )}
        <div className="row between">
          <div className="chips">
            <button className={`chip ${kind === 'image' ? 'active' : ''}`} onClick={() => setKind('image')}>Photos</button>
            {galleries && <button className={`chip ${kind === 'video' ? 'active' : ''}`} onClick={() => { setOnly(null); setKind('video'); }}>Videos</button>}
            {event.raw_enabled && <button className={`chip ${kind === 'raw' ? 'active' : ''}`} onClick={() => { setOnly(null); setKind('raw'); }}>RAW files</button>}
            <span style={{ width: 12 }} />
            {kind === 'image' && (
              <>
                <button className={`chip ${!ceremonyFilter ? 'active' : ''}`} onClick={() => setCeremonyFilter('')}>All</button>
                {event.ceremonies.map((c) => <button key={c} className={`chip ${ceremonyFilter === c ? 'active' : ''}`} onClick={() => setCeremonyFilter(c)}>{c}</button>)}
              </>
            )}
          </div>
          <div className="row small muted">
            {files.length} files
            <button className="btn sm ghost" onClick={() => setSelected(selected.size === files.length ? new Set() : new Set(files.map((p) => p.id)))}>
              {selected.size === files.length && files.length ? 'Clear selection' : 'Select all'}
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="row" style={{ background: 'var(--accent-soft)', padding: 10, borderRadius: 8 }}>
            <b>{selected.size} selected</b>
            {kind === 'image' && (
              <>
                <button className="btn sm" onClick={() => bulk({ isHighlight: true })}>★ Mark highlight</button>
                <button className="btn sm" onClick={() => bulk({ isHighlight: false })}>Remove highlight</button>
                <select style={{ width: 'auto' }} value="" onChange={(e) => e.target.value && bulk({ ceremony: e.target.value })}>
                  <option value="">Move to ceremony…</option>
                  {CEREMONIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                {selected.size === 1 && (
                  <button className="btn sm" onClick={async () => { await api(`/events/${eventId}`, { method: 'PATCH', body: { coverPhotoId: ids[0] } }); setSelected(new Set()); loadEvent(); }}>Set as cover</button>
                )}
              </>
            )}
            <button className="btn sm danger" onClick={() => confirm(`Delete ${selected.size} file(s)? This cannot be undone.`) && bulk({}, 'DELETE')}>Delete</button>
          </div>
        )}

        {kind === 'image' ? (
          <div className="photo-grid">
            {files.map((p) => (
              <div key={p.id} className={`photo ${selected.has(p.id) ? 'sel' : ''}`} onClick={() => toggle(p.id)} title={p.filename}>
                {p.thumb ? <img src={p.thumb} alt={p.filename} loading="lazy" /> : <div className="center-page small muted" style={{ minHeight: '100%' }}>{p.status}…</div>}
                {p.isHighlight && <span className="tag">★ Highlight</span>}
                {event.cover_photo_id === p.id && <span className="tag" style={{ top: 'auto', bottom: 6 }}>Cover</span>}
                <span className="check">{selected.has(p.id) ? '✓' : ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th /><th>File</th><th>Size</th><th>Status</th></tr></thead>
              <tbody>
                {files.map((p) => (
                  <tr key={p.id}>
                    <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td>{p.filename}</td><td>{fmtBytes(p.bytes)}</td><td>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!files.length && <p className="muted">No files yet. Upload above.</p>}
      </div>

      {editing && <EventForm studio={studio} event={event} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); loadEvent(); }} />}
    </>
  );
}

// One message to every client of the event: "your photos are ready" (email + WhatsApp).
function NotifyClients({ event, onDone }) {
  const [state, setState] = useState({ busy: false, msg: '', error: '' });
  const send = async () => {
    if (!confirm(`Send "your photos are ready" to ${event.clients.length} client(s) of ${event.title}?`)) return;
    setState({ busy: true, msg: '', error: '' });
    try {
      const r = await api(`/events/${event.id}/notify-clients`, { method: 'POST' });
      setState({ busy: false, msg: `Sent to ${r.emails} of ${r.clients} by email${r.whatsapps ? ` and ${r.whatsapps} by WhatsApp` : ''}.`, error: '' });
      onDone();
    } catch (e) {
      setState({ busy: false, msg: '', error: e.message });
    }
  };
  return (
    <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <button className="btn accent sm" disabled={state.busy} onClick={send}>{state.busy ? 'Sending…' : 'Notify clients: photos ready'}</button>
      <span className="small muted">
        {event.clients_notified_at ? `Last sent ${new Date(event.clients_notified_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Not sent yet'}
      </span>
      {state.msg && <span className="small ok">{state.msg}</span>}
      {state.error && <span className="small error">{state.error}</span>}
    </div>
  );
}

// Uploads go straight from the browser to storage using signed URLs, a few files at a time.
function Uploader({ event, videos, onDone }) {
  const [ceremony, setCeremony] = useState('Wedding');
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total, failed }
  const inputRef = useRef();

  const start = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setProgress({ done: 0, total: files.length, failed: [] });
    const failed = [];
    let done = 0;
    for (let i = 0; i < files.length; i += 50) {
      const batch = files.slice(i, i + 50);
      let plan;
      try {
        plan = await api(`/events/${event.id}/uploads`, { method: 'POST', body: { ceremony, files: batch.map((f) => ({ name: f.name, type: f.type || 'application/octet-stream', size: f.size })) } });
      } catch (e) {
        failed.push(`${batch.length} files: ${e.message}`);
        break;
      }
      const okIds = [];
      const jobs = plan.files.map((pf, idx) => ({ pf, file: batch[idx] }));
      const worker = async () => {
        while (jobs.length) {
          const { pf, file } = jobs.shift();
          if (pf.error) failed.push(`${pf.name}: ${pf.error}`);
          else {
            try {
              const res = await fetch(pf.upload.url, { method: 'PUT', headers: pf.upload.headers, body: file });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              okIds.push(pf.photoId);
            } catch (e) {
              failed.push(`${pf.name}: ${e.message}`);
            }
          }
          done++;
          setProgress({ done, total: files.length, failed: [...failed] });
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
      if (okIds.length) await api(`/events/${event.id}/uploads/complete`, { method: 'POST', body: { photoIds: okIds } });
    }
    setProgress({ done, total: files.length, failed, finished: true });
    onDone(done - failed.length);
  };

  return (
    <div
      className={`dropzone card ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); start(e.dataTransfer.files); }}
    >
      <div className="row" style={{ justifyContent: 'center' }}>
        <label className="row small">Ceremony
          <select style={{ width: 'auto' }} value={ceremony} onChange={(e) => setCeremony(e.target.value)}>{CEREMONIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <button className="btn primary" onClick={() => inputRef.current.click()}>{videos ? 'Choose photos or videos' : 'Choose photos'}</button>
        <input ref={inputRef} type="file" multiple hidden accept={`image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.cr2,.cr3,.nef,.arw,.raf,.orf,.rw2,.dng${videos ? ',video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm' : ''}`} onChange={(e) => { start(e.target.files); e.target.value = ''; }} />
      </div>
      <p className="small muted" style={{ marginBottom: 0 }}>
        Or drag and drop. JPEG, PNG, WebP, HEIC (iPhone){videos ? ', videos (MP4, MOV, up to 5 GB each)' : ''}{event.raw_enabled ? ', and RAW files (CR3, NEF, ARW, DNG…)' : '. Turn on RAW delivery in Settings to upload RAW files'}.
      </p>
      {progress && (
        <div className="stack" style={{ marginTop: 14, gap: 6, textAlign: 'left' }}>
          <div className="progress"><i style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
          <span className="small">{progress.finished ? 'Done' : 'Uploading'} {progress.done} of {progress.total}{progress.failed.length ? ` · ${progress.failed.length} failed` : ''}</span>
          {progress.failed.slice(0, 5).map((f) => <span key={f} className="small error">{f}</span>)}
        </div>
      )}
    </div>
  );
}
