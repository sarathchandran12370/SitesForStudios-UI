import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAsync } from '../../components/ui.jsx';
import { STATUS_LABEL } from './Bookings.jsx';

const EVENT_TYPES = [
  ['wedding', 'Wedding'], ['engagement', 'Engagement'], ['pre_wedding', 'Pre-wedding shoot'], ['reception', 'Reception'],
  ['birthday', 'Birthday'], ['maternity', 'Maternity'], ['baby', 'Baby / newborn'], ['corporate', 'Corporate'], ['other', 'Other'],
];
const SESSION_NAMES = ['Wedding', 'Reception', 'Engagement', 'Haldi', 'Mehendi', 'Sangeet', 'Pre-wedding shoot', 'Post-wedding shoot', 'Betrothal', 'Muhurtham', 'Nikah', 'Church wedding'];
const emptySession = (date = '') => ({ label: 'Wedding', date, startTime: '', endTime: '', venue: '' });
const knownEventType = (t) => EVENT_TYPES.find(([id, label]) => id === t || label.toLowerCase() === String(t || '').toLowerCase())?.[0];

/** Create a booking (optionally from an enquiry or a calendar date), or edit one (pass `booking`). */
export default function BookingEditor({ studio, booking, onSaved, onCancel }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const enquiry = useLocation().state?.enquiry;
  const base = `/studio/${studio.id}/bookings`;
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const [events, setEvents] = useState([]);
  const { busy, error, run } = useAsync();
  const [f, setF] = useState(() => {
    if (booking) {
      return {
        title: booking.title, eventType: booking.event_type, status: booking.status,
        client: { name: booking.client_name, phone: booking.client_phone || '', email: booking.client_email || '' },
        clientAccountId: booking.client_account_id || '', enquiryId: booking.enquiry_id || null, eventId: booking.event_id || '',
        packageAmount: booking.package_paise == null ? '' : booking.package_paise / 100, team: booking.team || [], notes: booking.notes || '',
        sessions: booking.sessions.map((s) => ({ label: s.label, date: s.date, startTime: s.start_time || '', endTime: s.end_time || '', venue: s.venue || '' })),
        notifyClient: false,
      };
    }
    return {
      title: enquiry ? `${enquiry.name}${enquiry.event_type ? ` ${enquiry.event_type.toLowerCase()}` : ' wedding'}` : '',
      eventType: knownEventType(enquiry?.event_type) || 'wedding',
      status: 'confirmed',
      client: { name: enquiry?.name || '', phone: enquiry?.phone || '', email: enquiry?.email || '' },
      clientAccountId: '', enquiryId: enquiry?.id || null, eventId: '', packageAmount: '', team: [], notes: enquiry?.message || '',
      sessions: [{ ...emptySession(enquiry?.event_date ? String(enquiry.event_date).slice(0, 10) : params.get('date') || ''), venue: enquiry?.city || '' }],
      notifyClient: false,
    };
  });

  useEffect(() => {
    Promise.all([
      studio.plan?.client_galleries === false ? [] : api(`/studios/${studio.id}/accounts?role=client`),
      api(`/studios/${studio.id}/accounts?role=staff`),
      api(`/events/studio/${studio.id}`),
    ]).then(([c, t, e]) => { setClients(c); setTeam(t); setEvents(e); }).catch(() => {});
  }, [studio.id]);

  const set = (patch) => setF({ ...f, ...patch });
  const setClient = (k) => (e) => set({ client: { ...f.client, [k]: e.target.value } });
  const setSession = (i, k) => (e) => set({ sessions: f.sessions.map((s, j) => (j === i ? { ...s, [k]: e.target.value } : s)) });
  const pickClient = (id) => {
    const c = clients.find((x) => x.id === id);
    set({ clientAccountId: id, client: c ? { name: c.name, email: c.email, phone: c.phone || '' } : f.client, title: f.title || (c ? `${c.name} wedding` : '') });
  };
  const toggleTeam = (id) => set({ team: f.team.includes(id) ? f.team.filter((x) => x !== id) : [...f.team, id] });
  const canEmail = !!f.client.email.trim() && f.status === 'confirmed';

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const body = {
        ...f,
        clientAccountId: f.clientAccountId || null,
        eventId: f.eventId || null,
        packageAmount: f.packageAmount === '' ? null : Number(f.packageAmount),
        client: { ...f.client, email: f.client.email.trim() || null },
        notifyClient: canEmail && f.notifyClient,
      };
      const saved = booking ? await api(`/bookings/${booking.id}`, { method: 'PUT', body }) : await api(`/bookings/studio/${studio.id}`, { method: 'POST', body });
      if (onSaved) onSaved(saved);
      else nav(`${base}/${saved.id}`, { state: { saved } });
    });
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="row between">
        <h2 style={{ margin: 0 }}>{booking ? 'Edit booking' : 'New booking'}</h2>
        {onCancel ? <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button> : <Link className="btn ghost" to={base}>Back to calendar</Link>}
      </div>
      {enquiry && <div className="card small" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>Booking the enquiry from <b>{enquiry.name}</b>. The enquiry will be marked as booked.</div>}

      <div className="card stack">
        <div className="grid2">
          <label className="field">Booking name<input id="bk-title" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Anu & Vivek wedding" required maxLength={120} /></label>
          <label className="field">Type
            <select id="bk-type" value={f.eventType} onChange={(e) => set({ eventType: e.target.value })}>{EVENT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          </label>
          <label className="field">Status
            <select id="bk-status" value={f.status} onChange={(e) => set({ status: e.target.value })}>
              {Object.entries(STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            {f.status === 'tentative' && <span className="small muted" style={{ fontWeight: 400 }}>The date is held: your website shows it as taken.</span>}
          </label>
          <label className="field">Package amount (₹, optional)<input id="bk-package" type="number" min="0" step="1" value={f.packageAmount} onChange={(e) => set({ packageAmount: e.target.value })} /></label>
        </div>
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Client</h3>
        <div className="grid2">
          {clients.length > 0 && (
            <label className="field">Client with a login
              <select id="bk-client" value={f.clientAccountId} onChange={(e) => pickClient(e.target.value)}>
                <option value="">None</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </label>
          )}
          <label className="field">Name<input id="bk-name" value={f.client.name} onChange={setClient('name')} required maxLength={120} /></label>
          <label className="field">Phone / WhatsApp<input id="bk-phone" value={f.client.phone} onChange={setClient('phone')} maxLength={20} /></label>
          <label className="field">Email<input id="bk-email" type="email" value={f.client.email} onChange={setClient('email')} /></label>
        </div>
      </div>

      <div className="card stack">
        <div className="row between">
          <h3 style={{ margin: 0 }}>Dates and sessions</h3>
          <button type="button" className="btn sm" disabled={f.sessions.length >= 15} onClick={() => set({ sessions: [...f.sessions, emptySession(f.sessions.at(-1)?.date || '')] })}>+ Add session</button>
        </div>
        <datalist id="bk-session-names">{SESSION_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
        {f.sessions.map((s, i) => (
          <div key={i} className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', alignItems: 'end', paddingBottom: 12, borderBottom: i < f.sessions.length - 1 ? '1px solid var(--line)' : 0 }}>
            <label className="field">Session<input id={`bk-s${i}-label`} list="bk-session-names" value={s.label} onChange={setSession(i, 'label')} required maxLength={60} /></label>
            <label className="field">Date<input id={`bk-s${i}-date`} type="date" value={s.date} onChange={setSession(i, 'date')} required /></label>
            <label className="field">Starts<input id={`bk-s${i}-start`} type="time" value={s.startTime} onChange={setSession(i, 'startTime')} /></label>
            <label className="field">Ends<input id={`bk-s${i}-end`} type="time" value={s.endTime} onChange={setSession(i, 'endTime')} /></label>
            <label className="field" style={{ gridColumn: 'span 2' }}>Venue<input id={`bk-s${i}-venue`} value={s.venue} onChange={setSession(i, 'venue')} maxLength={200} /></label>
            <div>{f.sessions.length > 1 && <button type="button" className="btn ghost sm danger" onClick={() => set({ sessions: f.sessions.filter((_, j) => j !== i) })}>Remove</button>}</div>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Team and gallery</h3>
        {team.length ? (
          <div className="row">
            {team.map((t) => (
              <label key={t.id} className="row" style={{ gap: 6 }}><input type="checkbox" checked={f.team.includes(t.id)} onChange={() => toggleTeam(t.id)} /> {t.name}</label>
            ))}
          </div>
        ) : <p className="small muted" style={{ margin: 0 }}>Add team members in the Team tab to assign them to shoots.</p>}
        {events.length > 0 && (
          <label className="field">Gallery event (optional)
            <select id="bk-event" value={f.eventId} onChange={(e) => set({ eventId: e.target.value })}>
              <option value="">Not linked</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </label>
        )}
        <label className="field">Notes for the team<textarea id="bk-notes" value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={4000} placeholder="Deliverables, family contacts, drone permission…" style={{ minHeight: 70 }} /></label>
      </div>

      {canEmail && <label className="row"><input type="checkbox" checked={f.notifyClient} onChange={(e) => set({ notifyClient: e.target.checked })} /> Email the confirmed dates to {f.client.email}</label>}
      {error && <div className="error">{error}</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn primary" disabled={busy}>{booking ? 'Save changes' : 'Save booking'}</button>
      </div>
    </form>
  );
}
