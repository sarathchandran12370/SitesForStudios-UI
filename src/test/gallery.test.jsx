import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { galleryClass, PhotoGrid, ContactCard, GalleryHero } from '../components/gallery.jsx';
import { StudioSite } from '../site/SiteRenderer.jsx';

const photos = [
  { id: 'p1', filename: 'IMG_1.jpg', thumb: '/t1.webp', web: '/w1.webp', width: 1500, height: 1000 },
  { id: 'p2', filename: 'IMG_2.jpg', thumb: '/t2.webp', web: '/w2.webp', width: 1000, height: 1500 },
];

describe('gallery components', () => {
  it('applies the design with defaults', () => {
    expect(galleryClass({ theme: 'dark' })).toBe('gallery theme-dark gfont-classic layout-masonry');
  });

  it('shows hearts for picks and ticks for downloads only when given handlers', () => {
    const onPick = vi.fn();
    const { container, rerender } = render(<PhotoGrid photos={photos} onOpen={() => {}} picked={new Set(['p1'])} onPick={onPick} selected={new Set()} onSelect={null} />);
    expect(container.querySelectorAll('.heart')).toHaveLength(2);
    expect(container.querySelectorAll('.check')).toHaveLength(0);
    expect(container.querySelector('.m.picked')).not.toBeNull();
    fireEvent.click(container.querySelectorAll('.heart')[1]);
    expect(onPick).toHaveBeenCalledWith('p2');
    rerender(<PhotoGrid photos={photos} layout="grid" onOpen={() => {}} />);
    expect(container.querySelectorAll('.heart')).toHaveLength(0);
    expect(container.querySelector('.g-grid.grid')).not.toBeNull();
  });

  it('renders the studio contact card with only the links it has', () => {
    const { getByText, queryByText } = render(<ContactCard studio={{ name: 'Arjun Photography', whatsapp: '919800000000', email: 'hi@arjun.in', website: 'https://arjun.in', accent: '#9a6b3c' }} />);
    expect(getByText('Arjun Photography')).toBeTruthy();
    expect(getByText('WhatsApp').getAttribute('href')).toBe('https://wa.me/919800000000');
    expect(queryByText('Instagram')).toBeNull();
  });

  it('uses a title-only cover when there is no cover photo', () => {
    const { container } = render(<GalleryHero design={{ cover: 'full' }} title="Anu & Vivek" cover={null} />);
    expect(container.querySelector('.g-hero.minimal')).not.toBeNull();
  });
});

describe('website reviews', () => {
  it('shows published client reviews with the typed testimonials', () => {
    const data = {
      studio: { id: 's1', name: 'Arjun', slug: 'arjun', published: true },
      templateId: 'editorial',
      site: { theme: {}, testimonials: [{ quote: 'Lovely', author: 'Meera' }], contact: {} },
      hero: [],
      portfolio: [],
      reviews: [{ quote: 'Every moment captured', author: 'Anu', rating: 5 }],
    };
    const { getByText } = render(<MemoryRouter><StudioSite data={data} /></MemoryRouter>);
    expect(getByText('“Lovely”')).toBeTruthy();
    expect(getByText('“Every moment captured”')).toBeTruthy();
    expect(getByText('★★★★★')).toBeTruthy();
  });
});
