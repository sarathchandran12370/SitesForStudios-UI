import { useEffect, useState } from 'react';
import { api, fmtBytes, inr } from '../../api.js';
import { Modal, SecretBox, useAsync } from '../../components/ui.jsx';

export default function SuperAdmin() {
  const [overview, setOverview] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const load = () => {
    api('/admin/overview').then(setOverview);
    api('/admin/orgs').then(setOrgs);
    api('/admin/plans').then(setPlans);
  };
  useEffect(load, []);

  const update = async (id, patch) => {
    await api(`/admin/orgs/${id}`, { method: 'PATCH', body: patch });
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Platform</h1>
          <p className="muted" style={{ margin: 0 }}>Organizations, plans and usage across SitesForStudios.</p>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>New organization</button>
      </div>

      {overview && (
        <div className="grid2" style={{ marginBottom: 16 }}>
          <div className="card stat"><span className="muted small">Monthly recurring revenue</span><b>{inr(overview.mrr_inr)}</b></div>
          <div className="card stat"><span className="muted small">Organizations · studios</span><b>{overview.organizations} · {overview.studios}</b></div>
          <div className="card stat"><span className="muted small">Events · storage</span><b>{overview.events} · {fmtBytes(overview.storage_bytes)}</b></div>
          <div className="card stat"><span className="muted small">Enquiries, last 30 days</span><b>{overview.enquiries_30d}</b></div>
        </div>
      )}

      <div className="card">
        <h3>Organizations</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Owner</th><th>Plan</th><th>Status</th><th>Studios</th><th>Storage</th></tr></thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.name}</b></td>
                  <td className="muted">{o.owner_email}</td>
                  <td>
                    <select value={o.plan_id} onChange={(e) => update(o.id, { planId: e.target.value })} style={{ width: 'auto' }}>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value })} style={{ width: 'auto' }}>
                      {['trial', 'active', 'past_due', 'suspended', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{o.studio_count}</td>
                  <td>{fmtBytes(o.storage_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Plans</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Plan</th><th>Monthly</th><th>Yearly</th><th>Storage</th><th>Studios</th><th>Face events / mo</th><th>Staff</th><th>RAW</th></tr></thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td><td>{inr(p.price_monthly_inr)}</td><td>{inr(p.price_yearly_inr)}</td>
                  <td>{p.storage_gb >= 1024 ? `${(p.storage_gb / 1024).toFixed(1)} TB` : `${p.storage_gb} GB`}</td>
                  <td>{p.max_studios}</td><td>{p.face_events_per_month}</td><td>{p.staff_seats}</td><td>{p.raw_delivery ? 'Yes' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <CreateOrg
          plans={plans}
          onClose={() => setCreating(false)}
          onCreated={(r) => { setCreating(false); setCreated(r); load(); }}
        />
      )}
      {created && (
        <Modal title="Organization created" onClose={() => setCreated(null)}>
          <SecretBox label={`Send these login details to the owner of ${created.org.name}.`} email={created.owner.email} password={created.owner.temporaryPassword} />
        </Modal>
      )}
    </>
  );
}

function CreateOrg({ plans, onClose, onCreated }) {
  const [f, setF] = useState({ name: '', planId: 'pro', ownerName: '', ownerEmail: '', ownerPhone: '' });
  const { busy, error, run } = useAsync();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="New organization" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => onCreated(await api('/admin/orgs', { method: 'POST', body: f }))); }}>
        <label className="field">Organization name<input value={f.name} onChange={set('name')} required /></label>
        <label className="field">Plan
          <select value={f.planId} onChange={set('planId')}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {inr(p.price_monthly_inr)}/mo</option>)}</select>
        </label>
        <div className="grid2">
          <label className="field">Owner name<input value={f.ownerName} onChange={set('ownerName')} required /></label>
          <label className="field">Owner phone<input value={f.ownerPhone} onChange={set('ownerPhone')} /></label>
        </div>
        <label className="field">Owner email<input type="email" value={f.ownerEmail} onChange={set('ownerEmail')} required /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>Create organization</button>
      </form>
    </Modal>
  );
}

