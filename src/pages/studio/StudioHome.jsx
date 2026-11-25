import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import StudioEvents from './StudioEvents.jsx';
import WebsiteEditor from './WebsiteEditor.jsx';
import People from './People.jsx';
import Enquiries from './Enquiries.jsx';
import Invoices from './Invoices.jsx';
import Bookings from './Bookings.jsx';
import DomainSettings from './DomainSettings.jsx';
import ChecklistCard from '../../components/ChecklistCard.jsx';
import { useReloadOnChange } from '../../hooks.js';

const TABS = [
  ['events', 'Events'],
  ['bookings', 'Bookings'],
  ['website', 'Website'],
  ['clients', 'Clients'],
  ['enquiries', 'Enquiries'],
  ['invoices', 'Invoices'],
  ['domain', 'Domain'],
  ['team', 'Team'],
];

export default function StudioHome() {
  const { studioId, tab = 'events', itemId } = useParams();
  const [studio, setStudio] = useState(null);
  const [error, setError] = useState('');
  const [checklist, setChecklist] = useState(null);
  const load = () => api(`/studios/${studioId}`).then(setStudio).catch((e) => setError(e.message));
  useEffect(() => {
    setStudio(null);
    load();
  }, [studioId]);
  const loadChecklist = () => api(`/studios/${studioId}/onboarding`).then(setChecklist).catch(() => {});
  useEffect(() => {
    loadChecklist();
  }, [studioId, tab]);
  useReloadOnChange(loadChecklist, [studioId]);
  if (error) return <p className="error">{error}</p>;
  if (!studio) return <p className="muted">Loading…</p>;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{studio.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {studio.plan.name} plan · {studio.published_at ? 'Website live' : 'Website not published yet'}
          </p>
        </div>
        <Link className="btn" to={`/s/${studio.slug}`} target="_blank">View website ↗</Link>
      </div>
      <ChecklistCard checklist={checklist} storageKey={`sfs-studio-checklist-${studioId}`} />
      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <NavLink key={id} to={`/studio/${studioId}/${id}`} className={() => (tab === id ? 'active' : '')}>{label}</NavLink>
        ))}
      </nav>
      {tab === 'events' && <StudioEvents studio={studio} />}
      {tab === 'website' && <WebsiteEditor studio={studio} onSaved={load} />}
      {tab === 'clients' && <People studio={studio} role="client" />}
      {tab === 'team' && <People studio={studio} role="staff" />}
      {tab === 'enquiries' && <Enquiries studio={studio} />}
      {tab === 'bookings' && <Bookings studio={studio} itemId={itemId} />}
      {tab === 'invoices' && <Invoices studio={studio} itemId={itemId} />}
      {tab === 'domain' && <DomainSettings studio={studio} />}
    </>
  );
}
