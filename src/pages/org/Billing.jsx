import { useEffect, useState } from 'react';
import { api, fmtDate, inr } from '../../api.js';
import { StatusBadge, useAsync } from '../../components/ui.jsx';

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const storage = (gb) => (gb >= 1024 ? `${(gb / 1024).toFixed(gb % 1024 ? 1 : 0)} TB` : `${gb} GB`);
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Loads Razorpay's Checkout script once. */
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your connection and try again.'));
    document.body.appendChild(s);
  });
}

export default function Billing() {
  const [data, setData] = useState(null);
  const [cycle, setCycle] = useState('monthly');
  const [notice, setNotice] = useState('');
  const { busy, error, run } = useAsync();

  const load = () =>
    api('/billing/summary').then((d) => {
      setData(d);
      return d;
    });
  useEffect(() => {
    load().then((d) => setCycle(d.org.cycle || 'monthly'));
  }, []);
  if (!data) return <p className="muted">Loading…</p>;

  const { org, plans, profile, invoices, unbilledAddons, billing } = data;
  const current = plans.find((p) => p.id === org.planId);
  const pending = plans.find((p) => p.id === org.pendingPlanId);

  const choose = (plan) =>
    run(async () => {
      setNotice('');
      if (!profile) throw new Error('Add your billing details below first. They are needed for your GST invoice.');
      const total = cycle === 'yearly' ? plan.yearlyTotalPaise : plan.monthlyTotalPaise;
      if (org.hasSubscription) {
        const upgrade = plans.indexOf(plan) > plans.indexOf(current) || (plan.id === org.planId && cycle === 'yearly');
        const msg = upgrade
          ? `Switch to ${plan.name} (${cycle}) now? Your new limits apply right away, and Razorpay charges ${rupees(total)} per ${cycle === 'yearly' ? 'year' : 'month'} from the change.`
          : `Switch to ${plan.name} (${cycle}) at the end of your current period${org.currentPeriodEnd ? ` on ${fmtDate(org.currentPeriodEnd)}` : ''}?`;
        if (!confirm(msg)) return;
        const r = await api('/billing/checkout', { method: 'POST', body: { planId: plan.id, cycle } });
        setNotice(r.when === 'now' ? `You're now on ${plan.name}.` : `${plan.name} starts on ${fmtDate(r.periodEnd)}.`);
        await load();
        return;
      }
      const c = await api('/billing/checkout', { method: 'POST', body: { planId: plan.id, cycle } });
      await loadCheckout();
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: c.keyId,
          subscription_id: c.subscriptionId,
          name: c.name,
          description: c.description,
          prefill: c.prefill,
          theme: { color: '#9a6b3c' },
          handler: async (resp) => {
            try {
              const v = await api('/billing/verify', { method: 'POST', body: resp });
              setNotice(`Payment received. Welcome to ${plan.name}! Invoice ${v.invoiceNumber} is below.`);
              await load();
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: { ondismiss: () => resolve() },
        });
        rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
        rzp.open();
      });
    });

  const cancel = () =>
    run(async () => {
      if (!confirm(`Cancel your subscription? Everything keeps working until ${fmtDate(org.currentPeriodEnd) || 'the end of the paid period'}, then dashboards, galleries and websites go offline.`)) return;
      await api('/billing/cancel', { method: 'POST' });
      setNotice('Your subscription will end at the end of the current period.');
      await load();
    });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Plan &amp; billing</h1>
          <p className="muted" style={{ margin: 0 }}>
            {current?.name} plan, billed {org.cycle} · <StatusBadge value={org.status} />
            {org.currentPeriodEnd && org.status !== 'trial' && <> · {org.cancelAtPeriodEnd ? 'ends' : 'renews'} on {fmtDate(org.currentPeriodEnd)}</>}
          </p>
        </div>
      </div>

      {org.status === 'trial' && <div className="card" style={{ marginBottom: 16, background: 'var(--accent-soft)', borderColor: '#e2cdb3' }}>You're on a free trial. Choose a plan below to keep your websites and galleries online.</div>}
      {org.status === 'past_due' && <div className="card" style={{ marginBottom: 16, background: '#f8ecd9', borderColor: '#e8c990' }}><b>Payment overdue.</b> Razorpay could not charge your last renewal. Update your payment method from the link in Razorpay's email, or contact support.</div>}
      {pending && <div className="card" style={{ marginBottom: 16 }}>Your plan changes to <b>{pending.name}</b> ({org.pendingCycle}) on {fmtDate(org.currentPeriodEnd)}.</div>}
      {notice && <p className="ok">{notice}</p>}
      {error && <p className="error">{error}</p>}
      {!billing.enabled && <div className="card" style={{ marginBottom: 16 }}>Online payment isn't switched on yet. Contact SitesForStudios support to change plans.</div>}

      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Plans</h3>
        <div className="chips" role="group" aria-label="Billing cycle">
          <button className={`chip ${cycle === 'monthly' ? 'active' : ''}`} onClick={() => setCycle('monthly')}>Monthly</button>
          <button className={`chip ${cycle === 'yearly' ? 'active' : ''}`} onClick={() => setCycle('yearly')}>Yearly (2 months free)</button>
        </div>
      </div>
      <div className="grid2" style={{ marginBottom: 16 }}>
        {plans.map((p) => {
          const isCurrent = p.id === org.planId && cycle === org.cycle && org.status !== 'trial';
          const price = cycle === 'yearly' ? p.price_yearly_inr : p.price_monthly_inr;
          const total = cycle === 'yearly' ? p.yearlyTotalPaise : p.monthlyTotalPaise;
          const payable = billing.enabled && p.payable[cycle];
          const label = isCurrent ? 'Current plan' : !org.hasSubscription ? `Choose ${p.name}` : plans.indexOf(p) > plans.indexOf(current) ? 'Upgrade' : p.id === org.planId ? `Switch to ${cycle}` : 'Switch';
          return (
            <div key={p.id} className="card stack" style={isCurrent ? { borderColor: 'var(--accent)' } : undefined}>
              <div className="row between">
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                {isCurrent && <span className="badge accent">Current</span>}
              </div>
              <div>
                <div style={{ fontSize: 28, fontFamily: 'Cormorant Garamond', fontWeight: 600 }}>{inr(price)}<span className="small muted"> / {cycle === 'yearly' ? 'year' : 'month'}</span></div>
                <div className="small muted">{billing.gst ? `+ ${billing.gstRate}% GST = ${rupees(total)}` : 'No GST charged'}</div>
              </div>
              <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                <li>{storage(p.storage_gb)} storage</li>
                <li>{p.max_studios} studio{p.max_studios > 1 ? 's' : ''}, {p.staff_seats} staff seat{p.staff_seats > 1 ? 's' : ''}</li>
                <li>Face recognition on {p.face_events_per_month} events a month</li>
                <li>{p.raw_delivery ? 'RAW delivery' : 'No RAW delivery'}</li>
                <li>{p.premium_templates ? 'All templates incl. premium' : 'Standard templates'}</li>
                <li>Galleries online {p.retention_months} months</li>
              </ul>
              <button className={`btn ${isCurrent ? '' : 'primary'}`} disabled={isCurrent || !payable || busy || org.cancelAtPeriodEnd} onClick={() => choose(p)} style={{ justifyContent: 'center' }}>
                {busy ? 'Please wait…' : label}
              </button>
              {!isCurrent && billing.enabled && !p.payable[cycle] && <span className="small muted">Not available online yet</span>}
            </div>
          );
        })}
      </div>

      <BillingDetails profile={profile} onSaved={() => { setNotice('Billing details saved.'); load(); }} />

      <div className="card">
        <h3>Invoices</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th /></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td><b>{i.number}</b></td>
                  <td>{fmtDate(i.issued_at)}</td>
                  <td>{rupees(i.total_paise)}</td>
                  <td><StatusBadge value={i.status} /></td>
                  <td><a className="btn sm" href={`/api/billing/invoices/${i.id}/document`} target="_blank" rel="noreferrer">View / PDF</a></td>
                </tr>
              ))}
              {!invoices.length && <tr><td colSpan={5} className="muted">No invoices yet. An invoice is created after every payment.</td></tr>}
            </tbody>
          </table>
        </div>
        {unbilledAddons.length > 0 && (
          <div className="stack" style={{ marginTop: 14, gap: 4 }}>
            <b className="small">Added to your next invoice</b>
            {unbilledAddons.map((a) => <span key={a.id} className="small muted">Gallery restore: {a.title} · {inr(a.amount_inr)} + GST</span>)}
          </div>
        )}
      </div>

      {org.hasSubscription && !org.cancelAtPeriodEnd && (
        <p className="small muted">
          Need to stop? <button className="btn ghost sm danger" onClick={cancel} disabled={busy}>Cancel subscription</button>
        </p>
      )}
    </>
  );
}

export function BillingDetails({ profile, onSaved }) {
  const [states, setStates] = useState(null);
  const [f, setF] = useState({
    legalName: profile?.legal_name || '',
    gstin: profile?.gstin || '',
    address: profile?.address || '',
    city: profile?.city || '',
    stateCode: profile?.state_code || '32',
    pincode: profile?.pincode || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  });
  const { busy, error, setError, run } = useAsync();
  useEffect(() => {
    api('/billing/config').then((c) => setStates(c.states)).catch(() => {});
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: k === 'gstin' ? e.target.value.toUpperCase() : e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const g = f.gstin.trim();
    if (g && !GSTIN_RE.test(g)) return setError('GSTIN should look like 32ABCDE1234F1Z5');
    if (g && g.slice(0, 2) !== f.stateCode) return setError('The GSTIN starts with a different state code than the state you chose');
    run(async () => {
      await api('/billing/profile', { method: 'PUT', body: { ...f, gstin: g } });
      onSaved?.();
    });
  };

  return (
    <form className="card stack" onSubmit={submit} style={{ marginBottom: 16 }}>
      <div>
        <h3 style={{ margin: 0 }}>Billing details</h3>
        <p className="small muted" style={{ margin: '4px 0 0' }}>Printed on your GST invoices. Add your GSTIN to claim input tax credit.</p>
      </div>
      <div className="grid2">
        <label className="field">Legal business name<input value={f.legalName} onChange={set('legalName')} required /></label>
        <label className="field">GSTIN (optional)<input value={f.gstin} onChange={set('gstin')} maxLength={15} placeholder="32ABCDE1234F1Z5" /></label>
      </div>
      <label className="field">Address<input value={f.address} onChange={set('address')} required /></label>
      <div className="grid2">
        <label className="field">City<input value={f.city} onChange={set('city')} required /></label>
        <label className="field">State
          <select value={f.stateCode} onChange={set('stateCode')}>
            {states && Object.entries(states).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <label className="field">PIN code<input value={f.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={6} required /></label>
        <label className="field">Invoice email<input type="email" value={f.email} onChange={set('email')} required /></label>
        <label className="field">Phone (optional)<input value={f.phone} onChange={set('phone')} /></label>
      </div>
      {error && <div className="error">{error}</div>}
      <div><button className="btn primary" disabled={busy}>Save billing details</button></div>
    </form>
  );
}
