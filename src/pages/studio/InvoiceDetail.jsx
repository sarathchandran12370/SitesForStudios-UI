import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmtDate, rupees } from '../../api.js';
import { Modal, useAsync } from '../../components/ui.jsx';
import { InvoiceStatus } from './Invoices.jsx';
import InvoiceEditor from './InvoiceEditor.jsx';

const METHODS = [['upi', 'UPI'], ['bank', 'Bank transfer'], ['cash', 'Cash'], ['card', 'Card'], ['cheque', 'Cheque'], ['other', 'Other']];
const methodLabel = (m) => METHODS.find(([id]) => id === m)?.[1] || m;

export default function InvoiceDetail({ studio, invoiceId }) {
  const nav = useNavigate();
  const base = `/studio/${studio.id}/invoices`;
  const [inv, setInv] = useState(null);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState('');
  const { busy, error, setError, run } = useAsync();
  useEffect(() => {
    setInv(null);
    api(`/invoices/${invoiceId}`).then(setInv).catch((e) => setError(e.message));
  }, [invoiceId]);

  if (error && !inv) return <p className="error">{error} <Link to={base}>Back to invoices</Link></p>;
  if (!inv) return <p className="muted">Loading…</p>;
  if (editing) return <InvoiceEditor studio={studio} invoice={inv} onCancel={() => setEditing(false)} onSaved={(x) => { setInv(x); setEditing(false); }} />;

  const act = (fn, msg) => run(async () => { const x = await fn(); if (x?.id) setInv(x); if (msg) setNotice(typeof msg === 'function' ? msg(x) : msg); return x; });
  const send = (reminder = false) =>
    act(() => api(`/invoices/${inv.id}/send`, { method: 'POST', body: { email: !!inv.customer.email, reminder } }), (x) =>
      x.emailed ? `${reminder ? 'Reminder' : 'Invoice'} emailed to ${x.customer.email}.` : `Invoice ${x.number} issued. Share the link with your client.`
    );
  const cancel = () => confirm(`Cancel invoice ${inv.number}? It stays in your records marked as cancelled, and the client sees it as cancelled.`) && act(() => api(`/invoices/${inv.id}/cancel`, { method: 'POST' }), 'Invoice cancelled.');
  const remove = () => confirm('Delete this draft?') && run(async () => { await api(`/invoices/${inv.id}`, { method: 'DELETE' }); nav(base); });
  const removePayment = (p) => confirm(`Remove the ${rupees(p.amount_paise)} payment from ${fmtDate(p.paid_on)}?`) && act(() => api(`/invoices/${inv.id}/payments/${p.id}`, { method: 'DELETE' }), 'Payment removed.');
  const copyLink = () => navigator.clipboard.writeText(inv.view_url).then(() => setNotice('Link copied.'), () => setNotice(inv.view_url));
  const waText = `Hi ${inv.customer.name.split(' ')[0]}, here is invoice ${inv.number} from ${studio.name} for ${rupees(inv.total_paise)}${inv.balance_paise && inv.balance_paise !== inv.total_paise ? ` (balance ${rupees(inv.balance_paise)})` : ''}: ${inv.view_url}`;
  const waPhone = (inv.customer.phone || '').replace(/\D/g, '');
  const wa = `https://wa.me/${waPhone.length === 10 ? `91${waPhone}` : waPhone}?text=${encodeURIComponent(waText)}`;
  const open = ['sent', 'partially_paid'].includes(inv.status);
  const gst = inv.gst_rate > 0;

  return (
    <div className="stack">
      <div className="row between">
        <Link className="btn ghost" to={base}>← Invoices</Link>
        <div className="row">
          <a className="btn" href={`/api/invoices/${inv.id}/document`} target="_blank" rel="noreferrer">{inv.status === 'draft' ? 'Preview' : 'View / Print'}</a>
          {inv.status === 'draft' && <button className="btn" onClick={() => setEditing(true)}>Edit</button>}
          {inv.status === 'draft' && <button className="btn primary" disabled={busy} onClick={() => send()}>{inv.customer.email ? 'Send by email' : 'Issue invoice'}</button>}
          {open && <button className="btn primary" onClick={() => setPaying(true)}>Record payment</button>}
        </div>
      </div>

      {notice && <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>{notice}</div>}
      {error && <div className="error">{error}</div>}

      <div className="card stack">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0 }}>{inv.number || 'Draft invoice'} <InvoiceStatus inv={inv} /></h2>
            <div className="muted small">
              {fmtDate(inv.issue_date)}{inv.due_date && ` · due ${fmtDate(inv.due_date)}`}{inv.sent_at && ` · sent ${new Date(inv.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="small muted">{inv.status === 'draft' ? 'Total' : 'Balance due'}</div>
            <div style={{ fontSize: 28, fontFamily: 'Cormorant Garamond', fontWeight: 600 }}>{rupees(inv.status === 'draft' ? inv.total_paise : inv.balance_paise)}</div>
            {inv.paid_paise > 0 && <div className="small muted">{rupees(inv.paid_paise)} of {rupees(inv.total_paise)} paid</div>}
          </div>
        </div>
        <div className="grid2">
          <div>
            <div className="small muted">Bill to</div>
            <b>{inv.customer.name}</b>
            <div className="small">{[inv.customer.email, inv.customer.phone].filter(Boolean).join(' · ') || <span className="muted">No email or phone</span>}</div>
            {inv.customer.gstin && <div className="small">GSTIN {inv.customer.gstin}</div>}
          </div>
          {inv.event_title && <div><div className="small muted">Event</div><b>{inv.event_title}</b>{inv.event_date && <div className="small">{fmtDate(inv.event_date)}</div>}</div>}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Item</th>{gst && <th>SAC</th>}<th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i}><td style={{ whiteSpace: 'pre-line' }}>{l.description}</td>{gst && <td className="small">{l.sac}</td>}<td style={{ textAlign: 'right' }}>{l.qty}</td><td style={{ textAlign: 'right' }}>{rupees(l.rate_paise)}</td><td style={{ textAlign: 'right' }}>{rupees(l.amount_paise)}</td></tr>
              ))}
              {inv.discount_paise > 0 && <tr><td colSpan={gst ? 4 : 3} className="muted">Discount</td><td style={{ textAlign: 'right' }}>− {rupees(inv.discount_paise)}</td></tr>}
              {gst && inv.igst_paise === 0 && (
                <>
                  <tr><td colSpan={4} className="muted">CGST {inv.gst_rate / 2}%</td><td style={{ textAlign: 'right' }}>{rupees(inv.cgst_paise)}</td></tr>
                  <tr><td colSpan={4} className="muted">SGST {inv.gst_rate / 2}%</td><td style={{ textAlign: 'right' }}>{rupees(inv.sgst_paise)}</td></tr>
                </>
              )}
              {gst && inv.igst_paise > 0 && <tr><td colSpan={4} className="muted">IGST {inv.gst_rate}%</td><td style={{ textAlign: 'right' }}>{rupees(inv.igst_paise)}</td></tr>}
              <tr><td colSpan={gst ? 4 : 3}><b>Total</b></td><td style={{ textAlign: 'right' }}><b>{rupees(inv.total_paise)}</b></td></tr>
            </tbody>
          </table>
        </div>
        {inv.notes && <p className="small" style={{ margin: 0, whiteSpace: 'pre-line' }}><span className="muted">Note: </span>{inv.notes}</p>}
      </div>

      {inv.status !== 'draft' && (
        <div className="card stack">
          <h3 style={{ margin: 0 }}>Share with the client</h3>
          <div className="row">
            {inv.customer.email && inv.status !== 'cancelled' && <button className="btn" disabled={busy} onClick={() => send(false)}>Email again</button>}
            {inv.customer.email && open && <button className="btn" disabled={busy} onClick={() => send(true)}>Send payment reminder</button>}
            <a className="btn" href={wa} target="_blank" rel="noreferrer">Share on WhatsApp</a>
            <button className="btn" onClick={copyLink}>Copy link</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Anyone with the link can view this invoice, so share it only with your client.{inv.client_account_id && ' Your client also sees it in their photo portal.'}</p>
        </div>
      )}

      {inv.status !== 'draft' && (
        <div className="card stack">
          <div className="row between">
            <h3 style={{ margin: 0 }}>Payments</h3>
            {open && <button className="btn sm" onClick={() => setPaying(true)}>Record payment</button>}
          </div>
          {inv.payments.length ? (
            <table className="table">
              <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style={{ textAlign: 'right' }}>Amount</th><th /></tr></thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.paid_on)}</td><td>{methodLabel(p.method)}</td><td className="small muted">{p.reference || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{rupees(p.amount_paise)}</td>
                    <td style={{ textAlign: 'right' }}>{inv.status !== 'cancelled' && <button className="btn ghost sm danger" onClick={() => removePayment(p)}>Remove</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>No payments recorded yet. When your client pays by UPI, bank transfer or cash, record it here.</p>
          )}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {inv.status === 'draft' && <button className="btn danger" onClick={remove}>Delete draft</button>}
        {open && inv.paid_paise === 0 && <button className="btn danger" onClick={cancel}>Cancel invoice</button>}
      </div>

      {paying && <RecordPayment inv={inv} onClose={() => setPaying(false)} onSaved={(x) => { setInv(x); setPaying(false); setNotice(`Payment recorded.${x.customer.email ? ' A receipt was emailed to your client.' : ''}`); }} />}
    </div>
  );
}

function RecordPayment({ inv, onClose, onSaved }) {
  const [f, setF] = useState({ amount: inv.balance_paise / 100, method: 'upi', reference: '', paidOn: new Date().toISOString().slice(0, 10), notifyClient: !!inv.customer.email });
  const { busy, error, run } = useAsync();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="Record payment" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => onSaved(await api(`/invoices/${inv.id}/payments`, { method: 'POST', body: { ...f, amount: Number(f.amount) } }))); }}>
        <p className="muted small" style={{ margin: 0 }}>Balance due on {inv.number}: <b>{rupees(inv.balance_paise)}</b></p>
        <div className="grid2">
          <label className="field">Amount (₹)<input id="pay-amount" type="number" min="0.01" step="0.01" max={inv.balance_paise / 100} value={f.amount} onChange={set('amount')} required /></label>
          <label className="field">Received on<input id="pay-date" type="date" value={f.paidOn} onChange={set('paidOn')} required /></label>
          <label className="field">Method
            <select id="pay-method" value={f.method} onChange={set('method')}>{METHODS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          </label>
          <label className="field">Reference (optional)<input id="pay-ref" value={f.reference} onChange={set('reference')} placeholder="UTR, cheque no." maxLength={120} /></label>
        </div>
        {inv.customer.email && <label className="row"><input type="checkbox" checked={f.notifyClient} onChange={(e) => setF({ ...f, notifyClient: e.target.checked })} /> Email a receipt to {inv.customer.email}</label>}
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>Record payment</button>
      </form>
    </Modal>
  );
}
