import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Modal, SecretBox, useAsync } from '../../components/ui.jsx';
import UpgradePrompt from '../../components/UpgradePrompt.jsx';

// Clients (couples, family) and team members (staff). Only the studio creates accounts.
export default function People({ studio, role }) {
  if (role === 'client' && studio.plan?.client_galleries === false) return <UpgradePrompt />;
  return <PeopleList studio={studio} role={role} />;
}

function PeopleList({ studio, role }) {
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState(null);
  const [editing, setEditing] = useState(null);
  const isClient = role === 'client';
  const load = () => api(`/studios/${studio.id}/accounts?role=${role}`).then(setRows);
  useEffect(() => {
    load();
    if (isClient) api(`/events/studio/${studio.id}`).then(setEvents);
  }, [studio.id, role]);

  const reset = async (a) => {
    if (!confirm(`Reset the password for ${a.name}? They will be logged out and get a new temporary password.`)) return;
    const r = await api(`/studios/accounts/${a.id}/reset-password`, { method: 'POST', body: { sendInvite: true } });
    setSecret({ title: 'Password reset', label: `${deliveryNote(r.invited, a.name)} New temporary password:`, email: r.email, password: r.temporaryPassword });
    load();
  };
  const remove = async (a) => {
    if (!confirm(`Delete the account for ${a.name}? They will lose access to their events.`)) return;
    await api(`/studios/accounts/${a.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <div className="row between" style={{ marginBottom: 14 }}>
        <p className="muted" style={{ margin: 0 }}>
          {isClient ? 'Clients log in to see their events and download photos. There is no public sign-up.' : `Team members can upload photos and manage events. Your plan includes ${studio.plan.staff_seats} seat(s).`}
        </p>
        <button className="btn primary" onClick={() => setCreating(true)}>{isClient ? 'Add client' : 'Add team member'}</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th>{isClient && <th>Events</th>}<th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.name}</b>{!isClient && <div className="small muted">{a.role === 'studio_admin' ? 'Admin' : 'Staff'}</div>}</td>
                  <td className="muted">{a.email}{a.phone && <div className="small">{a.phone}</div>}</td>
                  {isClient && (
                    <td className="small">
                      {a.events.map((e) => <div key={e.eventId}>{e.title} {e.accessLevel === 'primary' ? <span className="badge accent">couple</span> : <span className="badge">guest</span>}</div>)}
                      {!a.events.length && <span className="muted">None</span>}
                    </td>
                  )}
                  <td>{a.must_change_password ? <span className="badge warn">Not logged in yet</span> : <span className="badge good">Active</span>}</td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      {isClient && <button className="btn sm" onClick={() => setEditing(a)}>Events</button>}
                      <button className="btn sm" onClick={() => reset(a)}>Reset password</button>
                      <button className="btn sm danger" onClick={() => remove(a)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="muted">Nobody here yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {creating && (
        <CreateAccount
          studio={studio}
          role={role}
          events={events}
          onClose={() => setCreating(false)}
          onCreated={(r) => { setCreating(false); setSecret({ title: 'Account created', label: `${deliveryNote(r.invited, r.account.name)} Login details:`, email: r.account.email, password: r.temporaryPassword }); load(); }}
        />
      )}
      {editing && <EditEvents account={editing} events={events} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {secret && <Modal title={secret.title} onClose={() => setSecret(null)}><SecretBox label={secret.label} email={secret.email} password={secret.password} /></Modal>}
    </>
  );
}

/** Says whether the login details went out by email / WhatsApp, or must be sent by hand. */
function deliveryNote(invited, name) {
  if (!invited) return `Send ${name} their login details yourself.`;
  const ways = [['sent', 'logged'].includes(invited.email) && 'email', invited.whatsapp === 'sent' && 'WhatsApp'].filter(Boolean);
  return ways.length ? `Sent to ${name} by ${ways.join(' and ')}.` : `Sending failed, so send ${name} their login details yourself.`;
}

function EventPicker({ events, value, onChange }) {
  const toggle = (id) => {
    const has = value.find((v) => v.eventId === id);
    onChange(has ? value.filter((v) => v.eventId !== id) : [...value, { eventId: id, accessLevel: 'primary' }]);
  };
  return (
    <div className="stack" style={{ gap: 6, maxHeight: 220, overflow: 'auto' }}>
      {events.map((e) => {
        const v = value.find((x) => x.eventId === e.id);
        return (
          <div key={e.id} className="row between">
            <label className="row"><input type="checkbox" checked={!!v} onChange={() => toggle(e.id)} /> {e.title}</label>
            {v && (
              <select style={{ width: 'auto' }} value={v.accessLevel} onChange={(ev) => onChange(value.map((x) => (x.eventId === e.id ? { ...x, accessLevel: ev.target.value } : x)))}>
                <option value="primary">Couple (all + RAW)</option>
                <option value="guest">Guest</option>
              </select>
            )}
          </div>
        );
      })}
      {!events.length && <span className="muted small">Create an event first.</span>}
    </div>
  );
}

function CreateAccount({ studio, role, events, onClose, onCreated }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', events: [], sendInvite: true });
  const { busy, error, run } = useAsync();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={role === 'client' ? 'Add client' : 'Add team member'} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => onCreated(await api(`/studios/${studio.id}/accounts`, { method: 'POST', body: { ...f, phone: f.phone || undefined, role } }))); }}>
        <label className="field">Name<input value={f.name} onChange={set('name')} required /></label>
        <div className="grid2">
          <label className="field">Email<input type="email" value={f.email} onChange={set('email')} required /></label>
          <label className="field">Phone / WhatsApp<input value={f.phone} onChange={set('phone')} /></label>
        </div>
        {role === 'client' && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="small muted">Events they can see</span>
            <EventPicker events={events} value={f.events} onChange={(v) => setF({ ...f, events: v })} />
          </div>
        )}
        <label className="row"><input type="checkbox" checked={f.sendInvite} onChange={(e) => setF({ ...f, sendInvite: e.target.checked })} /> Send login details by email{f.phone ? ' and WhatsApp' : ''}</label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>Create account</button>
      </form>
    </Modal>
  );
}

function EditEvents({ account, events, onClose, onSaved }) {
  const [value, setValue] = useState(account.events.map((e) => ({ eventId: e.eventId, accessLevel: e.accessLevel })));
  const { busy, error, run } = useAsync();
  return (
    <Modal title={`Events for ${account.name}`} onClose={onClose}>
      <div className="stack">
        <EventPicker events={events} value={value} onChange={setValue} />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy} onClick={() => run(async () => { await api(`/studios/accounts/${account.id}/events`, { method: 'PUT', body: { events: value } }); onSaved(); })}>Save</button>
      </div>
    </Modal>
  );
}
