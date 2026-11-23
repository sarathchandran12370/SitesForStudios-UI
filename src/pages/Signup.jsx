import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, inr } from '../api.js';
import { useAuth, homeFor } from '../auth.jsx';

// Self sign-up: 1) studio or organization, 2) details, 3) 6-digit email code.
export default function Signup() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [options, setOptions] = useState(null);
  const [step, setStep] = useState('type');
  const [type, setType] = useState('studio');
  const [f, setF] = useState({ studioName: '', orgName: '', name: '', email: '', phone: '', password: '', planId: 'pro', website: '' });
  const [pending, setPending] = useState(null); // { requestId, email, devCode? }
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef();

  useEffect(() => {
    api('/signup/options').then(setOptions).catch(() => setOptions({ enabled: false, plans: [] }));
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  if (user) return <Navigate to={homeFor(user)} replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const plans = (options?.plans || []).filter((p) => (type === 'organization' ? p.id === 'organization' : p.id !== 'organization'));

  const chooseType = (t) => {
    setType(t);
    setF({ ...f, planId: t === 'organization' ? 'organization' : 'pro' });
    setStep('details');
    setError('');
  };

  const start = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { type, ...f, orgName: type === 'organization' ? f.orgName : undefined };
      const r = await api('/signup/start', { method: 'POST', body });
      setPending(r);
      setCooldown(60);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/signup/verify', { method: 'POST', body: { requestId: pending.requestId, code } });
      const me = await refresh();
      nav(homeFor(me), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const r = await api('/signup/resend', { method: 'POST', body: { requestId: pending.requestId } });
      setPending({ ...pending, devCode: r.devCode });
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="center-page" style={{ background: 'linear-gradient(160deg,#f4ebe1,#faf8f5 60%)', alignItems: 'start', paddingTop: 48 }}>
      <div className="card stack" style={{ width: 'min(560px,100%)', padding: 32 }}>
        <div>
          <Link to="/" className="brand" style={{ color: 'var(--ink)', padding: 0, marginBottom: 10 }}><i />SitesForStudios</Link>
          <h1 style={{ marginBottom: 4 }}>{step === 'code' ? 'Check your email' : 'Start your free trial'}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {step === 'code'
              ? `We sent a 6-digit code to ${pending?.email}.`
              : `${options?.trialDays || 14} days free. No card needed. Your website, galleries and client delivery in one place.`}
          </p>
        </div>

        {options && !options.enabled && <div className="error">Sign-up is closed right now. Please contact us for an account.</div>}

        {step === 'type' && options?.enabled && (
          <div className="stack">
            <button type="button" className="template-card" style={{ padding: 18 }} onClick={() => chooseType('studio')}>
              <b>I run a studio</b>
              <div className="small muted">One studio and its website, galleries and clients. You can grow into an organization later.</div>
            </button>
            <button type="button" className="template-card" style={{ padding: 18 }} onClick={() => chooseType('organization')}>
              <b>I run several studios</b>
              <div className="small muted">An organization with up to 3 studio brands, each with its own website and team.</div>
            </button>
          </div>
        )}

        {step === 'details' && (
          <form className="stack" onSubmit={start}>
            {type === 'organization' && <label className="field">Organization name<input value={f.orgName} onChange={set('orgName')} required minLength={2} placeholder="Arjun Creative Group" /></label>}
            <label className="field">{type === 'organization' ? 'First studio name' : 'Studio name'}<input value={f.studioName} onChange={set('studioName')} required minLength={2} placeholder="Arjun Photography" /></label>
            <div className="grid2">
              <label className="field">Your name<input value={f.name} onChange={set('name')} required minLength={2} autoComplete="name" /></label>
              <label className="field">Phone / WhatsApp<input value={f.phone} onChange={set('phone')} required minLength={6} autoComplete="tel" /></label>
            </div>
            <label className="field">Email<input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></label>
            <label className="field">Password<input type="password" value={f.password} onChange={set('password')} required minLength={8} autoComplete="new-password" /></label>
            {plans.length > 1 && (
              <div className="stack" style={{ gap: 6 }}>
                <span className="small muted">Plan to try (you can change it any time)</span>
                <div className="chips">
                  {plans.map((p) => (
                    <button type="button" key={p.id} className={`chip ${f.planId === p.id ? 'active' : ''}`} onClick={() => setF({ ...f, planId: p.id })}>
                      {p.name} · {inr(p.price_monthly_inr)}/mo after trial
                    </button>
                  ))}
                </div>
              </div>
            )}
            {plans.length === 1 && <p className="small muted" style={{ margin: 0 }}>Organization plan · {inr(plans[0].price_monthly_inr)}/month after the trial.</p>}
            <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
            {error && <div className="error">{error}</div>}
            <div className="row between">
              <button type="button" className="btn ghost" onClick={() => setStep('type')}>Back</button>
              <button className="btn primary" disabled={busy}>{busy ? 'Sending code…' : 'Continue'}</button>
            </div>
          </form>
        )}

        {step === 'code' && (
          <form className="stack" onSubmit={verify}>
            <label className="field">6-digit code
              <input
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
                required
              />
            </label>
            {pending?.devCode && <p className="small muted" style={{ margin: 0 }}>Development mode: your code is <b>{pending.devCode}</b></p>}
            {error && <div className="error">{error}</div>}
            <button className="btn primary" disabled={busy || code.length !== 6} style={{ justifyContent: 'center' }}>{busy ? 'Creating your account…' : 'Verify and create account'}</button>
            <div className="row between small">
              <button type="button" className="btn ghost sm" onClick={() => { setStep('details'); setCode(''); }}>Change details</button>
              <button type="button" className="btn ghost sm" disabled={cooldown > 0} onClick={resend}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</button>
            </div>
          </form>
        )}

        <p className="small muted" style={{ margin: 0 }}>Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
