import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDate } from '../../api.js';
import { Modal } from '../../components/ui.jsx';
import { galleryClass, GalleryHero, PhotoGrid, VideoList, Lightbox, FindMe, ContactCard } from '../../components/gallery.jsx';
import PortalTop from './PortalTop.jsx';

// Tabs: Highlights · All photos (by ceremony) · Videos · Favourites (album selection) · People (faces, Find me).
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
  const [selection, setSelection] = useState(null); // { ids, limit, submittedAt, note }
  const [commented, setCommented] = useState(new Set());
  const [open, setOpen] = useState(-1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cover, setCover] = useState(null); // first photo seen; stays put while switching tabs

  const loadEvent = () =>
    api(`/portal/events/${eventId}`)
      .then((e) => {
        setEvent(e);
        setSelection(e.selection);
        setCommented(new Set(e.commented));
        return e;
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    loadEvent().then((e) => e && !e.highlightCount && setTab('all'));
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
    if (tab === 'videos') qs.set('videos', '1');
    if (tab === 'favourites') qs.set('picked', '1');
    if (tab === 'all' && ceremony) qs.set('ceremony', ceremony);
    if (tab === 'people' && cluster) qs.set('cluster', cluster.id);
    api(`/portal/events/${eventId}/photos?${qs}`).then((list) => {
      setPhotos(list);
      setCover((c) => c || list.find((p) => p.web)?.web || null);
    });
  }, [event?.id, tab, ceremony, cluster, found]);

  if (error) {
    return (
      <div className="center-page">
        <div className="portal-empty" style={{ maxWidth: 420 }}>
          <span className="portal-empty-ic" aria-hidden="true">!</span>
          <h3>We couldn't open this gallery</h3>
          <p className="muted">{error}</p>
          <Link className="btn" to="/portal">← Back to my events</Link>
        </div>
      </div>
    );
  }
  if (!event) return <div className="center-page"><p className="muted loading">Loading your gallery…</p></div>;

  const shown = tab === 'people' && found ? found : photos;
  const ids = [...selected];
  const canDownload = event.downloads !== 'none';
  const picked = new Set(selection?.ids || []);
  const locked = !!selection?.submittedAt;
  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const pick = async (id) => {
    if (locked) return setNotice('Your selection was sent to the studio. Ask them to reopen it to make changes.');
    try {
      setNotice('');
      setSelection(await api(`/portal/events/${eventId}/selection`, { method: 'PUT', body: { photoIds: [id], picked: !picked.has(id) } }));
    } catch (e) {
      setNotice(e.message);
    }
  };
  const zip = (type, extra = '') => `/api/portal/events/${eventId}/download?type=${type}${extra}`;
  const zipType = tab === 'highlights' ? 'highlights' : ceremony && tab === 'all' ? 'ceremony' : 'all';
  const showGrid = tab !== 'videos';

  return (
    <div className={`portal ${galleryClass(event.design)}`}>
      <PortalTop title={event.studioName} />
      <div className="portal-body">
        <Link to="/portal" className="back-link">← My events</Link>
        <div style={{ marginTop: 10 }}>
          <GalleryHero design={event.design} title={event.title} subtitle={[fmtDate(event.eventDate), event.venue].filter(Boolean).join(' · ')} cover={cover} />
        </div>

        <div className="ev-toolbar">
          <nav className="ev-tabs" aria-label="Gallery sections">
            {event.highlightCount > 0 && <button className={tab === 'highlights' ? 'active' : ''} onClick={() => setTab('highlights')}>Highlights ({event.highlightCount})</button>}
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All photos</button>
            {event.videoCount > 0 && <button className={tab === 'videos' ? 'active' : ''} onClick={() => setTab('videos')}>Videos ({event.videoCount})</button>}
            {event.canSelect && <button className={tab === 'favourites' ? 'active' : ''} onClick={() => setTab('favourites')}>♥ Favourites ({picked.size}{selection?.limit ? `/${selection.limit}` : ''})</button>}
            <button className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}>People</button>
          </nav>
          {canDownload && showGrid && (
            <div className="row">
              {tab !== 'favourites' && (
                <a className="btn sm" href={zip(zipType, ceremony && tab === 'all' ? `&ceremony=${encodeURIComponent(ceremony)}` : '')}>
                  ⤓ Download {tab === 'highlights' ? 'highlights' : ceremony && tab === 'all' ? ceremony : 'all photos'}
                </a>
              )}
              {event.rawAvailable && event.downloads === 'full' && <a className="btn sm" href={zip('raw')}>⤓ RAW files ({event.rawCount})</a>}
            </div>
          )}
          {canDownload && tab === 'videos' && event.downloads === 'full' && <a className="btn sm" href={zip('videos')}>⤓ Download all videos</a>}
        </div>
        {event.downloads === 'web' && <p className="small muted ev-note">Your photographer has made web-size downloads available for this gallery.</p>}
        {!canDownload && <p className="small muted ev-note">Downloads are turned off for this gallery. Contact your photographer for copies.</p>}

        {event.canSelect && (
          <SelectionBar
            selection={selection}
            count={picked.size}
            notice={notice}
            onSend={() => setSending(true)}
            onView={() => setTab('favourites')}
          />
        )}

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

        {tab === 'videos' ? (
          <VideoList videos={photos} downloadHref={event.downloads === 'full' ? (v) => `/api/portal/photos/${v.id}/download` : null} />
        ) : (
          <PhotoGrid
            photos={shown}
            layout={event.design.layout}
            onOpen={setOpen}
            picked={picked}
            onPick={event.canSelect ? pick : null}
            selected={selected}
            onSelect={canDownload ? toggle : null}
            commented={commented}
            protect={!canDownload}
          />
        )}
        {showGrid && !shown.length && tab !== 'people' && (
          <div className="portal-empty">
            <span className="portal-empty-ic" aria-hidden="true">{tab === 'favourites' ? '♡' : '◐'}</span>
            <p className="muted">{tab === 'favourites' ? 'Tap ♡ on photos you love to add them to your album selection.' : 'No photos here yet.'}</p>
          </div>
        )}

        {event.canSelect && <ReviewCard eventId={event.id} review={event.review} studioName={event.studioName} onSaved={loadEvent} />}
        <ContactCard studio={event.studio} />
      </div>

      {selected.size > 0 && (
        <div className="download-bar">
          <span><b>{selected.size}</b> selected</span>
          <a className="btn sm" href={zip('selected', `&ids=${ids.join(',')}`)}>⤓ Download</a>
          <button className="btn sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      {open >= 0 && shown[open] && (
        <Lightbox
          photos={shown}
          index={open}
          setIndex={setOpen}
          downloadHref={canDownload ? (p) => `/api/portal/photos/${p.id}/download` : null}
          picked={picked}
          onPick={event.canSelect ? pick : null}
          protect={!canDownload}
          aside={event.canSelect ? (p) => <Comments key={p.id} photoId={p.id} onPosted={() => setCommented(new Set([...commented, p.id]))} /> : null}
        />
      )}
      {sending && (
        <SendSelection
          eventId={event.id}
          count={picked.size}
          onClose={() => setSending(false)}
          onSent={(s) => { setSelection(s); setSending(false); }}
        />
      )}
    </div>
  );
}

function SelectionBar({ selection, count, notice, onSend, onView }) {
  const limit = selection?.limit;
  return (
    <div className="card selection-bar">
      <div>
        <b>Album selection</b>
        <div className="small muted">
          {selection?.submittedAt
            ? `Sent to your photographer on ${new Date(selection.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. To change it, ask them to reopen your selection.`
            : `Tap ♡ on the photos you want in your album${limit ? ` (up to ${limit})` : ''}, then send your selection to the studio.`}
        </div>
        {notice && <div className="small error">{notice}</div>}
      </div>
      <div className="row">
        <button className="btn sm" onClick={onView}>View {count}{limit ? ` of ${limit}` : ''}</button>
        {!selection?.submittedAt && <button className="btn sm accent" disabled={!count} onClick={onSend}>Send to studio</button>}
      </div>
    </div>
  );
}

function SendSelection({ eventId, count, onClose, onSent }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async () => {
    setBusy(true);
    try {
      onSent(await api(`/portal/events/${eventId}/selection/submit`, { method: 'POST', body: { note } }));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal title="Send your selection" onClose={onClose}>
      <div className="stack">
        <p style={{ margin: 0 }}>You picked <b>{count} photos</b>. After sending, your selection is locked until the studio reopens it.</p>
        <label className="stack small" style={{ gap: 4 }}>Note for the studio (optional)
          <textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: please use photo 3 for the album cover" />
        </label>
        {error && <p className="error small">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn accent" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send to studio'}</button>
        </div>
      </div>
    </Modal>
  );
}

// Comments on one photo: only this client and the studio see them.
function Comments({ photoId, onPosted }) {
  const [items, setItems] = useState(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/portal/photos/${photoId}/comments`).then(setItems).catch((e) => setError(e.message));
  }, [photoId]);
  const post = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      setItems(await api(`/portal/photos/${photoId}/comments`, { method: 'POST', body: { body } }));
      setBody('');
      onPosted();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="stack" style={{ height: '100%' }}>
      <h3 style={{ margin: 0, color: 'inherit' }}>Comments</h3>
      <p className="small" style={{ margin: 0, opacity: 0.7 }}>Ask for an edit or leave a note. Only you and the studio see this.</p>
      <div className="comments">
        {items?.map((c) => (
          <div key={c.id} className={`comment ${c.from_studio ? 'studio' : ''}`}>
            <div className="small" style={{ opacity: 0.7 }}>{c.from_studio ? 'Studio' : 'You'} · {new Date(c.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            <div>{c.body}</div>
          </div>
        ))}
        {items && !items.length && <p className="small" style={{ opacity: 0.6 }}>No comments yet.</p>}
      </div>
      <form className="stack" style={{ gap: 6 }} onSubmit={post}>
        <textarea rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment…" />
        {error && <span className="small error">{error}</span>}
        <button className="btn sm accent" disabled={!body.trim()}>Send</button>
      </form>
    </div>
  );
}

function Stars({ value, onChange }) {
  return (
    <div className="stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= value ? 'on' : ''} onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}

function ReviewCard({ eventId, review, studioName, onSaved }) {
  const [editing, setEditing] = useState(!review);
  const [rating, setRating] = useState(review?.rating || 5);
  const [body, setBody] = useState(review?.body || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/portal/events/${eventId}/review`, { method: 'PUT', body: { rating, body } });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  if (!editing && review) {
    return (
      <section className="card review-card">
        <div className="row between">
          <div>
            <b>Your review</b> <span className="stars-static">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
            <p style={{ margin: '6px 0 0' }}>“{review.body}”</p>
            <span className="small muted">{review.status === 'published' ? `Shown on ${studioName}'s website.` : review.status === 'hidden' ? 'Not shown on the website.' : 'Waiting for the studio to publish it.'}</span>
          </div>
          <button className="btn sm" onClick={() => setEditing(true)}>Edit</button>
        </div>
      </section>
    );
  }
  return (
    <form className="card review-card stack" onSubmit={save}>
      <div>
        <h3 style={{ margin: 0 }}>Loved your photos?</h3>
        <p className="small muted" style={{ margin: 0 }}>Leave a review for {studioName}. With your permission they may show it on their website.</p>
      </div>
      <Stars value={rating} onChange={setRating} />
      <textarea rows={3} maxLength={1500} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How was your experience?" />
      {error && <span className="small error">{error}</span>}
      <div className="row">
        <button className="btn accent sm" disabled={busy || body.trim().length < 10}>{busy ? 'Saving…' : 'Submit review'}</button>
        {review && <button type="button" className="btn sm" onClick={() => setEditing(false)}>Cancel</button>}
      </div>
    </form>
  );
}

function PeoplePanel({ event, people, cluster, setCluster, onRenamed, onFound, found }) {
  const [name, setName] = useState('');
  useEffect(() => setName(cluster?.label || ''), [cluster]);

  if (!event.facesEnabled) {
    return <div className="card muted" style={{ marginBottom: 16 }}>Face recognition is not turned on for this event yet. Ask your studio if you would like it.</div>;
  }
  const search = (file) => api(`/portal/events/${event.id}/find-me`, { method: 'POST', raw: true, body: file, headers: { 'Content-Type': file.type || 'image/jpeg' } });
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
      <FindMe search={search} onFound={onFound} found={found} />
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
