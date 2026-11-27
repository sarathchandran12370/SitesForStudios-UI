import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, loginPathFor } from '../auth.jsx';
import Login from '../pages/Login.jsx';
import { studioContext } from '../components/studioBrand.js';
import { mockApi } from './setup.js';

const site = {
  studio: { id: 's1', name: 'Arjun Photography', slug: 'arjun-photography', published: true },
  site: { logoUrl: null, theme: { accent: '#7a3b5e' } },
  hero: ['https://cdn.test/hero.jpg'],
  portfolio: [],
};

const renderLogin = (url, routes = {}) => {
  mockApi({ 'GET /api/auth/me': [200, { user: null }], ...routes });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Login branding', () => {
  it('shows the platform brand and links on the platform login', async () => {
    renderLogin('/login');
    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
    expect(screen.getAllByText('SitesForStudios').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Start a free trial' })).toBeInTheDocument();
  });

  it('shows only the studio brand when the client comes from a studio website', async () => {
    renderLogin('/login?studio=arjun-photography', { 'GET /api/sites/arjun-photography': [200, site] });
    expect(await screen.findByText('Log in to see your photos from Arjun Photography.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Client login' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Arjun Photography' })[0]).toHaveAttribute('href', '/s/arjun-photography');
    expect(screen.getByText(/Ask Arjun Photography to reset it/)).toBeInTheDocument();
    expect(screen.queryByText('SitesForStudios')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Start a free trial' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Terms' })).not.toBeInTheDocument();
    expect(document.title).toBe('Client login · Arjun Photography');
  });

  it('falls back to the platform login when the studio is not found on the platform host', async () => {
    renderLogin('/login?studio=nope', { 'GET /api/sites/nope': [404, { error: 'Site not found' }] });
    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });
});

describe('studioContext', () => {
  it('reads the studio from ?studio, a custom domain, or neither', () => {
    expect(studioContext('?studio=arjun-photography', 'app.sitesforstudios.com')).toEqual({ slug: 'arjun-photography' });
    expect(studioContext('', 'arjunphotography.in')).toEqual({ host: 'arjunphotography.in' });
    expect(studioContext('', 'app.sitesforstudios.com')).toBeNull();
    expect(studioContext('?studio=../admin', 'app.sitesforstudios.com')).toBeNull();
  });
});

describe('loginPathFor', () => {
  it('sends clients back to their studio login and everyone else to the platform login', () => {
    expect(loginPathFor({ role: 'client', studio_slug: 'arjun-photography' })).toBe('/login?studio=arjun-photography');
    expect(loginPathFor({ role: 'org_admin', studio_slug: 'arjun-photography' })).toBe('/login');
    expect(loginPathFor(null)).toBe('/login');
  });
});
