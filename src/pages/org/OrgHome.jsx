import { useEffect, useState } from 'react';
import { Link, Navigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import ChecklistCard from '../../components/ChecklistCard.jsx';
import { useReloadOnChange } from '../../hooks.js';
import { api, fmtBytes, inr } from '../../api.js';
import { Modal, SecretBox, StatusBadge, useAsync } from '../../components/ui.jsx';

export default function OrgHome() {
  const { user } = useAuth();
  if (user.role === 'org_admin' && user.org_mode === 'single' && user.home_studio_id) return <Navigate to={`/studio/${user.home_studio_id}`} replace />;
  return <OrgDashboard />;
}

function OrgDashboard() {
  const { reloadStudios } = useOutletContext();
  const [checklist, setChecklist] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [org, setOrg] = useState(null);
  const [studios, setStudios] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const load = () => {
    api('/org/me').then(setOrg).catch(() => {});
    api('/org/studios').then(setStudios).catch(() => {});
  };
  useEffect(() => {
    load();
    api('/studios/templates').then(setTemplates);
    api('/org/onboarding').then(setChecklist).catch(() => {});
  }, []);
  useReloadOnChange(() => api('/org/onboarding').then(setChecklist).catch(() => {}));
  if (!org) return <p className="muted">Loading…</p>;
  const usedPct = Math.min(100, (org.usage.storage_bytes / (org.plan.storage_gb * 1024 ** 3)) * 100);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {org.name}{' '}
            <button className="btn ghost sm" onClick={() => setRenaming(true)} aria-label="Rename organization">Rename</button>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {org.plan.name} plan · {inr(org.plan.price_monthly_inr)}/month · <StatusBadge value={org.status} />
          </p>
        </div>
        <div className="row">
          <Link className="btn" to="/org/billing">Plan &amp; billing</Link>
          <button className="btn primary" onClick={() => setCreating(true)} disabled={studios.length >= org.plan.max_studios}>New studio</button>
        </div>
      </div>
      <ChecklistCard title="Set up your organization" checklist={checklist} storageKey={`sfs-org-checklist-${org.id}`} />
      {renaming && <RenameOrg org={org} onClose={() => setRenaming(false)} onSaved={() => { setRenaming(false); load(); }} />}
      <div className="grid2" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <span className="muted small">Storage used</span>
          <b>{fmtBytes(org.usage.storage_bytes)} <span className="small muted">of {org.plan.storage_gb >= 1024 ? `${(org.plan.storage_gb / 1024).toFixed(1)} TB` : `${org.plan.storage_gb} GB`}</span></b>
          <div className="progress"><i style={{ width: `${usedPct}%` }} /></div>
        </div>
        <div className="card stat"><span className="muted small">Studios</span><b>{studios.length} of {org.plan.max_studios}</b></div>
        <div className="card stat"><span className="muted small">Events</span><b>{org.usage.events}</b></div>
      </div>
      <div className="card">
        <h3>Studios</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Studio</th><th>Website</th><th>Template</th><th>Events</th><th>New enquiries</th><th /></tr></thead>
            <tbody>
              {studios.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td><a href={`/s/${s.slug}`} target="_blank" rel="noreferrer">{s.custom_domain || `/s/${s.slug}`}</a></td>
                  <td>{templates.find((t) => t.id === s.template_id)?.name || s.template_id}</td>
                  <td>{s.event_count}</td>
                  <td>{s.new_enquiries ? <span className="badge accent">{s.new_enquiries}</span> : '—'}</td>
                  <td><Link className="btn sm" to={`/studio/${s.id}`}>Open</Link></td>
                </tr>
              ))}
              {!studios.length && <tr><td colSpan={6} className="muted">No studios yet. Create your first studio to get its website.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {creating && (
        <CreateStudio
          templates={templates}
          premiumAllowed={org.plan.premium_templates}
          onClose={() => setCreating(false)}
          onCreated={(r) => { setCreating(false); setCreated(r); load(); reloadStudios(); }}
        />
      )}
      {created && (
        <Modal title="Studio created" onClose={() => setCreated(null)}>
          <p>{created.studio.name} is ready. Its website address is <b>/s/{created.studio.slug}</b>.</p>
          {created.invited && <p className="ok">Login details were emailed to {created.admin.email}.</p>}
          {created.admin && <SecretBox label="Login details for the studio admin:" email={created.admin.email} password={created.admin.temporaryPassword} />}
          <div className="row" style={{ marginTop: 14 }}><Link className="btn primary" to={`/studio/${created.studio.id}/website`} onClick={() => setCreated(null)}>Customize website</Link></div>
        </Modal>
      )}
    </>
  );
}

function RenameOrg({ org, onClose, onSaved }) {
  const [name, setName] = useState(org.name);
  const { busy, error, run } = useAsync();
  return (
    <Modal title="Rename organization" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/org/me', { method: 'PATCH', body: { name } }); onSaved(); }); }}>
        <label className="field">Organization name<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>Save</button>
      </form>
    </Modal>
  );
}

function CreateStudio({ templates, premiumAllowed, onClose, onCreated }) {
  const [f, setF] = useState({ name: '', slug: '', templateId: 'editorial', adminName: '', adminEmail: '', sendInvite: true });
  const { busy, error, run } = useAsync();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="New studio" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const body = { name: f.name, templateId: f.templateId, ...(f.slug && { slug: f.slug }), ...(f.adminEmail && { adminEmail: f.adminEmail, adminName: f.adminName || f.name, sendInvite: f.sendInvite }) };
          run(async () => onCreated(await api('/org/studios', { method: 'POST', body })));
        }}
      >
        <label className="field">Studio name<input value={f.name} onChange={set('name')} required /></label>
        <label className="field">Web address (optional)<input placeholder="arjun-photography" value={f.slug} onChange={set('slug')} /></label>
        <label className="field">Template
          <select value={f.templateId} onChange={set('templateId')}>
            {templates.map((t) => <option key={t.id} value={t.id} disabled={t.tier === 'premium' && !premiumAllowed}>{t.name}{t.tier === 'premium' ? ' (Premium)' : ''}</option>)}
          </select>
        </label>
        <p className="small muted" style={{ margin: 0 }}>Optional: give this studio its own admin login.</p>
        <div className="grid2">
          <label className="field">Admin name<input value={f.adminName} onChange={set('adminName')} /></label>
          <label className="field">Admin email<input type="email" value={f.adminEmail} onChange={set('adminEmail')} /></label>
        </div>
        {f.adminEmail && <label className="row"><input type="checkbox" checked={f.sendInvite} onChange={(e) => setF({ ...f, sendInvite: e.target.checked })} /> Email the login details to the studio admin</label>}
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>Create studio</button>
      </form>
    </Modal>
  );
}
