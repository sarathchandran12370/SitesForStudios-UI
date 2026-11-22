import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { StatusBadge, useAsync } from '../../components/ui.jsx';

export default function DomainSettings({ studio }) {
  const [info, setInfo] = useState(null);
  const [domain, setDomain] = useState(studio.custom_domain || '');
  const { busy, error, run } = useAsync();
  const load = () => api(`/studios/${studio.id}/domain`).then(setInfo);
  useEffect(() => {
    load();
  }, [studio.id]);

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="card stack">
        <div>
          <h3>Use your own domain</h3>
          <p className="muted" style={{ margin: 0 }}>Your website and client login will run on your domain, for example www.yourstudio.in. SSL is set up for you.</p>
        </div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { setInfo({ status: 'pending', ...(await api(`/studios/${studio.id}/domain`, { method: 'PUT', body: { domain: domain.trim() || null } })) }); }); }}>
          <input style={{ flex: 1, minWidth: 220 }} placeholder="www.yourstudio.in" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <button className="btn primary" disabled={busy}>Save domain</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
      {info?.records && (
        <div className="card stack">
          <div className="row between">
            <h3 style={{ margin: 0 }}>{info.domain}</h3>
            <StatusBadge value={info.status} />
          </div>
          <p className="muted" style={{ margin: 0 }}>Add these two records at your domain registrar (GoDaddy, Hostinger, Cloudflare…), then check.</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Type</th><th>Host / name</th><th>Value</th></tr></thead>
              <tbody>
                {info.records.map((r) => (
                  <tr key={r.type}><td><b>{r.type}</b></td><td><code>{r.host}</code></td><td><code>{r.value}</code></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {info.note && <p className="small muted" style={{ margin: 0 }}>{info.note}</p>}
          {info.checks && (
            <p className="small" style={{ margin: 0 }}>
              CNAME {info.checks.cname ? '✓ found' : '✗ not found yet'} · TXT {info.checks.txt ? '✓ found' : '✗ not found yet'}
            </p>
          )}
          <div className="row">
            <button className="btn" disabled={busy} onClick={() => run(async () => setInfo(await api(`/studios/${studio.id}/domain/verify`, { method: 'POST' })))}>Check DNS now</button>
            <button className="btn ghost danger" disabled={busy} onClick={() => run(async () => { await api(`/studios/${studio.id}/domain`, { method: 'PUT', body: { domain: null } }); setDomain(''); setInfo({ status: 'none' }); })}>Remove domain</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>DNS changes can take up to a few hours to appear.</p>
        </div>
      )}
    </div>
  );
}
