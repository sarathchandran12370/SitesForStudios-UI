// Studio-side gallery tools on the event page: gallery settings, guest share link, client selections, comments.
import { useEffect, useState } from 'react';
import { api } from '../../api.js';

const DESIGN_LABELS = {
  layout: [['masonry', 'Masonry'], ['grid', 'Square grid'], ['rows', 'Rows']],
  theme: [['light', 'Light'], ['dark', 'Dark']],
  font: [['classic', 'Classic serif'], ['modern', 'Modern'], ['editorial', 'Editorial italic']],
  cover: [['full', 'Full-width photo'], ['split', 'Photo and title side by side'], ['minimal', 'Title only']],
};

function Saved({ state }) {
  if (state.error) return <span className="small error">{state.error}</span>;
  if (state.saved) return <span className="small ok">Saved</span>;
  return null;
}

/** Selection limit, downloads, watermark and gallery design. */
export function GallerySettings({ event, studioName, onSaved }) {
  const [state, setState] = useState({});
  const [limit, setLimit] = useState(event.selection_limit || '');
  const save = async (body) => {
    setState({});
    try {
      await api(`/events/${event.id}/gallery`, { method: 'PUT', body });
      setState({ saved: true });
      onSaved();
    } catch (e) {
      setState({ error: e.message });
    }
  };
  const d = event.design;
  return (
    <div className="card stack">
      <div className="row between">
        <h3 style={{ margin: 0 }}>Gallery settings</h3>
        <Saved state={state} />
      </div>
      <div className="grid-2">
        <label className="stack small" style={{ gap: 4 }}>Client downloads
          <select value={event.downloads} onChange={(e) => save({ downloads: e.target.value })}>
            <option value="full">Full resolution</option>
            <option value="web">Web size only (2048 px)</option>
            <option value="none">Off: view only</option>
          </select>
        </label>
        <label className="stack small" style={{ gap: 4 }}>Album selection limit
          <div className="row">
            <input type="number" min={1} max={5000} placeholder="No limit" value={limit} onChange={(e) => setLimit(e.target.value)} style={{ maxWidth: 140 }} />
            <button className="btn sm" onClick={() => save({ selectionLimit: limit ? Number(limit) : null })}>Save</button>
          </div>
        </label>
      </div>
      <label className="row small">
        <input type="checkbox" checked={event.watermark} onChange={(e) => save({ watermark: e.target.checked })} />
        Watermark large previews and web-size downloads with “© {studioName}”
      </label>
      <div className="grid-2">
        {Object.entries(DESIGN_LABELS).map(([key, options]) => (
          <label key={key} className="stack small" style={{ gap: 4 }}>
            {{ layout: 'Photo layout', theme: 'Colour', font: 'Title font', cover: 'Cover' }[key]}
            <select value={d[key]} onChange={(e) => save({ design: { [key]: e.target.value } })}>
              {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Guest share link: on/off, password, downloads, new link. */
export function ShareLink({ event, onSaved }) {
  const [state, setState] = useState({});
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const save = async (body, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    setState({});
    try {
      await api(`/events/${event.id}/share`, { method: 'PUT', body });
      setState({ saved: true });
      setPassword('');
      onSaved();
    } catch (e) {
      setState({ error: e.message });
    }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(event.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const on = event.share_enabled && event.share_url;
  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <h3 style={{ margin: 0 }}>Guest share link</h3>
          <p className="small muted" style={{ margin: 0 }}>Relatives and guests can view the gallery without an account. They never see RAW files, favourites or comments.</p>
        </div>
        <Saved state={state} />
      </div>
      {!on ? (
        <button className="btn accent sm" style={{ justifySelf: 'start' }} onClick={() => save({ enabled: true })}>Create share link</button>
      ) : (
        <>
          <div className="row">
            <input readOnly value={event.share_url} onFocus={(e) => e.target.select()} style={{ flex: 1, minWidth: 220 }} />
            <button className="btn sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
            <a className="btn sm" href={`https://wa.me/?text=${encodeURIComponent(`Photos from ${event.title}: ${event.share_url}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
          <div className="row small">
            <span>{event.share_has_password ? 'Password protected.' : 'No password: anyone with the link can view.'}</span>
            <input type="text" placeholder={event.share_has_password ? 'New password' : 'Set a password'} value={password} onChange={(e) => setPassword(e.target.value)} style={{ maxWidth: 180 }} />
            <button className="btn sm" disabled={password.length < 4} onClick={() => save({ password })}>Save password</button>
            {event.share_has_password && <button className="btn sm ghost" onClick={() => save({ password: null })}>Remove password</button>}
          </div>
          <label className="row small">
            <input type="checkbox" checked={event.share_downloads} onChange={(e) => save({ downloads: e.target.checked })} />
            Guests can download (follows the client download setting above)
          </label>
          <div className="row">
            <button className="btn sm" onClick={() => save({ regenerate: true }, 'Make a new link? The current link will stop working.')}>New link</button>
            <button className="btn sm danger" onClick={() => save({ enabled: false })}>Turn off link</button>
          </div>
        </>
      )}
    </div>
  );
}

const stripExt = (f) => String(f).replace(/\.[^.]+$/, '');

/** Each client's album selection, with file names to paste into Lightroom or Capture One. */
export function Selections({ event, onShow }) {
  const [list, setList] = useState(null);
  const [copied, setCopied] = useState('');
  const load = () => api(`/events/${event.id}/selections`).then(setList);
  useEffect(() => {
    load();
  }, [event.id]);
  if (!list) return null;
  const withPicks = list.filter((c) => c.count > 0);
  const copy = async (c, format) => {
    const names = c.photos.map((p) => stripExt(p.filename));
    await navigator.clipboard.writeText(format === 'lr' ? names.join(', ') : names.join(' '));
    setCopied(`${c.accountId}:${format}`);
    setTimeout(() => setCopied(''), 2000);
  };
  const csv = (c) => {
    const rows = [['filename', 'ceremony'], ...c.photos.map((p) => [p.filename, p.ceremony])];
    const blob = new Blob([rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${event.title} - ${c.name} selection.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const reopen = async (c) => {
    if (!confirm(`Reopen ${c.name}'s selection so they can change it?`)) return;
    await api(`/events/${event.id}/selections/${c.accountId}/reopen`, { method: 'POST' });
    load();
  };
  return (
    <div className="card stack">
      <div className="row between">
        <h3 style={{ margin: 0 }}>Album selections</h3>
        <span className="small muted">{event.selection_limit ? `Limit ${event.selection_limit} photos per client` : 'No limit'}</span>
      </div>
      {!withPicks.length && <p className="small muted" style={{ margin: 0 }}>No picks yet. Clients tap ♡ on photos in their gallery and send the selection to you.</p>}
      {withPicks.map((c) => (
        <div key={c.accountId} className="stack" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <div className="row between">
            <div>
              <b>{c.name}</b> <span className="small muted">· {c.count} photos · {c.submittedAt ? `sent ${new Date(c.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : 'still choosing'}</span>
              {c.note && <div className="small">“{c.note}”</div>}
            </div>
            <div className="row">
              <button className="btn sm" onClick={() => onShow(c.photos.map((p) => p.id), c.name)}>Show photos</button>
              <button className="btn sm" title="Lightroom: Library filter > Text > Filename > Contains, paste" onClick={() => copy(c, 'lr')}>{copied === `${c.accountId}:lr` ? 'Copied' : 'Copy for Lightroom'}</button>
              <button className="btn sm" title="Capture One: Filters > Search, paste" onClick={() => copy(c, 'c1')}>{copied === `${c.accountId}:c1` ? 'Copied' : 'Copy for Capture One'}</button>
              <button className="btn sm" onClick={() => csv(c)}>CSV</button>
              {c.submittedAt && <button className="btn sm ghost" onClick={() => reopen(c)}>Reopen</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Comment threads from clients, newest first; the studio replies in each thread. */
export function CommentThreads({ event }) {
  const [threads, setThreads] = useState(null);
  const [drafts, setDrafts] = useState({});
  const load = () => api(`/events/${event.id}/comments`).then(setThreads);
  useEffect(() => {
    load();
  }, [event.id]);
  if (!threads?.length) return null;
  const reply = async (t) => {
    const k = `${t.photoId}:${t.clientAccountId}`;
    if (!drafts[k]?.trim()) return;
    await api(`/events/${event.id}/photos/${t.photoId}/comments`, { method: 'POST', body: { clientAccountId: t.clientAccountId, body: drafts[k] } });
    setDrafts({ ...drafts, [k]: '' });
    load();
  };
  const waiting = threads.filter((t) => t.awaitingReply).length;
  return (
    <div className="card stack">
      <div className="row between">
        <h3 style={{ margin: 0 }}>Comments from clients</h3>
        {waiting > 0 && <span className="badge">{waiting} waiting for a reply</span>}
      </div>
      {threads.map((t) => {
        const k = `${t.photoId}:${t.clientAccountId}`;
        return (
          <div key={k} className="row" style={{ alignItems: 'flex-start', borderTop: '1px solid var(--line)', paddingTop: 10, gap: 12 }}>
            {t.photo?.thumb ? <img src={t.photo.thumb} alt={t.photo.filename} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 6 }} /> : <div style={{ width: 96 }} />}
            <div className="stack" style={{ flex: 1, gap: 4 }}>
              <div className="small muted">{t.photo?.filename} · {t.clientName}</div>
              {t.comments.map((c, i) => (
                <div key={i} className="small"><b>{c.fromStudio ? c.authorName || 'Studio' : t.clientName}:</b> {c.body}</div>
              ))}
              <div className="row">
                <input placeholder="Reply…" value={drafts[k] || ''} onChange={(e) => setDrafts({ ...drafts, [k]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && reply(t)} style={{ flex: 1 }} />
                <button className="btn sm" onClick={() => reply(t)}>Reply</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
