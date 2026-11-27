import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth.jsx';
import MyEvents from '../pages/portal/MyEvents.jsx';
import { mockApi } from './setup.js';

// In the app, Protected waits for the signed-in user before rendering portal pages.
function Gate() {
  const { user } = useAuth();
  return user ? <MyEvents /> : null;
}

const renderPortal = (events) => {
  mockApi({
    'GET /api/auth/me': [200, { user: { role: 'client', name: 'Anjali Nair', email: 'anjali@test.in', studio_name: 'Arjun Photography' } }],
    'GET /api/portal/events': [200, events],
  });
  return render(
    <MemoryRouter initialEntries={['/portal']}>
      <AuthProvider>
        <Routes>
          <Route path="/portal" element={<Gate />} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Client portal', () => {
  it('lists events with a formatted photo count', async () => {
    renderPortal([{ id: 'e1', title: 'Anjali & Rahul', event_date: '2026-11-14', venue: 'Kumarakom', photoCount: 1248 }]);
    expect(await screen.findByText('Hello, Anjali')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Anjali & Rahul/ })).toHaveAttribute('href', '/portal/events/e1');
    expect(screen.getByText('1,248 photos')).toBeInTheDocument();
  });

  it('shows an empty state when there are no events', async () => {
    renderPortal([]);
    expect(await screen.findByText('No events yet')).toBeInTheDocument();
  });

  it('opens the account menu and closes it with Escape', async () => {
    renderPortal([]);
    const btn = await screen.findByRole('button', { name: 'Account menu' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.click(btn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Change password' })).toHaveAttribute('href', '/change-password');
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
