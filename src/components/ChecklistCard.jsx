import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const readHidden = (key) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

/**
 * Getting-started steps with progress. Shared by the Studio and Organization dashboards.
 * The first open required step is the "next" step; when a step is completed, a short message
 * confirms it and offers to go to the next one.
 */
export default function ChecklistCard({ title = 'Getting started', checklist, storageKey }) {
  const [hidden, setHidden] = useState(() => readHidden(storageKey));
  const [justDone, setJustDone] = useState(null);
  const prev = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!checklist) return;
    const before = prev.current;
    if (before) {
      const finished = checklist.steps.find((s) => s.done && before.steps.find((b) => b.id === s.id && !b.done));
      if (finished) setJustDone(finished);
    }
    prev.current = checklist;
  }, [checklist]);

  if (!checklist || hidden) return null;
  if (checklist.complete) {
    if (!justDone) return null;
    return (
      <section className="card" style={{ marginBottom: 18, background: '#e3f1e8', borderColor: '#b9dcc4' }} aria-live="polite">
        <b>All set!</b> Your studio is ready. <button className="btn ghost sm" onClick={() => setJustDone(null)}>Close</button>
      </section>
    );
  }

  const next = checklist.steps.find((s) => !s.done && !s.optional) || checklist.steps.find((s) => !s.done);
  const pct = Math.round((checklist.done / checklist.total) * 100);
  const hide = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* private mode: hide for this visit only */
    }
    setHidden(true);
  };

  return (
    <section className="card stack" style={{ marginBottom: 18 }} aria-label={title}>
      <div className="row between">
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span className="small muted">{checklist.done} of {checklist.total} done</span>
        </div>
        <button className="btn ghost sm" onClick={hide}>Hide</button>
      </div>
      <div className="progress" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>

      {justDone && next && (
        <div className="row between" role="status" aria-live="polite" style={{ background: '#e3f1e8', borderRadius: 8, padding: '8px 12px' }}>
          <span className="small"><b>✓ Done:</b> {justDone.label}. <b>Next:</b> {next.label}</span>
          <button className="btn sm primary" onClick={() => { setJustDone(null); nav(next.to); }}>Go to next step</button>
        </div>
      )}

      <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
        {checklist.steps.map((s) => {
          const isNext = next && s.id === next.id;
          return (
            <li
              key={s.id}
              className="row"
              aria-current={isNext ? 'step' : undefined}
              style={{ gap: 10, padding: '6px 8px', borderRadius: 8, background: isNext ? 'var(--accent-soft)' : 'transparent' }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, flex: '0 0 auto',
                  background: s.done ? 'var(--good)' : isNext ? 'var(--accent)' : '#eee8e0',
                  color: s.done || isNext ? '#fff' : 'var(--ink-3)',
                }}
              >
                {s.done ? '✓' : isNext ? '→' : ''}
              </span>
              {s.done ? (
                <span className="muted" style={{ textDecoration: 'line-through' }}>{s.label}</span>
              ) : (
                <Link to={s.to} style={isNext ? { fontWeight: 600 } : undefined}>{s.label}</Link>
              )}
              {isNext && <Link className="btn sm accent" to={s.to} style={{ marginLeft: 'auto' }}>Next</Link>}
              <span className="sr-only">{s.done ? '(done)' : isNext ? '(next step)' : '(to do)'}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
