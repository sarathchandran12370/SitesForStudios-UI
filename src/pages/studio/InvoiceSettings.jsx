import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAsync } from '../../components/ui.jsx';

// The studio's details printed on every invoice. Only studio admins and the organization owner can change them.
export default function InvoiceSettings({ studio }) {
  const base = `/studio/${studio.id}/invoices`;
  const [s, setS] = useState(null);
  const [f, setF] = useState(null);
  const [saved, setSaved] = useState(false);
  const { busy, error, setError, run } = useAsync();
  useEffect(() => {
    api(`/invoices/studio/${studio.id}/settings`).then((x) => {
      setS(x);
      setF({
        legalName: x.legal_name, gstin: x.gstin || '', address: x.address || '', stateCode: x.state_code || '', email: x.email || '', phone: x.phone || '',
        prefix: x.prefix, defaultSac: x.default_sac, defaultGstRate: x.default_gst_rate, dueDays: x.due_days, bankDetails: x.bank_details || '', upiId: x.upi_id || '', terms: x.terms || '',
      });
    }).catch((e) => setError(e.message));
  }, [studio.id]);
  if (error && !f) return <p className="error">{error}</p>;
  if (!f) return <p className="muted">Loading…</p>;
  const set = (k) => (e) => { setSaved(false); setF({ ...f, [k]: e.target.value }); };
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      const x = await api(`/invoices/studio/${studio.id}/settings`, {
        method: 'PUT',
        body: { ...f, gstin: f.gstin.trim() || null, stateCode: f.stateCode || null, email: f.email.trim() || null, upiId: f.upiId.trim() || null, defaultGstRate: Number(f.defaultGstRate), dueDays: Number(f.dueDays) },
      });
      setS(x);
      setSaved(true);
    });
  };
  const ro = !s.canEdit;
  return (
    <form className="stack" onSubmit={save}>
      <div className="row between">
        <h2 style={{ margin: 0 }}>Invoice settings</h2>
        <Link className="btn ghost" to={base}>Back to invoices</Link>
      </div>
      {ro && <div className="card muted">Only studio admins can change these details.</div>}
      <fieldset disabled={ro} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Your business</h3>
          <div className="grid2">
            <label className="field">Business name on invoices<input id="set-name" value={f.legalName} onChange={set('legalName')} required maxLength={120} /></label>
            <label className="field">GSTIN (leave empty if not registered)<input id="set-gstin" value={f.gstin} onChange={(e) => { setSaved(false); setF({ ...f, gstin: e.target.value.toUpperCase() }); }} maxLength={15} /></label>
            <label className="field">Email<input id="set-email" type="email" value={f.email} onChange={set('email')} /></label>
            <label className="field">Phone<input id="set-phone" value={f.phone} onChange={set('phone')} maxLength={20} /></label>
          </div>
          <label className="field">Address<textarea id="set-address" value={f.address} onChange={set('address')} maxLength={400} style={{ minHeight: 60 }} /></label>
          {!f.gstin.trim() && (
            <label className="field">State
              <select id="set-state" value={f.stateCode} onChange={set('stateCode')}>
                <option value="">Choose your state</option>
                {Object.entries(s.states).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="card stack">
          <h3 style={{ margin: 0 }}>How clients pay you</h3>
          <div className="grid2">
            <label className="field">UPI ID<input id="set-upi" value={f.upiId} onChange={set('upiId')} placeholder="yourstudio@okhdfcbank" /></label>
          </div>
          <label className="field">Bank details<textarea id="set-bank" value={f.bankDetails} onChange={set('bankDetails')} placeholder={'Account name, account number, IFSC, bank and branch'} maxLength={500} style={{ minHeight: 70 }} /></label>
          <p className="small muted" style={{ margin: 0 }}>Invoices show a "Pay by UPI" button for the balance due when a UPI ID is set. Record each payment yourself once you receive it.</p>
        </div>

        <div className="card stack">
          <h3 style={{ margin: 0 }}>Defaults</h3>
          <div className="grid2">
            <label className="field">Number prefix<input id="set-prefix" value={f.prefix} onChange={(e) => { setSaved(false); setF({ ...f, prefix: e.target.value.toUpperCase() }); }} maxLength={5} required /><span className="small muted" style={{ fontWeight: 400 }}>Numbers look like {f.prefix || 'INV'}/26-27/0001</span></label>
            <label className="field">Payment due after (days)<input id="set-due" type="number" min="0" max="90" value={f.dueDays} onChange={set('dueDays')} required /></label>
            <label className="field">GST on new invoices
              <select id="set-gst" value={f.defaultGstRate} onChange={set('defaultGstRate')} disabled={!f.gstin.trim()}>{s.gstRates.map((r) => <option key={r} value={r}>{r === 0 ? 'Off (add it per invoice if needed)' : `On, ${r}%`}</option>)}</select>
              <span className="small muted" style={{ fontWeight: 400 }}>{f.gstin.trim() ? 'You can still switch GST on or off on each invoice.' : 'GST is optional. Add your GSTIN above if you want to charge it.'}</span>
            </label>
            <label className="field">SAC code<input id="set-sac" value={f.defaultSac} onChange={set('defaultSac')} inputMode="numeric" maxLength={8} required /><span className="small muted" style={{ fontWeight: 400 }}>998383 is event photography and videography</span></label>
          </div>
          <label className="field">Terms printed on every invoice<textarea id="set-terms" value={f.terms} onChange={set('terms')} placeholder="e.g. 50% advance to block the date. Advance is not refundable." maxLength={1000} style={{ minHeight: 70 }} /></label>
        </div>
      </fieldset>
      {error && <div className="error">{error}</div>}
      {!ro && (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {saved && <span className="small" style={{ color: 'var(--good)' }}>Saved</span>}
          <button className="btn primary" disabled={busy}>Save settings</button>
        </div>
      )}
    </form>
  );
}
