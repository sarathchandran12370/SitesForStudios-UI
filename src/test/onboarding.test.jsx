import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, homeFor } from '../auth.jsx';
import Signup from '../pages/Signup.jsx';
import ChecklistCard from '../components/ChecklistCard.jsx';
import { mockApi } from './setup.js';

const options = { enabled: true, trialDays: 14, plans: [
  { id: 'starter', name: 'Starter', price_monthly_inr: 3499 },
  { id: 'pro', name: 'Pro', price_monthly_inr: 6999 },
  { id: 'organization', name: 'Organization', price_monthly_inr: 14999 },
] };

const renderSignup = () =>
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/studio/:id" element={<div>Studio dashboard</div>} />
          <Route path="/org" element={<div>Organization dashboard</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('homeFor in single-studio mode', () => {
  it('sends a one-studio owner to the studio, a multi-studio owner to the organization', () => {
    expect(homeFor({ role: 'org_admin', org_mode: 'single', home_studio_id: 's1' })).toBe('/studio/s1');
    expect(homeFor({ role: 'org_admin', org_mode: 'multi', home_studio_id: 's1' })).toBe('/org');
  });
});

describe('Signup', () => {
  it('walks a studio through details and the email code, then opens its studio dashboard', async () => {
    let signedIn = false;
    const calls = mockApi({
      'GET /api/auth/me': () => [200, { user: signedIn ? { role: 'org_admin', org_mode: 'single', home_studio_id: 's9', org_status: 'trial' } : null }],
      'GET /api/signup/options': [200, options],
      'POST /api/signup/start': [201, { requestId: '7b3c7a1e-8a8b-4f0a-9a6e-1a2b3c4d5e6f', email: 'meera@test.in', devCode: '123456' }],
      'POST /api/signup/verify': () => { signedIn = true; return [201, { user: {} }]; },
    });
    renderSignup();
    await userEvent.click(await screen.findByRole('button', { name: /I run a studio/ }));
    await userEvent.type(screen.getByLabelText('Studio name'), 'Lens & Light');
    await userEvent.type(screen.getByLabelText('Your name'), 'Meera Nair');
    await userEvent.type(screen.getByLabelText('Phone / WhatsApp'), '9811122233');
    await userEvent.type(screen.getByLabelText('Email'), 'meera@test.in');
    await userEvent.type(screen.getByLabelText('Password'), 'Strong!pass1');
    expect(screen.getByRole('button', { name: /Pro · ₹6,999/ })).toHaveClass('active');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByText(/Development mode: your code is/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend code in/ })).toBeDisabled();
    expect(calls.find((c) => c.key === 'POST /api/signup/start').body).toMatchObject({ type: 'studio', studioName: 'Lens & Light', planId: 'pro' });

    await userEvent.type(screen.getByLabelText('6-digit code'), '12a3456');
    expect(screen.getByLabelText('6-digit code')).toHaveValue('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and create account' }));
    expect(await screen.findByText('Studio dashboard')).toBeInTheDocument();
  });

  it('organization sign-up asks for the organization name and uses the Organization plan', async () => {
    const calls = mockApi({
      'GET /api/auth/me': [200, { user: null }],
      'GET /api/signup/options': [200, options],
      'POST /api/signup/start': [409, { error: 'An account with this email already exists. Log in instead.' }],
    });
    renderSignup();
    await userEvent.click(await screen.findByRole('button', { name: /I run several studios/ }));
    await userEvent.type(screen.getByLabelText('Organization name'), 'Big Day Group');
    await userEvent.type(screen.getByLabelText('First studio name'), 'Big Day Kochi');
    await userEvent.type(screen.getByLabelText('Your name'), 'Ravi');
    await userEvent.type(screen.getByLabelText('Phone / WhatsApp'), '9822233344');
    await userEvent.type(screen.getByLabelText('Email'), 'ravi@test.in');
    await userEvent.type(screen.getByLabelText('Password'), 'Strong!pass1');
    expect(screen.getByText(/Organization plan · ₹14,999\/month after the trial/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /api/signup/start').body).toMatchObject({ type: 'organization', orgName: 'Big Day Group', planId: 'organization' });
  });

  it('says when sign-up is closed', async () => {
    mockApi({ 'GET /api/auth/me': [200, { user: null }], 'GET /api/signup/options': [200, { ...options, enabled: false }] });
    renderSignup();
    expect(await screen.findByText(/Sign-up is closed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /I run a studio/ })).toBeNull();
  });
});

describe('ChecklistCard', () => {
  const checklist = {
    done: 1,
    total: 3,
    complete: false,
    steps: [
      { id: 'website', label: 'Customise your website', done: true, to: '/studio/s1/website' },
      { id: 'event', label: 'Create your first event', done: false, to: '/studio/s1/events' },
      { id: 'plan', label: 'Choose a plan', done: false, to: '/org/billing' },
    ],
  };
  const renderCard = (c = checklist) => render(<MemoryRouter><ChecklistCard checklist={c} storageKey={`test-${Math.random()}`} /></MemoryRouter>);

  it('shows progress, links the open steps and strikes through done ones', () => {
    renderCard();
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first event' })).toHaveAttribute('href', '/studio/s1/events');
    expect(screen.queryByRole('link', { name: 'Customise your website' })).toBeNull();
  });

  it('can be hidden and disappears when everything is done', async () => {
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('Getting started')).toBeNull();
    const { container } = renderCard({ ...checklist, complete: true });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ChecklistCard progress', () => {
  const steps = (doneIds) => [
    { id: 'website', label: 'Customise your website', to: '/studio/s1/website' },
    { id: 'publish', label: 'Publish your website', to: '/studio/s1/website' },
    { id: 'event', label: 'Create your first event', to: '/studio/s1/events' },
  ].map((s) => ({ ...s, done: doneIds.includes(s.id) }));
  const list = (doneIds) => ({ steps: steps(doneIds), done: doneIds.length, total: 3, complete: doneIds.length === 3 });
  const key = 'progress-test';
  const ui = (c) => <MemoryRouter><ChecklistCard checklist={c} storageKey={key} /></MemoryRouter>;

  it('highlights the first open step as the next step', () => {
    render(ui(list([])));
    const current = document.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent('Customise your website');
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/studio/s1/website');
  });

  it('when a step is completed, ticks it, moves "next" on and offers to go there', async () => {
    const { rerender } = render(ui(list([])));
    rerender(ui(list(['website'])));
    expect(await screen.findByRole('status')).toHaveTextContent('✓ Done: Customise your website. Next: Publish your website');
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Publish your website');
    expect(screen.getByRole('button', { name: 'Go to next step' })).toBeInTheDocument();
  });

  it('celebrates when everything is done', async () => {
    const { rerender } = render(ui(list(['website', 'publish'])));
    rerender(ui(list(['website', 'publish', 'event'])));
    expect(await screen.findByText('All set!')).toBeInTheDocument();
  });
});

describe('api() change notifications', () => {
  it('announces successful saves so progress widgets refresh, but not reads or failures', async () => {
    const { api } = await import('../api.js');
    const { vi } = await import('vitest');
    mockApi({ 'PUT /api/x': [200, {}], 'GET /api/x': [200, {}], 'POST /api/bad': [400, { error: 'no' }] });
    const seen = vi.fn();
    window.addEventListener('sfs:changed', seen);
    await api('/x', { method: 'PUT', body: {} });
    await api('/x');
    await api('/bad', { method: 'POST', body: {} }).catch(() => {});
    window.removeEventListener('sfs:changed', seen);
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
