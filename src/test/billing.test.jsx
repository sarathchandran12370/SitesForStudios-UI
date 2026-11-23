import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Billing, { BillingDetails } from '../pages/org/Billing.jsx';
import { mockApi } from './setup.js';

const plan = (id, name, m, y, extra = {}) => ({
  id, name, price_monthly_inr: m, price_yearly_inr: y, storage_gb: 500, max_studios: 1, staff_seats: 1, face_events_per_month: 3,
  raw_delivery: false, premium_templates: false, retention_months: 12,
  monthlyTotalPaise: Math.round(m * 118), yearlyTotalPaise: Math.round(y * 118), payable: { monthly: true, yearly: true }, ...extra,
});
const summary = (over = {}) => ({
  org: { id: 'o1', name: 'Arjun Creative', status: 'trial', planId: 'starter', cycle: 'monthly', currentPeriodEnd: null, cancelAtPeriodEnd: false, pendingPlanId: null, hasSubscription: false, ...over.org },
  plans: [plan('starter', 'Starter', 3499, 34990), plan('pro', 'Pro', 6999, 69990, { raw_delivery: true, storage_gb: 1536 }), plan('organization', 'Organization', 14999, 149990, { max_studios: 3, storage_gb: 4096 })],
  profile: null,
  invoices: [],
  unbilledAddons: [],
  billing: { enabled: true, keyId: 'rzp_test', gst: true, gstRate: 18, ...over.billing },
  ...over.root,
});
const states = { '32': 'Kerala', '29': 'Karnataka' };
const page = () => render(<MemoryRouter><Billing /></MemoryRouter>);

describe('Billing page', () => {
  it('shows plans with the GST-inclusive price and a trial notice', async () => {
    mockApi({ 'GET /api/billing/summary': [200, summary()], 'GET /api/billing/config': [200, { states }] });
    page();
    expect(await screen.findByText(/You're on a free trial/)).toBeInTheDocument();
    expect(screen.getByText('+ 18% GST = ₹8,258.82')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose Pro' })).toBeEnabled();
  });

  it('switches prices between monthly and yearly', async () => {
    mockApi({ 'GET /api/billing/summary': [200, summary()], 'GET /api/billing/config': [200, { states }] });
    page();
    await screen.findByText('Plans');
    await userEvent.click(screen.getByRole('button', { name: 'Yearly (2 months free)' }));
    expect(screen.getByText('₹69,990')).toBeInTheDocument();
    expect(screen.getByText('+ 18% GST = ₹82,588.20')).toBeInTheDocument();
  });

  it('asks for billing details before opening checkout', async () => {
    const calls = mockApi({ 'GET /api/billing/summary': [200, summary()], 'GET /api/billing/config': [200, { states }] });
    page();
    await userEvent.click(await screen.findByRole('button', { name: 'Choose Pro' }));
    expect(await screen.findByText(/Add your billing details below first/)).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /api/billing/checkout')).toBe(false);
  });

  it('marks the current plan and offers Upgrade for higher plans', async () => {
    mockApi({
      'GET /api/billing/summary': [200, summary({ org: { status: 'active', planId: 'pro', hasSubscription: true, currentPeriodEnd: '2026-12-23T00:00:00Z' } })],
      'GET /api/billing/config': [200, { states }],
    });
    page();
    expect(await screen.findByRole('button', { name: 'Current plan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upgrade' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Switch' })).toBeEnabled();
    expect(screen.getByText(/renews on/)).toBeInTheDocument();
  });

  it('explains when online payment is not switched on', async () => {
    mockApi({ 'GET /api/billing/summary': [200, summary({ billing: { enabled: false } })], 'GET /api/billing/config': [200, { states }] });
    page();
    expect(await screen.findByText(/Online payment isn't switched on yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose Pro' })).toBeDisabled();
  });

  it('lists invoices with a link to the printable document', async () => {
    mockApi({
      'GET /api/billing/summary': [200, summary({ root: { invoices: [{ id: 'i1', number: 'SFS/2026-27/0001', issued_at: '2026-11-23', total_paise: 825882, status: 'paid' }] } })],
      'GET /api/billing/config': [200, { states }],
    });
    page();
    expect(await screen.findByText('SFS/2026-27/0001')).toBeInTheDocument();
    expect(screen.getByText('₹8,258.82')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View / PDF' })).toHaveAttribute('href', '/api/billing/invoices/i1/document');
  });
});

describe('BillingDetails', () => {
  it('catches a GSTIN from another state before saving', async () => {
    const calls = mockApi({ 'GET /api/billing/config': [200, { states }] });
    render(<BillingDetails profile={null} />);
    await screen.findByRole('option', { name: 'Kerala' });
    await userEvent.type(screen.getByLabelText('Legal business name'), 'Arjun Creative LLP');
    await userEvent.type(screen.getByLabelText('GSTIN (optional)'), '29aabcs1234a1z5');
    await userEvent.type(screen.getByLabelText('Address'), 'MG Road');
    await userEvent.type(screen.getByLabelText('City'), 'Kochi');
    await userEvent.type(screen.getByLabelText('PIN code'), '682016');
    await userEvent.type(screen.getByLabelText('Invoice email'), 'a@b.in');
    await userEvent.click(screen.getByRole('button', { name: 'Save billing details' }));
    expect(screen.getByText(/different state code/)).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'PUT /api/billing/profile')).toBe(false);
  });

  it('saves valid details with the GSTIN in capitals', async () => {
    const calls = mockApi({ 'GET /api/billing/config': [200, { states }], 'PUT /api/billing/profile': [200, {}] });
    let saved = false;
    render(<BillingDetails profile={null} onSaved={() => (saved = true)} />);
    await screen.findByRole('option', { name: 'Kerala' });
    await userEvent.type(screen.getByLabelText('Legal business name'), 'Arjun Creative LLP');
    await userEvent.type(screen.getByLabelText('GSTIN (optional)'), '32aabcs1234a1z5');
    await userEvent.type(screen.getByLabelText('Address'), 'MG Road');
    await userEvent.type(screen.getByLabelText('City'), 'Kochi');
    await userEvent.type(screen.getByLabelText('PIN code'), '682016');
    await userEvent.type(screen.getByLabelText('Invoice email'), 'a@b.in');
    await userEvent.click(screen.getByRole('button', { name: 'Save billing details' }));
    await screen.findByRole('button', { name: 'Save billing details' });
    await new Promise((r) => setTimeout(r, 20));
    expect(saved).toBe(true);
    expect(calls.find((c) => c.key === 'PUT /api/billing/profile').body).toMatchObject({ gstin: '32AABCS1234A1Z5', stateCode: '32' });
  });
});

describe('Website plan in the UI', () => {
  it('billing shows the Website plan as website-only', async () => {
    const s = summary();
    s.plans.unshift(plan('website', 'Website', 999, 9990, { client_galleries: false, storage_gb: 10, face_events_per_month: 0 }));
    mockApi({ 'GET /api/billing/summary': [200, s], 'GET /api/billing/config': [200, { states }] });
    page();
    expect(await screen.findByText('Website')).toBeInTheDocument();
    expect(screen.getByText('+ 18% GST = ₹1,178.82')).toBeInTheDocument();
    expect(screen.getByText(/Website, enquiries and portfolio only/)).toBeInTheDocument();
  });

  it('the Clients tab shows an upgrade prompt on the Website plan', async () => {
    const { default: People } = await import('../pages/studio/People.jsx');
    const { AuthProvider } = await import('../auth.jsx');
    mockApi({ 'GET /api/auth/me': [200, { user: { role: 'org_admin', name: 'Nila' } }] });
    render(<MemoryRouter><AuthProvider><People studio={{ id: 's1', plan: { client_galleries: false, staff_seats: 1 } }} role="client" /></AuthProvider></MemoryRouter>);
    expect(await screen.findByText('Client galleries are not in your plan')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'See plans and upgrade' })).toHaveAttribute('href', '/org/billing');
  });
});
