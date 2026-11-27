import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, rupees } from '../../api.js';
import { useAsync } from '../../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + Number(n || 0));
  return x.toISOString().slice(0, 10);
};
const emptyLine = () => ({ description: '', sac: '', qty: 1, rate: '' });

/** Same maths as the API (the API's numbers are the ones saved). */
function preview(f, sellerState) {
  const lines = f.lines.map((l) => Math.round(Number(l.qty || 0) * Math.round(Number(l.rate || 0) * 100)));
  const subtotal = lines.reduce((s, a) => s + a, 0);
  const discount = Math.min(Math.round(Number(f.discount || 0) * 100), subtotal);
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * Number(f.gstRate)) / 100);
  const pos = f.customer.gstin?.length >= 2 ? f.customer.gstin.slice(0, 2) : f.customer.stateCode || sellerState;
  const intra = !pos || !sellerState || pos === sellerState;
  return { lines, subtotal, discount, taxable, tax, intra, total: taxable + tax };
}

/** Create a new invoice, or edit a draft (pass `invoice`). */
export default function InvoiceEditor({ studio, invoice, onSaved, onCancel }) {
  const nav = useNavigate();
  const fromBooking = useLocation().state?.booking;
  const base = `/studio/${studio.id}/invoices`;
  const [settings, setSettings] = useState(null);
  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [f, setF] = useState(null);
  const { busy, error, setError, run } = useAsync();

  useEffect(() => {
    Promise.all([
      api(`/invoices/studio/${studio.id}/settings`),
      studio.plan?.client_galleries === false ? [] : api(`/studios/${studio.id}/accounts?role=client`),
      api(`/events/studio/${studio.id}`),
    ]).then(([s, c, e]) => {
      setSettings(s);
      setClients(c);
      setEvents(e);
      if (invoice) {
        setF({
          clientAccountId: invoice.client_account_id || '',
          eventId: invoice.event_id || '',
          bookingId: invoice.booking_id || null,
          customer: { name: invoice.customer.name, email: invoice.customer.email || '', phone: invoice.customer.phone || '', address: invoice.customer.address || '', stateCode: invoice.customer.state_code || '', gstin: invoice.customer.gstin || '' },
          issueDate: String(invoice.issue_date).slice(0, 10),
          dueDate: invoice.due_date ? String(invoice.due_date).slice(0, 10) : '',
          lines: invoice.lines.map((l) => ({ description: l.description, sac: l.sac || '', qty: l.qty, rate: l.rate_paise / 100 })),
          discount: invoice.discount_paise ? invoice.discount_paise / 100 : '',
          gstRate: invoice.gst_rate,
          notes: invoice.notes || '',
        });
      } else {
        const issue = today();
        const bk = fromBooking;
        setF({
          clientAccountId: bk?.client_account_id && c.some((x) => x.id === bk.client_account_id) ? bk.client_account_id : '',
          eventId: bk?.event_id || '',
          bookingId: bk?.id || null,
          customer: { name: '', email: '', phone: '', address: '', stateCode: '', gstin: '', ...(bk?.customer || {}) },
          issueDate: issue, dueDate: addDays(issue, s.due_days),
          lines: [bk?.line ? { ...emptyLine(), ...bk.line } : emptyLine()], discount: '', gstRate: s.gstin ? s.default_gst_rate : 0, notes: '',
        });
      }
    }).catch((e) => setError(e.message));
  }, [studio.id, invoice?.id]);

  const totals = useMemo(() => (f && settings ? preview(f, settings.state_code) : null), [f, settings]);
  if (error && !f) return <p className="error">{error}</p>;
  if (!f || !settings) return <p className="muted loading">Loading…</p>;

  const set = (patch) => setF({ ...f, ...patch });
  const setCustomer = (k) => (e) => set({ customer: { ...f.customer, [k]: e.target.value } });
  const setLine = (i, k) => (e) => set({ lines: f.lines.map((l, j) => (j === i ? { ...l, [k]: e.target.value } : l)) });
  const pickClient = (id) => {
    const c = clients.find((x) => x.id === id);
    const ev = c?.events?.[0]?.eventId;
    set({
      clientAccountId: id,
      eventId: f.eventId || ev || '',
      customer: c ? { ...f.customer, name: c.name, email: c.email, phone: c.phone || '' } : f.customer,
    });
  };
  const gst = Number(f.gstRate) > 0;

  const body = () => ({
    clientAccountId: f.clientAccountId || null,
    eventId: f.eventId || null,
    bookingId: f.bookingId || null,
    customer: { ...f.customer, gstin: f.customer.gstin.trim() || null, stateCode: f.customer.stateCode || null, email: f.customer.email.trim() || null },
    issueDate: f.issueDate,
    dueDate: f.dueDate || null,
    lines: f.lines.map((l) => ({ description: l.description.trim(), sac: gst ? String(l.sac || '').trim() : '', qty: Number(l.qty), rate: Number(l.rate || 0) })),
    discount: Number(f.discount || 0),
    gstRate: Number(f.gstRate),
    notes: f.notes,
  });

  const save = (send) =>
    run(async () => {
      let saved = invoice
        ? await api(`/invoices/${invoice.id}`, { method: 'PATCH', body: body() })
        : await api(`/invoices/studio/${studio.id}`, { method: 'POST', body: body() });
      if (send) saved = await api(`/invoices/${saved.id}/send`, { method: 'POST', body: { email: !!saved.customer.email } });
      if (onSaved) onSaved(saved);
      else nav(`${base}/${saved.id}`);
    });

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); save(false); }}>
      <div className="row between">
        <h2 style={{ margin: 0 }}>{invoice ? 'Edit draft invoice' : 'New invoice'}</h2>
        {onCancel ? <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button> : <Link className="btn ghost" to={base}>Back to invoices</Link>}
      </div>

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Bill to</h3>
        <div className="grid2">
          {clients.length > 0 && (
            <label className="field">Client
              <select id="inv-client" value={f.clientAccountId} onChange={(e) => pickClient(e.target.value)}>
                <option value="">Someone without a login</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </label>
          )}
          <label className="field">Event (optional)
            <select id="inv-event" value={f.eventId} onChange={(e) => set({ eventId: e.target.value })}>
              <option value="">No event</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </label>
        </div>
        <div className="grid2">
          <label className="field">Name<input id="inv-name" value={f.customer.name} onChange={setCustomer('name')} required maxLength={120} /></label>
          <label className="field">Email<input id="inv-email" type="email" value={f.customer.email} onChange={setCustomer('email')} placeholder="Needed to send by email" /></label>
          <label className="field">Phone / WhatsApp<input id="inv-phone" value={f.customer.phone} onChange={setCustomer('phone')} maxLength={20} /></label>
          <label className="field">State
            <select id="inv-state" value={f.customer.stateCode} onChange={setCustomer('stateCode')}>
              <option value="">Same as my studio</option>
              {Object.entries(settings.states).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </label>
        </div>
        <label className="field">Address (optional)<textarea id="inv-address" value={f.customer.address} onChange={setCustomer('address')} style={{ minHeight: 60 }} maxLength={400} /></label>
        {gst && <label className="field">Client GSTIN (only for business clients)<input id="inv-gstin" value={f.customer.gstin} onChange={(e) => set({ customer: { ...f.customer, gstin: e.target.value.toUpperCase() } })} maxLength={15} /></label>}
      </div>

      <div className="card stack">
        <div className="grid2">
          <label className="field">Invoice date<input id="inv-issue" type="date" value={f.issueDate} onChange={(e) => set({ issueDate: e.target.value })} required /></label>
          <label className="field">Due date<input id="inv-due" type="date" value={f.dueDate} onChange={(e) => set({ dueDate: e.target.value })} min={f.issueDate} /></label>
          <div className="field" style={{ display: 'grid', gap: 4, fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
            <label className="row" style={{ gap: 8, minHeight: 38 }}>
              <input id="inv-gst-on" type="checkbox" checked={gst} disabled={!settings.gstin} onChange={(e) => set({ gstRate: e.target.checked ? settings.default_gst_rate || 18 : 0 })} />
              Charge GST
              {gst && (
                <select id="inv-gst" aria-label="GST rate" value={f.gstRate} onChange={(e) => set({ gstRate: Number(e.target.value) })} style={{ width: 'auto' }}>
                  {settings.gstRates.filter((r) => r > 0).map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              )}
            </label>
            {!settings.gstin && <span className="small muted" style={{ fontWeight: 400 }}>Optional. To charge GST, add your GSTIN in <Link to={`${base}/settings`}>invoice settings</Link>.</span>}
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Item</th>{gst && <th style={{ width: 100 }}>SAC</th>}<th style={{ width: 80 }}>Qty</th><th style={{ width: 130 }}>Rate (₹)</th><th style={{ width: 120, textAlign: 'right' }}>Amount</th><th style={{ width: 40 }} /></tr>
            </thead>
            <tbody>
              {f.lines.map((l, i) => (
                <tr key={i}>
                  <td><input id={`inv-line-${i}-desc`} aria-label={`Item ${i + 1} description`} value={l.description} onChange={setLine(i, 'description')} placeholder="e.g. Wedding photography, 2 days" required maxLength={300} /></td>
                  {gst && <td><input id={`inv-line-${i}-sac`} aria-label={`Item ${i + 1} SAC`} value={l.sac} onChange={setLine(i, 'sac')} placeholder={settings.default_sac} inputMode="numeric" maxLength={8} /></td>}
                  <td><input id={`inv-line-${i}-qty`} aria-label={`Item ${i + 1} quantity`} type="number" min="0.01" step="0.01" value={l.qty} onChange={setLine(i, 'qty')} required /></td>
                  <td><input id={`inv-line-${i}-rate`} aria-label={`Item ${i + 1} rate`} type="number" min="0" step="0.01" value={l.rate} onChange={setLine(i, 'rate')} required /></td>
                  <td style={{ textAlign: 'right', paddingTop: 18 }}>{rupees(totals.lines[i])}</td>
                  <td><button type="button" className="btn ghost sm" aria-label={`Remove item ${i + 1}`} disabled={f.lines.length === 1} onClick={() => set({ lines: f.lines.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <button type="button" className="btn sm" disabled={f.lines.length >= 30} onClick={() => set({ lines: [...f.lines, emptyLine()] })}>+ Add item</button>
          <table className="small" style={{ minWidth: 260 }}>
            <tbody>
              <tr><td className="muted">Subtotal</td><td style={{ textAlign: 'right' }}>{rupees(totals.subtotal)}</td></tr>
              <tr>
                <td className="muted">Discount (₹)</td>
                <td style={{ textAlign: 'right' }}><input id="inv-discount" aria-label="Discount in rupees" type="number" min="0" step="0.01" value={f.discount} onChange={(e) => set({ discount: e.target.value })} style={{ width: 120, textAlign: 'right' }} /></td>
              </tr>
              {gst && totals.intra && (
                <>
                  <tr><td className="muted">CGST {Number(f.gstRate) / 2}%</td><td style={{ textAlign: 'right' }}>{rupees(Math.round(totals.tax / 2))}</td></tr>
                  <tr><td className="muted">SGST {Number(f.gstRate) / 2}%</td><td style={{ textAlign: 'right' }}>{rupees(totals.tax - Math.round(totals.tax / 2))}</td></tr>
                </>
              )}
              {gst && !totals.intra && <tr><td className="muted">IGST {f.gstRate}%</td><td style={{ textAlign: 'right' }}>{rupees(totals.tax)}</td></tr>}
              <tr><td><b>Total</b></td><td style={{ textAlign: 'right', fontSize: 18 }}><b>{rupees(totals.total)}</b></td></tr>
            </tbody>
          </table>
        </div>
        <label className="field">Note to the client (optional)<textarea id="inv-notes" value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. 50% advance to confirm the booking, balance 7 days before the wedding." maxLength={2000} style={{ minHeight: 60 }} /></label>
      </div>

      {error && <div className="error">{error}</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" disabled={busy}>Save draft</button>
        <button type="button" className="btn primary" disabled={busy || totals.total <= 0} onClick={(e) => { if (e.currentTarget.form.reportValidity()) save(true); }}>
          {f.customer.email.trim() ? 'Save and email to client' : 'Save and issue'}
        </button>
      </div>
      {!f.customer.email.trim() && <p className="small muted" style={{ margin: 0, textAlign: 'right' }}>No email address: the invoice gets its number and you can share the link on WhatsApp.</p>}
    </form>
  );
}
