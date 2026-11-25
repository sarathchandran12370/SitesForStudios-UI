import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import BookingEditor from './BookingEditor.jsx';
import BookingDetail from './BookingDetail.jsx';

// Bookings calendar. /studio/:id/bookings[?month=2027-01] | /new[?date=] | /:bookingId
export default function Bookings({ studio, itemId }) {
  if (itemId === 'new') return <BookingEditor studio={studio} />;
  if (itemId) return <BookingDetail studio={studio} bookingId={itemId} />;
  return <BookingCalendar studio={studio} />;
}

export const STATUS_LABEL = { tentative: 'On hold', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
export const STATUS_TONE = { tentative: 'warn', confirmed: 'accent', completed: 'good', cancelled: 'bad' };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => iso(new Date());

/** 6 weeks of dates covering the month, starting on Sunday. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)));
}

/** One calendar entry per session: { date, booking, session }. */
function entriesByDate(bookings, showCancelled) {
  const map = {};
  for (const b of bookings) {
    if (!showCancelled && b.status === 'cancelled') continue;
    for (const s of b.sessions) (map[s.date] ||= []).push({ booking: b, session: s });
  }
  for (const list of Object.values(map)) list.sort((a, b) => (a.session.start_time || '').localeCompare(b.session.start_time || ''));
  return map;
}

const chipText = ({ booking, session }) => `${session.start_time ? `${session.start_time} ` : ''}${booking.title}${booking.sessions.length > 1 ? ` · ${session.label}` : ''}`;

function BookingCalendar({ studio }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const base = `/studio/${studio.id}/bookings`;
  const now = new Date();
  const [year, month] = (params.get('month') || `${now.getFullYear()}-${now.getMonth() + 1}`).split('-').map(Number);
  const grid = useMemo(() => monthGrid(year, month - 1), [year, month]);
  const [data, setData] = useState(null);
  const [upcoming, setUpcoming] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api(`/bookings/studio/${studio.id}?from=${iso(grid[0][0])}&to=${iso(grid[5][6])}`).then(setData).catch((e) => setError(e.message));
  }, [studio.id, year, month]);
  useEffect(() => {
    const end = new Date();
    end.setDate(end.getDate() + 180);
    api(`/bookings/studio/${studio.id}?from=${todayIso()}&to=${iso(end)}`).then((d) => setUpcoming(d.bookings)).catch(() => setUpcoming([]));
  }, [studio.id]);

  const go = (delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    setParams({ month: `${d.getFullYear()}-${d.getMonth() + 1}` });
  };
  const entries = entriesByDate(data?.bookings || [], showCancelled);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const today = todayIso();
  const monthDates = grid.flat().filter((d) => d.getMonth() === month - 1).map(iso).filter((d) => entries[d]);
  const next = (upcoming || [])
    .filter((b) => b.status !== 'cancelled')
    .flatMap((b) => b.sessions.filter((s) => s.date >= today).map((s) => ({ booking: b, session: s })))
    .sort((a, b) => (a.session.date + (a.session.start_time || '')).localeCompare(b.session.date + (b.session.start_time || '')))
    .slice(0, 8);

  return (
    <div className="stack">
      <div className="row between">
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => go(-1)} aria-label="Previous month">‹</button>
          <h2 style={{ margin: 0, minWidth: 190, textAlign: 'center' }}>{monthName}</h2>
          <button className="btn sm" onClick={() => go(1)} aria-label="Next month">›</button>
          <button className="btn sm ghost" onClick={() => setParams({})}>Today</button>
        </div>
        <div className="row">
          <label className="row small muted" style={{ gap: 6 }}><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Show cancelled</label>
          <Link className="btn primary" to={`${base}/new`}>New booking</Link>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="cal" aria-busy={!data}>
        <div className="cal-head">{WEEKDAYS.map((d) => <div key={d}>{d}</div>)}</div>
        {grid.map((week, w) => (
          <div className="cal-week" key={w}>
            {week.map((d) => {
              const key = iso(d);
              const list = entries[key] || [];
              const out = d.getMonth() !== month - 1;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}${list.length ? `, ${list.length} booked` : ', free'}. Add a booking`}
                  className={`cal-day ${out ? 'out' : ''} ${key === today ? 'today' : ''}`}
                  onClick={() => nav(`${base}/new?date=${key}`)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), nav(`${base}/new?date=${key}`))}
                >
                  <span className="cal-num">{d.getDate()}</span>
                  {list.slice(0, 3).map((x) => (
                    <Link key={x.session.id} to={`${base}/${x.booking.id}`} className={`cal-chip ${x.booking.status}`} title={`${chipText(x)}${x.session.venue ? ` · ${x.session.venue}` : ''}`} onClick={(e) => e.stopPropagation()}>
                      {chipText(x)}
                    </Link>
                  ))}
                  {list.length > 3 && <span className="cal-more">+{list.length - 3} more</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="card cal-mobile">
        <h3 style={{ marginTop: 0 }}>{monthName}</h3>
        <Agenda base={base} items={monthDates.flatMap((d) => entries[d])} empty="Nothing booked this month." />
      </div>

      <div className="row between">
        <div className="cal-legend">
          {['tentative', 'confirmed', 'completed', 'cancelled'].map((s) => <span key={s} className={`cal-chip ${s}`}>{STATUS_LABEL[s]}</span>)}
        </div>
        <span className="small muted">Click a day to add a booking. Dates on hold or confirmed show as taken on your website's enquiry form.</span>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Coming up</h3>
        {upcoming === null ? <p className="muted">Loading…</p> : <Agenda base={base} items={next} empty="No upcoming bookings in the next six months." />}
      </div>
    </div>
  );
}

function Agenda({ base, items, empty }) {
  if (!items.length) return <p className="muted" style={{ margin: 0 }}>{empty}</p>;
  return (
    <div className="agenda">
      {items.map(({ booking: b, session: s }) => {
        const d = new Date(`${s.date}T00:00:00`);
        return (
          <Link key={`${b.id}-${s.id}`} to={`${base}/${b.id}`} className="agenda-row">
            <div className="agenda-date"><b>{d.getDate()}</b><span>{d.toLocaleDateString('en-IN', { month: 'short' })} · {d.toLocaleDateString('en-IN', { weekday: 'short' })}</span></div>
            <div style={{ minWidth: 0 }}>
              <div><b>{b.title}</b> <span className={`badge ${STATUS_TONE[b.status]}`}>{STATUS_LABEL[b.status]}</span></div>
              <div className="small muted">
                {[s.label, s.start_time && `${s.start_time}${s.end_time ? `–${s.end_time}` : ''}`, s.venue].filter(Boolean).join(' · ')}
              </div>
              {b.team_members.length > 0 && <div className="small muted">Team: {b.team_members.map((t) => t.name).join(', ')}</div>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

