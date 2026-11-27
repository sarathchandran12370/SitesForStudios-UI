// Reviews clients leave from their galleries. Published reviews show in the website's Testimonials section.
import { useEffect, useState } from 'react';
import { api, fmtDate } from '../../api.js';

const STATUS = { pending: ['New', 'warn'], published: ['On website', 'good'], hidden: ['Hidden', ''] };

export default function Reviews({ studio }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const load = () => api(`/studios/${studio.id}/reviews`).then(setList).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [studio.id]);
  const setStatus = async (r, status) => {
    await api(`/studios/${studio.id}/reviews/${r.id}`, { method: 'PATCH', body: { status } });
    load();
  };
  const remove = async (r) => {
    if (!confirm(`Delete the review from ${r.author_name}? This cannot be undone.`)) return;
    await api(`/studios/${studio.id}/reviews/${r.id}`, { method: 'DELETE' });
    load();
  };
  if (error) return <p className="error">{error}</p>;
  if (!list) return <p className="muted loading">Loading…</p>;
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Clients can leave a review from their gallery. Publish the ones you like and they appear in the Testimonials section of your website, next to the ones you typed in.
      </p>
      {!list.length && <div className="card muted">No reviews yet. Clients see a “Loved your photos?” box at the end of their gallery.</div>}
      {list.map((r) => {
        const [label, tone] = STATUS[r.status];
        return (
          <div key={r.id} className="card stack" style={{ gap: 6 }}>
            <div className="row between">
              <div>
                <b>{r.author_name}</b> <span className="stars-static">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <div className="small muted">{[r.event_title, fmtDate(r.updated_at)].filter(Boolean).join(' · ')}</div>
              </div>
              <span className={`badge ${tone}`}>{label}</span>
            </div>
            <p style={{ margin: 0 }}>“{r.body}”</p>
            <div className="row">
              {r.status !== 'published' && <button className="btn sm accent" onClick={() => setStatus(r, 'published')}>Publish on website</button>}
              {r.status !== 'hidden' && <button className="btn sm" onClick={() => setStatus(r, 'hidden')}>{r.status === 'published' ? 'Remove from website' : 'Hide'}</button>}
              <button className="btn sm ghost danger" onClick={() => remove(r)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
