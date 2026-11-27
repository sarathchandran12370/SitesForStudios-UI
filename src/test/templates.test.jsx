import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudioSite, TEMPLATE_LAYOUTS, layoutFor } from '../site/SiteRenderer.jsx';

const photo = (id) => ({ id, web: `/img/${id}.webp`, thumb: `/img/${id}-t.webp`, w: 3000, h: 2000 });
const data = (templateId, theme = {}) => ({
  studio: { id: 's1', name: 'Arjun Photography', slug: 'arjun', published: true },
  templateId,
  site: {
    tagline: 'Wedding stories from Kerala',
    theme: { accent: '#9a6b3c', ...theme },
    packages: [{ name: 'Signature', price: '₹1,60,000', features: ['2 days'] }],
    testimonials: [{ quote: 'Lovely', author: 'Meera' }],
    faq: [{ q: 'Do you travel?', a: 'Yes' }],
    contact: { city: 'Kochi, Kerala' },
  },
  hero: ['/img/h1.webp', '/img/h2.webp'],
  portfolio: [{ id: 'e1', title: 'Anjali & Rahul', venue: 'Kumarakom', photos: [photo('a'), photo('b'), photo('c')] }],
});
const renderSite = (d) => render(<MemoryRouter><StudioSite data={d} /></MemoryRouter>).container;

describe('templates', () => {
  it('has all six templates', () => {
    expect(Object.keys(TEMPLATE_LAYOUTS).sort()).toEqual(['boho', 'cinematic', 'editorial', 'grid', 'indian', 'luxe']);
  });

  it.each([
    ['editorial', '.hero', '.p-grid'],
    ['luxe', '.hero', '.p-grid'],
    ['cinematic', '.hero', '.p-grid'],
    ['boho', '.h-split', '.film-strip'],
    ['indian', '.h-arch', '.p-grid'],
    ['grid', '.h-mosaic', '.uniform'],
  ])('%s renders its own hero and portfolio', (id, heroSel, portfolioSel) => {
    const c = renderSite(data(id));
    expect(c.querySelector(`.site.tpl-${id}`)).not.toBeNull();
    expect(c.querySelector(heroSel)).not.toBeNull();
    expect(c.querySelector(portfolioSel)).not.toBeNull();
    expect(c.textContent).toContain('Arjun Photography');
    expect(c.textContent).toContain('Book an enquiry');
  });

  it('Indian Traditional adds ornaments; Modern Grid numbers its sections; Boho tilts its prints', () => {
    expect(renderSite(data('indian')).querySelectorAll('svg.ornament').length).toBeGreaterThan(2);
    expect(renderSite(data('grid')).textContent).toMatch(/01 — About.*02 — Portfolio.*06 — Contact/);
    const prints = renderSite(data('boho')).querySelectorAll('.polaroid');
    expect(prints.length).toBe(3);
    expect(prints[0].style.getPropertyValue('--tilt')).toMatch(/deg$/);
  });

  it("uses the template's fonts unless the studio picked a font pair", () => {
    expect(renderSite(data('indian', { fontPair: 'template' })).querySelector('.site').className).toBe('site tpl-indian');
    expect(renderSite(data('indian', { fontPair: 'classic' })).querySelector('.site').className).toBe('site tpl-indian font-classic');
  });

  it('falls back to Editorial for an unknown template', () => {
    expect(layoutFor('nope')).toEqual(TEMPLATE_LAYOUTS.editorial);
    expect(renderSite(data('nope')).querySelector('.site.tpl-editorial')).not.toBeNull();
  });
});

describe('website interactions', () => {
  it('opens portfolio photos in a viewer with arrows and Escape', async () => {
    const { fireEvent, screen } = await import('@testing-library/react');
    renderSite(data('editorial'));
    fireEvent.click(screen.getByRole('button', { name: 'Open photo 2 from Anjali & Rahul' }));
    expect(screen.getByRole('dialog', { name: 'Anjali & Rahul' })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Anjali & Rahul' })).not.toBeInTheDocument();
  });

  it('has a phone menu with the sections and client login', async () => {
    const { fireEvent, screen, within } = await import('@testing-library/react');
    renderSite(data('boho'));
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    expect(within(menu).getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '#portfolio');
    expect(within(menu).getByRole('link', { name: 'Client login' })).toHaveAttribute('href', '/login?studio=arjun');
    fireEvent.click(within(menu).getByRole('link', { name: 'FAQ' }));
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();
  });
});
