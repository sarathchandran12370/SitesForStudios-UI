import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, homeFor } from '../auth.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { PasswordInput } from '../components/ui.jsx';

export default function ChangePassword() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (f.newPassword !== f.confirm) return setError('The new passwords do not match');
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword: f.currentPassword, newPassword: f.newPassword } });
      await refresh();
      setDone(true);
      setTimeout(() => nav(homeFor({ ...user, must_change_password: false }), { replace: true }), 900);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout quote="Keep your studio and your photos safe." points={['At least 8 characters', 'Mix letters, numbers and symbols', 'Do not reuse a password from another site']}>
      <form className="stack" onSubmit={submit}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{user?.must_change_password ? 'Set your password' : 'Change password'}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {user?.must_change_password ? 'Your studio gave you a temporary password. Choose your own to continue.' : 'Use at least 8 characters.'}
          </p>
        </div>
        <label className="field">Current or temporary password<PasswordInput autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} required /></label>
        <label className="field">New password<PasswordInput autoComplete="new-password" minLength={8} value={f.newPassword} onChange={set('newPassword')} required /></label>
        <label className="field">Confirm new password<PasswordInput autoComplete="new-password" minLength={8} value={f.confirm} onChange={set('confirm')} required /></label>
        {error && <div className="error">{error}</div>}
        {done && <div className="ok" role="status">Password updated.</div>}
        <div className="row">
          <button className="btn primary" style={{ flex: 1 }}>Save password</button>
          {!user?.must_change_password && <button type="button" className="btn ghost" onClick={() => nav(-1)}>Cancel</button>}
        </div>
      </form>
    </AuthLayout>
  );
}
