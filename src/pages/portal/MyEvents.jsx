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
        <header className="portal-hello">
          <p className="eyebrow">Your galleries</p>
          <h1>Hello, {user.name.split(' ')[0]}</h1>
          <p className="muted">Your events and photos, delivered by {user.studio_name || 'your studio'}.</p>
        </header>
        {events === null && <p className="muted loading">Loading…</p>}
        {events?.length === 0 && (
          <div className="portal-empty">
            <span className="portal-empty-ic" aria-hidden="true">◐</span>
            <h3>No events yet</h3>
            <p className="muted">Your studio will add them here when your photos are ready.</p>
          </div>
        )}
        <div className="event-cards">
          {events?.map((e) => (
            <Link key={e.id} to={`/portal/events/${e.id}`} className="event-card">
              <div className={`img${e.cover ? '' : ' empty'}`} style={{ backgroundImage: e.cover ? `url("${e.cover}")` : undefined }}>
                {!e.cover && <span className="ec-mono" aria-hidden="true">{e.title?.[0]}</span>}
                <span className="ec-count">{(e.photoCount || 0).toLocaleString('en-IN')} photos</span>
              </div>
              <h3>{e.title}</h3>
              <div className="small muted">{[fmtDate(e.event_date), e.venue].filter(Boolean).join(' · ')}</div>
              <span className="ec-open">Open gallery →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
