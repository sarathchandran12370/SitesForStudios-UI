import { useEffect, useState } from 'react';
import { api, fmtBytes, inr } from '../../api.js';
import { Modal, SecretBox, StatusBadge, useAsync } from '../../components/ui.jsx';

const ORG_STATUSES = ['trial', 'active', 'past_due', 'expired', 'suspended', 'cancelled'];
const fmtStorage = (gb) => (gb >= 1024 ? `${(gb / 1024).toFixed(gb % 1024 ? 1 : 0)} TB` : `${gb} GB`);

export default function SuperAdmin() {
  const [overview, setOverview] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [messages, setMessages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const load = () => {
    api('/admin/overview').then(setOverview);
    api('/admin/orgs').then(setOrgs);
    api('/admin/plans').then(setPlans);
    api('/admin/notifications').then(setMessages).catch(() => {});
    api('/admin/invoices').then(setInvoices).catch(() => {});
  };
  useEffect(load, []);

  const update = async (org, patch) => {
    if (patch.status === 'suspended' || patch.status === 'cancelled') {
      const what = patch.status === 'suspended' ? 'Suspend' : 'Close';
      if (!confirm(`${what} ${org.name}? Its dashboards, client galleries and websites go offline until you change the status back.`)) return load();
    }
    await api(`/admin/orgs/${org.id}`, { method: 'PATCH', body: patch });
    load();
  };

  const extend = async (org) => {
    if (!confirm(`Give ${org.name} 14 more days of trial?`)) return;
    await api(`/admin/orgs/${org.id}`, { method: 'PATCH', body: { extendTrialDays: 14 } });
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
            <thead><tr><th>Name</th><th>Owner</th><th>Plan</th><th>Status</th><th>Trial ends</th><th>Studios</th><th>Storage</th></tr></thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.name}</b></td>
                  <td className="muted">{o.owner_email}</td>
                  <td>
                    <select aria-label={`Plan for ${o.name}`} value={o.plan_id} onChange={(e) => update(o, { planId: e.target.value })} style={{ width: 'auto' }}>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Status for ${o.name}`} value={o.status} onChange={(e) => update(o, { status: e.target.value })} style={{ width: 'auto' }}>
                      {ORG_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="small">
                    {['trial', 'expired', 'suspended'].includes(o.status) && o.trial_ends_at ? (
                      <>
                        {new Date(o.trial_ends_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        <div><button className="btn ghost sm" onClick={() => extend(o)}>+14 days</button></div>
                      </>
                    ) : '—'}
                    {o.signup_source === 'self' && <div><span className="badge">self sign-up</span></div>}
                  </td>
                  <td>{o.studio_count}</td>
                  <td>{fmtBytes(o.storage_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ margin: '10px 0 0' }}>Suspended and cancelled organizations cannot log in, and their client galleries and websites are offline. Past due shows a payment banner but keeps everything working.</p>
      </div>

      <div className="card">
        <h3>Plans</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Plan</th><th>Monthly</th><th>Yearly</th><th>Storage</th><th>Studios</th><th>Face events / mo</th><th>Staff</th><th>Galleries</th><th>RAW</th><th>Premium templates</th><th>Retention</th><th /></tr></thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td><td>{inr(p.price_monthly_inr)}</td><td>{inr(p.price_yearly_inr)}</td>
                  <td>{fmtStorage(p.storage_gb)}</td><td>{p.max_studios}</td><td>{p.face_events_per_month}</td><td>{p.staff_seats}</td>
                  <td>{p.client_galleries === false ? 'Website only' : 'Yes'}</td><td>{p.raw_delivery ? 'Yes' : '—'}</td><td>{p.premium_templates ? 'Yes' : '—'}</td><td>{p.retention_months} months</td>
                  <td><button className="btn sm" onClick={() => setEditingPlan(p)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Invoices</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Invoice</th><th>Organization</th><th>Date</th><th>Amount</th><th>Status</th><th /></tr></thead>
            <tbody>
              {invoices.slice(0, 30).map((i) => (
                <tr key={i.id}>
                  <td><b>{i.number}</b></td>
                  <td>{i.org_name}</td>
                  <td className="small">{new Date(i.issued_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  <td>₹{(i.total_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td><StatusBadge value={i.status} /></td>
                  <td><a className="btn sm" href={`/api/billing/invoices/${i.id}/document`} target="_blank" rel="noreferrer">View</a></td>
                </tr>
              ))}
              {!invoices.length && <tr><td colSpan={6} className="muted">No invoices yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Sent messages</h3>
        <p className="small muted" style={{ marginTop: 0 }}>Latest emails and WhatsApp messages. With EMAIL_PROVIDER=log (development) they are recorded here instead of being sent.</p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Type</th><th>To</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              {messages.slice(0, 30).map((m) => (
                <tr key={m.id}>
                  <td className="small muted">{new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="small">{m.kind.replace(/_/g, ' ')} <span className="muted">· {m.channel}</span></td>
                  <td className="small">{m.recipient}</td>
                  <td className="small">{m.subject}</td>
                  <td><StatusBadge value={m.status} />{m.error && <div className="small error">{m.error}</div>}</td>
                </tr>
              ))}
              {!messages.length && <tr><td colSpan={5} className="muted">Nothing sent yet.</td></tr>}
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
          {created.invited && <p className="ok" style={{ marginTop: 0 }}>Login details were emailed to {created.owner.email}.</p>}
          <SecretBox label={`Login details for the owner of ${created.org.name}.`} email={created.owner.email} password={created.owner.temporaryPassword} />
        </Modal>
      )}
      {editingPlan && <PlanEditor plan={editingPlan} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); load(); }} />}
    </>
  );
}

const NUMBER_FIELDS = [
  ['price_monthly_inr', 'Monthly price (₹)'],
  ['price_yearly_inr', 'Yearly price (₹)'],
  ['storage_gb', 'Storage (GB)'],
  ['max_studios', 'Studios'],
  ['face_events_per_month', 'Face recognition events / month'],
  ['staff_seats', 'Staff seats'],
  ['retention_months', 'Event retention (months)'],
];

export function PlanEditor({ plan, onClose, onSaved }) {
  const [f, setF] = useState({ ...plan, razorpay_plan_id: plan.razorpay_plan_id || '', razorpay_plan_id_yearly: plan.razorpay_plan_id_yearly || '' });
  const { busy, error, run } = useAsync();
  const submit = (e) => {
    e.preventDefault();
    const body = { name: f.name, client_galleries: f.client_galleries !== false, raw_delivery: !!f.raw_delivery, premium_templates: !!f.premium_templates, razorpay_plan_id: f.razorpay_plan_id.trim() || null, razorpay_plan_id_yearly: f.razorpay_plan_id_yearly.trim() || null };
    for (const [k] of NUMBER_FIELDS) body[k] = Number(f[k]);
    run(async () => {
      await api(`/admin/plans/${plan.id}`, { method: 'PUT', body });
      onSaved();
    });
  };
  return (
    <Modal title={`Edit ${plan.name} plan`} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <label className="field">Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <div className="grid2">
          {NUMBER_FIELDS.map(([k, label]) => (
            <label key={k} className="field">{label}
              <input type="number" min={k === 'face_events_per_month' ? 0 : 1} step="1" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required />
            </label>
          ))}
        </div>
        <label className="row"><input type="checkbox" checked={f.client_galleries !== false} onChange={(e) => setF({ ...f, client_galleries: e.target.checked })} /> Client galleries (client logins, downloads, face search). Off = website-only plan</label>
        <label className="row"><input type="checkbox" checked={!!f.raw_delivery} onChange={(e) => setF({ ...f, raw_delivery: e.target.checked })} /> RAW delivery</label>
        <label className="row"><input type="checkbox" checked={!!f.premium_templates} onChange={(e) => setF({ ...f, premium_templates: e.target.checked })} /> Premium templates</label>
        <div className="grid2">
          <label className="field">Razorpay plan ID, monthly<input placeholder="plan_XXXXXXXX" value={f.razorpay_plan_id} onChange={(e) => setF({ ...f, razorpay_plan_id: e.target.value })} /></label>
          <label className="field">Razorpay plan ID, yearly<input placeholder="plan_YYYYYYYY" value={f.razorpay_plan_id_yearly} onChange={(e) => setF({ ...f, razorpay_plan_id_yearly: e.target.value })} /></label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Create these plans in the Razorpay dashboard with the price <b>including GST</b> (e.g. ₹3,499 + 18% = ₹4,128.82). Without a plan ID, that plan can't be bought online.</p>
        <p className="small muted" style={{ margin: 0 }}>Limits apply to every organization on this plan right away. Lowering storage or studios does not delete anything; it only blocks new uploads and studios above the limit.</p>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>Save plan</button>
      </form>
    </Modal>
  );
}

function CreateOrg({ plans, onClose, onCreated }) {
  const [f, setF] = useState({ name: '', planId: 'pro', ownerName: '', ownerEmail: '', ownerPhone: '', sendInvite: true });
  const { busy, error, run } = useAsync();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="New organization" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => onCreated(await api('/admin/orgs', { method: 'POST', body: { ...f, ownerPhone: f.ownerPhone || undefined } }))); }}>
        <label className="field">Organization name<input value={f.name} onChange={set('name')} required /></label>
        <label className="field">Plan
          <select value={f.planId} onChange={set('planId')}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {inr(p.price_monthly_inr)}/mo</option>)}</select>
        </label>
        <div className="grid2">
          <label className="field">Owner name<input value={f.ownerName} onChange={set('ownerName')} required /></label>
          <label className="field">Owner phone<input value={f.ownerPhone} onChange={set('ownerPhone')} /></label>
        </div>
        <label className="field">Owner email<input type="email" value={f.ownerEmail} onChange={set('ownerEmail')} required /></label>
        <label className="row"><input type="checkbox" checked={f.sendInvite} onChange={(e) => setF({ ...f, sendInvite: e.target.checked })} /> Email the login details to the owner</label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>Create organization</button>
      </form>
    </Modal>
  );
}
