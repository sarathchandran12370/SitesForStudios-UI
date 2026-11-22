import { useEffect, useState } from 'react';
import { api, fmtDate } from '../../api.js';

const STATUSES = ['new', 'contacted', 'quoted', 'booked', 'lost'];

export default function Enquiries({ studio }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    api(`/studios/${studio.id}/enquiries`).then(setRows);
  }, [studio.id]);
  const setStatus = async (id, status) => {
    const row = await api(`/studios/enquiries/${id}`, { method: 'PATCH', body: { status } });
    setRows(rows.map((r) => (r.id === id ? row : r)));
  };
  const shown = filter ? rows.filter((r) => r.status === filter) : rows;
  return (
    <>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>All ({rows.length})</button>
        {STATUSES.map((s) => (
          <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s} ({rows.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Received</th><th>Name</th><th>Contact</th><th>Event</th><th>Details</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="small muted">{new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><b>{r.name}</b></td>
                  <td className="small">
                    <a href={`tel:${r.phone}`}>{r.phone}</a>
                    {' · '}
                    <a target="_blank" rel="noreferrer" href={`https://wa.me/${r.phone.replace(/\D/g, '')}`}>WhatsApp</a>
                    {r.email && <div><a href={`mailto:${r.email}`}>{r.email}</a></div>}
                  </td>
                  <td className="small">
                    {fmtDate(r.event_date) || '—'}
                    {r.date_available === false && <div><span className="badge warn">Date already booked</span></div>}
                    {r.date_available === true && <div><span className="badge good">Date free</span></div>}
                    {r.city && <div className="muted">{r.city}</div>}
                  </td>
                  <td className="small" style={{ maxWidth: 320 }}>
                    {[r.event_type, r.budget].filter(Boolean).join(' · ')}
                    {r.message && <div className="muted">{r.message}</div>}
                  </td>
                  <td>
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} style={{ width: 'auto' }}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={6} className="muted">No enquiries yet. They arrive from the Book an enquiry button on your website.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
