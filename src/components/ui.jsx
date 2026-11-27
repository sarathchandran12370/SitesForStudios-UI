import { useState } from 'react';

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Shows a one-time temporary password with copy button. */
export function SecretBox({ label, email, password }) {
  const [copied, setCopied] = useState(false);
  const text = `Login: ${window.location.origin}/login\nEmail: ${email}\nTemporary password: ${password}`;
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>{label}</p>
      <div className="secret">{email}<br />{password}</div>
      <div className="row">
        <button className="btn" onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}>{copied ? 'Copied' : 'Copy login details'}</button>
        <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>Share on WhatsApp</a>
      </div>
      <p className="small muted" style={{ margin: 0 }}>This password is shown once. They will be asked to set their own password at first login.</p>
    </div>
  );
}

export function useAsync() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export function StatusBadge({ value }) {
  const tone = { expired: 'bad', paid: 'good', void: 'bad', sent: 'good', logged: 'accent', skipped: '', archived: 'warn', restoring: 'warn', active: 'good', live: 'good', verified: 'good', booked: 'good', ready: 'good', trial: 'accent', new: 'accent', pending: 'warn', past_due: 'warn', contacted: 'warn', quoted: 'warn', suspended: 'bad', failed: 'bad', lost: 'bad', cancelled: 'bad' }[value] || '';
  return <span className={`badge ${tone}`}>{String(value).replace('_', ' ')}</span>;
}

/** Password field with a show/hide toggle. Put it inside a <label className="field">. */
export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input {...props} type={show ? 'text' : 'password'} />
      <button type="button" className="pw-toggle" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(!show)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}
