import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth.jsx';
import Login from '../pages/Login.jsx';
import ChangePassword from '../pages/ChangePassword.jsx';
import AccountBlocked from '../components/AccountBlocked.jsx';
import { PlanEditor } from '../pages/superadmin/SuperAdmin.jsx';
import { EnquiryForm } from '../site/SiteRenderer.jsx';
import { mockApi } from './setup.js';

const withApp = (ui) => {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
};

describe('Login', () => {
  it('shows the error from the API and says studios reset passwords', async () => {
    mockApi({
      'GET /api/auth/me': [200, { user: null }],
      'POST /api/auth/login': [401, { error: 'Wrong email or password' }],
    });
    withApp(<Login />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.in');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Wrong email or password')).toBeInTheDocument();
    expect(screen.getByText(/Ask your photographer to reset it/)).toBeInTheDocument();
  });
});

describe('ChangePassword', () => {
  it('catches mismatched passwords before calling the API', async () => {
    const calls = mockApi({ 'GET /api/auth/me': [200, { user: { role: 'client', must_change_password: true, name: 'A' } }] });
    withApp(<ChangePassword />);
    await screen.findByText('Set your password');
    await userEvent.type(screen.getByLabelText('Current or temporary password'), 'temp1234');
    await userEvent.type(screen.getByLabelText('New password'), 'Brand!New1');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Different!1');
    await userEvent.click(screen.getByRole('button', { name: 'Save password' }));
    expect(screen.getByText('The new passwords do not match')).toBeInTheDocument();
    expect(calls.some((c) => c.key.includes('change-password'))).toBe(false);
  });
});

describe('AccountBlocked', () => {
  it('explains a suspended studio to its admin', async () => {
    mockApi({ 'GET /api/auth/me': [200, { user: { role: 'org_admin', org_status: 'suspended', org_name: 'Arjun Group' } }] });
    withApp(<AccountBlocked />);
    expect(await screen.findByText('Account suspended')).toBeInTheDocument();
    expect(screen.getByText(/Arjun Group is suspended/)).toBeInTheDocument();
  });
  it('tells a client to contact their photographer', async () => {
    mockApi({ 'GET /api/auth/me': [200, { user: { role: 'client', org_status: 'cancelled', studio_name: 'Arjun Photography' } }] });
    withApp(<AccountBlocked />);
    expect(await screen.findByText('Account closed')).toBeInTheDocument();
    expect(screen.getByText(/from Arjun Photography are not available/)).toBeInTheDocument();
  });
});

describe('PlanEditor (item 10)', () => {
  it('sends numbers and switches to the API', async () => {
    const calls = mockApi({ 'PUT /api/admin/plans/pro': [200, {}] });
    const plan = { id: 'pro', name: 'Pro', price_monthly_inr: 6999, price_yearly_inr: 69990, storage_gb: 1536, max_studios: 1, face_events_per_month: 8, staff_seats: 3, raw_delivery: true, premium_templates: true, razorpay_plan_id: null };
    let saved = false;
    render(<PlanEditor plan={plan} onClose={() => {}} onSaved={() => (saved = true)} />);
    const price = screen.getByLabelText('Monthly price (₹)');
    await userEvent.clear(price);
    await userEvent.type(price, '7499');
    await userEvent.click(screen.getByLabelText('RAW delivery'));
    await userEvent.click(screen.getByRole('button', { name: 'Save plan' }));
    await waitFor(() => expect(saved).toBe(true));
    const body = calls.find((c) => c.key === 'PUT /api/admin/plans/pro').body;
    expect(body.price_monthly_inr).toBe(7499);
    expect(body.raw_delivery).toBe(false);
    expect(body).not.toHaveProperty('retention_months');
    expect(body.razorpay_plan_id).toBe(null);
  });
});

describe('EnquiryForm', () => {
  it('submits and tells the couple whether the date is free', async () => {
    const calls = mockApi({ 'POST /api/sites/arjun/enquiries': [201, { ok: true, dateAvailable: true }] });
    render(<EnquiryForm slug="arjun" />);
    await userEvent.type(screen.getByLabelText('Your names'), 'Riya & Sam');
    await userEvent.type(screen.getByLabelText('Phone / WhatsApp'), '9876543210');
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(await screen.findByText(/your date looks free/)).toBeInTheDocument();
    expect(calls[0].body).toMatchObject({ name: 'Riya & Sam', phone: '9876543210' });
  });
});
