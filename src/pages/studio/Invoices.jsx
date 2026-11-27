import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmtDate, rupees } from '../../api.js';
import InvoiceEditor from './InvoiceEditor.jsx';
import InvoiceDetail from './InvoiceDetail.jsx';
import InvoiceSettings from './InvoiceSettings.jsx';

// Invoices the studio sends to its clients. /studio/:id/invoices[/new | /settings | /:invoiceId]
export default function Invoices({ studio, itemId }) {
  if (itemId === 'new') return <InvoiceEditor studio={studio} />;
  if (itemId === 'settings') return <InvoiceSettings studio={studio} />;
  if (itemId) return <InvoiceDetail studio={studio} invoiceId={itemId} />;
  return <InvoiceList studio={studio} />;
}

export function InvoiceStatus({ inv }) {
  if (inv.overdue) return <span className="badge bad">Overdue</span>;
  const map = { draft: ['', 'Draft'], sent: ['accent', 'Unpaid'], partially_paid: ['warn', 'Part paid'], paid: ['good', 'Paid'], cancelled: ['bad', 'Cancelled'] };
  const [tone, label] = map[inv.status] || ['', inv.status];
  return <span className={`badge ${tone}`}>{label}</span>;
}

const FILTERS = [
  ['', 'All'],
  ['draft', 'Drafts'],
  ['unpaid', 'Unpaid'],
  ['overdue', 'Overdue'],
  ['paid', 'Paid'],
  ['cancelled', 'Cancelled'],
];
const matches = (inv, f) =>
  !f ||
  (f === 'unpaid' ? ['sent', 'partially_paid'].includes(inv.status) : f === 'overdue' ? inv.overdue : inv.status === f);

function InvoiceList({ studio }) {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();
  const base = `/studio/${studio.id}/invoices`;
  useEffect(() => {
    api(`/invoices/studio/${studio.id}`).then(setData).catch((e) => setError(e.message));
    api(`/invoices/studio/${studio.id}/settings`).then(setSettings).catch(() => {});
  }, [studio.id]);
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted loading">Loading…</p>;
  const s = data.summary;
  const shown = data.invoices.filter((i) => matches(i, filter));
  return (
    <div className="stack">
      <div className="row between">
        <p className="muted" style={{ margin: 0 }}>Send invoices to your clients by email or WhatsApp and keep track of what they have paid.</p>
        <div className="row">
          <Link className="btn" to={`${base}/settings`}>Invoice settings</Link>
          <Link className="btn primary" to={`${base}/new`}>New invoice</Link>
        </div>
      </div>

      {settings && !settings.saved && (
        <div className="card row between" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <span>Add your business name, address and payment details (UPI, bank, GSTIN) so they appear on every invoice.</span>
          <Link className="btn sm" to={`${base}/settings`}>Add details</Link>
        </div>
      )}

      <div className="card">
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="stat"><span className="small muted">Outstanding</span><b>{rupees(s.outstanding_paise)}</b></div>
          <div className="stat"><span className="small muted">Overdue</span><b style={{ color: s.overdue_paise ? 'var(--bad)' : undefined }}>{rupees(s.overdue_paise)}</b><span className="small muted">{s.overdue_count} invoice{s.overdue_count === 1 ? '' : 's'}</span></div>
          <div className="stat"><span className="small muted">Received this month</span><b>{rupees(s.paid_this_month_paise)}</b></div>
          <div className="stat"><span className="small muted">Drafts</span><b>{s.draft_count}</b></div>
        </div>
      </div>

      <div className="chips">
        {FILTERS.map(([id, label]) => (
          <button key={id} className={`chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
            {label} ({data.invoices.filter((i) => matches(i, id)).length})
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Due</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id} onClick={() => nav(`${base}/${i.id}`)} style={{ cursor: 'pointer' }}>
                  <td><Link to={`${base}/${i.id}`}><b>{i.number || 'Draft'}</b></Link></td>
                  <td>{i.customer.name}{i.event_title && <div className="small muted">{i.event_title}</div>}</td>
                  <td className="small">{fmtDate(i.issue_date)}</td>
                  <td className="small">{fmtDate(i.due_date) || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{rupees(i.total_paise)}</td>
                  <td style={{ textAlign: 'right' }}>{i.status === 'draft' ? '—' : rupees(i.balance_paise)}</td>
                  <td><InvoiceStatus inv={i} /></td>
                </tr>
              ))}
              {!shown.length && (
                <tr><td colSpan={7} className="muted">{data.invoices.length ? 'No invoices match this filter.' : 'No invoices yet. Create one with New invoice.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
