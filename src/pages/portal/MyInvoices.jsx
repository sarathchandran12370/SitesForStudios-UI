import { useEffect, useState } from 'react';
import { api, fmtDate, rupees } from '../../api.js';
import PortalTop from './PortalTop.jsx';

const STATUS = { sent: ['accent', 'Due'], partially_paid: ['warn', 'Part paid'], paid: ['good', 'Paid'], cancelled: ['bad', 'Cancelled'] };

// Invoices the studio has sent to this client. Each opens the printable invoice.
export default function MyInvoices() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/portal/invoices').then(setRows).catch((e) => { setError(e.message); setRows([]); });
  }, []);
  const due = (rows || []).filter((i) => ['sent', 'partially_paid'].includes(i.status)).reduce((s, i) => s + i.balance_paise, 0);
  return (
    <div className="portal">
      <PortalTop />
      <div className="portal-body">
        <h1>Invoices</h1>
        <p className="muted" style={{ marginTop: 0 }}>{due > 0 ? `${rupees(due)} is due in total. Open an invoice to see how to pay.` : 'Invoices from your photographer appear here.'}</p>
        {error && <p className="error">{error}</p>}
        {rows === null && <p className="muted loading">Loading…</p>}
        {rows?.length === 0 && !error && <div className="card">No invoices yet.</div>}
        {rows?.length > 0 && (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Invoice</th><th>Date</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Balance</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {rows.map((i) => {
                    const [tone, label] = i.overdue ? ['bad', 'Overdue'] : STATUS[i.status] || ['', i.status];
                    return (
                      <tr key={i.id}>
                        <td><b>{i.number}</b>{i.event_title && <div className="small muted">{i.event_title}</div>}</td>
                        <td className="small">{fmtDate(i.issue_date)}{i.due_date && <div className="muted">Due {fmtDate(i.due_date)}</div>}</td>
                        <td style={{ textAlign: 'right' }}>{rupees(i.total_paise)}</td>
                        <td style={{ textAlign: 'right' }}>{rupees(i.balance_paise)}</td>
                        <td><span className={`badge ${tone}`}>{label}</span></td>
                        <td style={{ textAlign: 'right' }}><a className="btn sm" href={i.view_url} target="_blank" rel="noreferrer">View</a></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
