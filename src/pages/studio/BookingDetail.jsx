import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, fmtDate, rupees } from '../../api.js';
import { useAsync } from '../../components/ui.jsx';
import BookingEditor from './BookingEditor.jsx';
import { STATUS_LABEL, STATUS_TONE } from './Bookings.jsx';

const longDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function BookingDetail({ studio, bookingId }) {
  const nav = useNavigate();
  const loc = useLocation();
  const base = `/studio/${studio.id}/bookings`;
  const [b, setB] = useState(loc.state?.saved?.id === bookingId ? loc.state.saved : null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const { busy, error, setError, run } = useAsync();
  useEffect(() => {
    api(`/bookings/${bookingId}`).then(setB).catch((e) => setError(e.message));
  }, [bookingId]);
  useEffect(() => {
    if (loc.state?.saved?.emailed) setNotice(`Booking saved and the dates were emailed to ${loc.state.saved.client_email}.`);
  }, []);

  if (error && !b) return <p className="error">{error} <Link to={base}>Back to calendar</Link></p>;
  if (!b) return <p className="muted">Loading…</p>;
  if (editing) return <BookingEditor studio={studio} booking={b} onCancel={() => setEditing(false)} onSaved={(x) => { setB(x); setEditing(false); setNotice(x.emailed ? `Saved. The updated dates were emailed to ${x.client_email}.` : 'Saved.'); }} />;

  const setStatus = (status) =>
    run(async () => {
      const notifyClient = status === 'confirmed' && !!b.client_email && confirm(`Email the confirmed dates to ${b.client_email}?`);
      const x = await api(`/bookings/${b.id}/status`, { method: 'PATCH', body: { status, notifyClient } });
      setB(x);
      setNotice(`Marked as ${STATUS_LABEL[status].toLowerCase()}.${x.emailed ? ' The client was emailed.' : ''}`);
    });
  const remove = () => confirm(`Delete the booking "${b.title}"? This cannot be undone. Invoices raised for it are kept.`) && run(async () => { await api(`/bookings/${b.id}`, { method: 'DELETE' }); nav(base); });
  const firstMonth = b.start_date.slice(0, 7).split('-').map(Number).join('-');
  const phone = (b.client_phone || '').replace(/\D/g, '');
  const wa = phone ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}` : null;
  const left = b.package_paise != null ? b.package_paise - b.billed_paise : null;
  const invoiceState = {
    booking: {
      id: b.id, title: b.title, client_account_id: b.client_account_id, event_id: b.event_id,
      customer: { name: b.client_name, email: b.client_email || '', phone: b.client_phone || '' },
      line: left && left > 0 ? { description: `${b.title}${b.billed_paise ? ' (balance)' : ''}`, rate: left / 100 } : { description: b.title, rate: '' },
    },
  };

  return (
    <div className="stack">
      <div className="row between">
        <Link className="btn ghost" to={`${base}?month=${firstMonth}`}>← Calendar</Link>
        <div className="row">
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          <Link className="btn primary" to={`/studio/${studio.id}/invoices/new`} state={invoiceState}>Create invoice</Link>
        </div>
      </div>
      {notice && <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>{notice}</div>}
      {error && <div className="error">{error}</div>}
      {b.conflicts.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--warn)' }}>
          <b style={{ color: 'var(--warn)' }}>Double booking</b>
          {b.conflicts.map((c) => (
            <div key={`${c.booking_id}-${c.date}`} className="small">{fmtDate(c.date)}: also <Link to={`${base}/${c.booking_id}`}>{c.title}</Link> ({STATUS_LABEL[c.status].toLowerCase()})</div>
          ))}
        </div>
      )}

      <div className="card stack">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0 }}>{b.title} <span className={`badge ${STATUS_TONE[b.status]}`}>{STATUS_LABEL[b.status]}</span></h2>
            <div className="small muted">{b.start_date === b.end_date ? longDate(b.start_date) : `${longDate(b.start_date)} to ${longDate(b.end_date)}`}</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {b.status === 'tentative' && <button className="btn sm primary" disabled={busy} onClick={() => setStatus('confirmed')}>Confirm booking</button>}
            {b.status === 'confirmed' && <button className="btn sm" disabled={busy} onClick={() => setStatus('completed')}>Mark completed</button>}
            {b.status === 'cancelled' && <button className="btn sm" disabled={busy} onClick={() => setStatus('confirmed')}>Restore booking</button>}
            {['tentative', 'confirmed'].includes(b.status) && <button className="btn sm danger" disabled={busy} onClick={() => confirm('Cancel this booking? The date becomes free on your website.') && setStatus('cancelled')}>Cancel booking</button>}
          </div>
        </div>

        <div className="grid2">
          <div>
            <div className="small muted">Client</div>
            <b>{b.client_name}</b>
            {b.client_phone && <div className="small"><a href={`tel:${b.client_phone}`}>{b.client_phone}</a>{wa && <> · <a href={wa} target="_blank" rel="noreferrer">WhatsApp</a></>}</div>}
            {b.client_email && <div className="small">{b.client_email}</div>}
          </div>
          <div>
            <div className="small muted">Team</div>
            {b.team_members.length ? b.team_members.map((t) => <div key={t.id}>{t.name}</div>) : <span className="muted small">Nobody assigned</span>}
          </div>
          {b.event_title && <div><div className="small muted">Gallery</div><Link to={`/events/${b.event_id}`}>{b.event_title}</Link></div>}
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Session</th><th>Date</th><th>Time</th><th>Venue</th></tr></thead>
            <tbody>
              {b.sessions.map((s) => (
                <tr key={s.id}><td><b>{s.label}</b></td><td>{longDate(s.date)}</td><td>{s.start_time ? `${s.start_time}${s.end_time ? `–${s.end_time}` : ''}` : '—'}</td><td>{s.venue || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {b.notes && <p className="small" style={{ margin: 0, whiteSpace: 'pre-line' }}><span className="muted">Notes: </span>{b.notes}</p>}
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Money</h3>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div className="stat"><span className="small muted">Package</span><b>{b.package_paise != null ? rupees(b.package_paise) : '—'}</b></div>
          <div className="stat"><span className="small muted">Invoiced</span><b>{rupees(b.billed_paise)}</b></div>
          <div className="stat"><span className="small muted">Received</span><b>{rupees(b.paid_paise)}</b></div>
          <div className="stat"><span className="small muted">Still to invoice</span><b>{left != null ? rupees(Math.max(0, left)) : '—'}</b></div>
        </div>
        {b.invoices.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {b.invoices.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/studio/${studio.id}/invoices/${i.id}`}>{i.number || 'Draft'}</Link></td>
                    <td className="small">{fmtDate(i.issue_date)}</td>
                    <td style={{ textAlign: 'right' }}>{rupees(i.total_paise)}</td>
                    <td className="small muted" style={{ textAlign: 'right' }}>{i.status === 'draft' ? 'draft' : i.status === 'cancelled' ? 'cancelled' : `${rupees(i.paid_paise)} paid`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ margin: 0 }}>Invoiced includes GST where charged. Use Create invoice for the advance and the balance.</p>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn danger" onClick={remove}>Delete booking</button>
      </div>
    </div>
  );
}
