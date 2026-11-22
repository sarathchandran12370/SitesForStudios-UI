import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import PortalTop from './PortalTop.jsx';

export default function MyEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  useEffect(() => {
    api('/portal/events').then(setEvents).catch(() => setEvents([]));
  }, []);
  return (
    <div className="portal">
      <PortalTop />
      <div className="portal-body">
        <h1>Hello, {user.name.split(' ')[0]}</h1>
        <p className="muted" style={{ marginTop: 0 }}>Your events and photos, delivered by {user.studio_name || 'your studio'}.</p>
        {events === null && <p className="muted">Loading…</p>}
        {events?.length === 0 && <div className="card">No events yet. Your studio will add them here when your photos are ready.</div>}
        <div className="event-cards" style={{ marginTop: 24 }}>
          {events?.map((e) => (
            <Link key={e.id} to={`/portal/events/${e.id}`} className="event-card">
              <div className="img" style={{ backgroundImage: e.cover ? `url(${e.cover})` : undefined }} />
              <h3 style={{ margin: 0 }}>{e.title} {e.status !== 'active' && <span className="badge warn" style={{ verticalAlign: 'middle' }}>Archived</span>}</h3>
              <div className="small muted">{[fmtDate(e.event_date), e.venue, `${e.photoCount} photos`].filter(Boolean).join(' · ')}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
