import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtBytes, fmtDate } from '../../api.js';
import { Modal, useAsync } from '../../components/ui.jsx';

export default function StudioEvents({ studio }) {
  const [events, setEvents] = useState([]);
  const [creating, setCreating] = useState(false);
  const load = () => api(`/events/studio/${studio.id}`).then(setEvents);
  useEffect(() => {
    load();
  }, [studio.id]);
  return (
    <>
      <div className="row between" style={{ marginBottom: 14 }}>
        <p className="muted" style={{ margin: 0 }}>
          {studio.plan?.client_galleries === false
            ? `${events.length} portfolio album${events.length === 1 ? '' : 's'}. Highlights from albums marked "Portfolio" appear on your website.`
            : `${events.length} events`}
        </p>
        <button className="btn primary" onClick={() => setCreating(true)}>{studio.plan?.client_galleries === false ? 'New album' : 'New event'}</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Clients</th><th>Storage</th><th>Options</th><th /></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.title}</b></td>
                  <td>{fmtDate(e.event_date)}</td>
                  <td className="muted">{e.venue}</td>
                  <td>{e.client_count}</td>
                  <td>{fmtBytes(e.storage_bytes)}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {e.raw_enabled && <span className="badge">RAW</span>}
                      {e.face_enabled && <span className="badge">Faces</span>}
                      {e.show_in_portfolio && <span className="badge accent">Portfolio</span>}
                    </div>
                  </td>
                  <td><Link className="btn sm" to={`/events/${e.id}`}>Manage</Link></td>
                </tr>
              ))}
              {!events.length && <tr><td colSpan={7} className="muted">No events yet. Create one, upload photos, then add the couple as a client.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {creating && <EventForm studio={studio} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </>
  );
}

export function EventForm({ studio, event, onClose, onSaved }) {
  const [f, setF] = useState({
    title: event?.title || '',
    eventDate: event?.event_date || '',
    venue: event?.venue || '',
    rawEnabled: event?.raw_enabled || false,
    faceEnabled: event?.face_enabled ?? false,
    showInPortfolio: event?.show_in_portfolio ?? studio.plan?.client_galleries === false,
  });
  const galleries = studio.plan?.client_galleries !== false;
  const faces = galleries && studio.plan?.face_events_per_month > 0;
  const { busy, error, run } = useAsync();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = (e) => {
    e.preventDefault();
    const body = { ...f, eventDate: f.eventDate || null, venue: f.venue || null };
    run(async () => onSaved(event ? await api(`/events/${event.id}`, { method: 'PATCH', body }) : await api(`/events/studio/${studio.id}`, { method: 'POST', body })));
  };
  return (
    <Modal title={event ? (galleries ? 'Event settings' : 'Album settings') : galleries ? 'New event' : 'New portfolio album'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <label className="field">Title<input placeholder="Anjali & Rahul" value={f.title} onChange={set('title')} required /></label>
        <div className="grid2">
          <label className="field">Date<input type="date" value={f.eventDate} onChange={set('eventDate')} /></label>
          <label className="field">Venue<input value={f.venue} onChange={set('venue')} /></label>
        </div>
        {galleries && (
          <>
            <label className="row"><input type="checkbox" checked={f.rawEnabled} onChange={set('rawEnabled')} disabled={!studio.plan.raw_delivery} /> Deliver RAW files to the couple {!studio.plan.raw_delivery && <span className="small muted">(Pro plan)</span>}</label>
            {faces && <label className="row"><input type="checkbox" checked={f.faceEnabled} onChange={set('faceEnabled')} /> Face recognition (People tab and Find me)</label>}
          </>
        )}
        <label className="row"><input type="checkbox" checked={f.showInPortfolio} onChange={set('showInPortfolio')} /> Show highlights in the website portfolio</label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>{event ? 'Save' : galleries ? 'Create event' : 'Create album'}</button>
      </form>
    </Modal>
  );
}
