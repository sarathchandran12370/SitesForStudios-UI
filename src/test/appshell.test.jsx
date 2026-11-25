import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth.jsx';
import AppShell from '../components/AppShell.jsx';
import { mockApi } from './setup.js';

const user = { role: 'org_admin', org_mode: 'single', org_status: 'active', name: 'Arjun', email: 'a@b.in' };

function Gate() {
  const { user: u } = useAuth();
  return u ? <AppShell /> : null;
}

const renderShell = () => {
  mockApi({
    'GET /api/auth/me': [200, { user }],
    'GET /api/studios/mine': [200, [{ id: 's1', name: 'Arjun Photography' }]],
  });
  return render(
    <MemoryRouter initialEntries={['/studio/s1']}>
      <AuthProvider>
        <Routes>
          <Route element={<Gate />}>
            <Route path="/studio/s1" element={<Link to="/org/billing">Go to billing</Link>} />
            <Route path="/org/billing" element={<p>Billing page</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('AppShell phone menu', () => {
  it('opens and closes the drawer with the menu button and Escape', async () => {
    const { container } = renderShell();
    const btn = await screen.findByRole('button', { name: 'Open menu' });
    expect(btn).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(btn);
    expect(container.querySelector('.shell')).toHaveClass('menu-open');
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    expect(container.querySelector('.shell')).not.toHaveClass('menu-open');

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(container.querySelector('.side-back'));
    expect(container.querySelector('.shell')).not.toHaveClass('menu-open');
  });

  it('closes the drawer after navigating', async () => {
    const { container } = renderShell();
    await userEvent.click(await screen.findByRole('button', { name: 'Open menu' }));
    await userEvent.click(screen.getByRole('link', { name: 'Go to billing' }));
    expect(await screen.findByText('Billing page')).toBeInTheDocument();
    expect(container.querySelector('.shell')).not.toHaveClass('menu-open');
  });
});
