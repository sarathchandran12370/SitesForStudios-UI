import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Bookings from '../pages/studio/Bookings.jsx';
import { mockApi } from './setup.js';

const studio = { id: 's1', name: 'Arjun Photography', plan: { client_galleries: true } };
const booking = (over = {}) => ({
  id: 'b1', title: 'Anu & Vivek wedding', status: 'confirmed', event_type: 'wedding', client_name: 'Anu & Vivek', client_phone: '9800000001', client_email: 'anu@example.com',
  client_account_id: null, enquiry_id: null, event_id: null, event_title: null, package_paise: 18500000, team: [], team_members: [{ id: 't1', name: 'Rahul' }], notes: '',
  start_date: '2027-01-14', end_date: '2027-01-15',
  sessions: [
    { id: 's-1', label: 'Haldi', date: '2027-01-14', start_time: '09:00', end_time: null, venue: 'Home' },
    { id: 's-2', label: 'Wedding', date: '2027-01-15', start_time: '10:30', end_time: null, venue: 'Bolgatty Palace' },
  ],
  invoices: [], billed_paise: 0, paid_paise: 0, conflicts: [], ...over,
});
const show = (path, itemId) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="*" element={<Bookings studio={studio} itemId={itemId} />} /></Routes>
    </MemoryRouter>
  );

describe('Studio bookings', () => {
  it('shows each session on its day in the month view', async () => {
    mockApi({
      'GET /api/bookings/studio/s1?from=2026-12-27&to=2027-02-06': [200, { bookings: [booking(), booking({ id: 'b2', title: 'Riya engagement', status: 'tentative', sessions: [{ id: 's-3', label: 'Engagement', date: '2027-01-20', start_time: null, venue: '' }] })] }],
    });
    // "Coming up" asks for the next six months from today; any answer is fine here.
    globalThis.fetch.mockImplementation(async (url) => {
      const body = url.includes('2026-12-27') ? { bookings: [booking(), booking({ id: 'b2', title: 'Riya engagement', status: 'tentative', sessions: [{ id: 's-3', label: 'Engagement', date: '2027-01-20', start_time: null, venue: '' }] })] } : { bookings: [] };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    show('/studio/s1/bookings?month=2027-1');
    expect(await screen.findByRole('heading', { level: 2, name: 'January 2027' })).toBeInTheDocument();
    const haldi = await screen.findAllByRole('link', { name: '09:00 Anu & Vivek wedding · Haldi' });
    expect(haldi[0]).toHaveAttribute('href', '/studio/s1/bookings/b1');
    expect(screen.getAllByRole('link', { name: 'Riya engagement' })[0]).toHaveClass('tentative');
  });

  it('books an enquiry: fills in the client, date and venue', async () => {
    const calls = mockApi({
      'GET /api/studios/s1/accounts?role=client': [200, []],
      'GET /api/studios/s1/accounts?role=staff': [200, [{ id: 't1', name: 'Rahul' }]],
      'GET /api/events/studio/s1': [200, []],
      'POST /api/bookings/studio/s1': [201, booking({ id: 'b9' })],
      'GET /api/bookings/b9': [200, booking({ id: 'b9' })],
    });
    const enquiry = { id: 'e1', name: 'Nila', phone: '9811111111', email: 'nila@example.com', event_date: '2027-03-05', city: 'Thrissur', event_type: 'Wedding', message: 'Two-day wedding' };
    render(
      <MemoryRouter initialEntries={[{ pathname: '/studio/s1/bookings/new', state: { enquiry } }]}>
        <Routes><Route path="*" element={<Bookings studio={studio} itemId="new" />} /></Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText(/Booking the enquiry from/)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Nila');
    expect(screen.getByLabelText('Date')).toHaveValue('2027-03-05');
    expect(screen.getByLabelText('Venue')).toHaveValue('Thrissur');
    await userEvent.click(await screen.findByLabelText('Rahul'));
    await userEvent.type(screen.getByLabelText('Package amount (₹, optional)'), '150000');
    await userEvent.click(screen.getByLabelText(/Email the confirmed dates/));
    await userEvent.click(screen.getByRole('button', { name: 'Save booking' }));
    const body = calls.find((c) => c.key === 'POST /api/bookings/studio/s1').body;
    expect(body).toMatchObject({ enquiryId: 'e1', status: 'confirmed', packageAmount: 150000, team: ['t1'], notifyClient: true, client: { name: 'Nila', email: 'nila@example.com' } });
    expect(body.sessions[0]).toMatchObject({ label: 'Wedding', date: '2027-03-05', venue: 'Thrissur' });
  });

  it('booking page: warns about double bookings and shows what is left to invoice', async () => {
    mockApi({
      'GET /api/bookings/b1': [200, booking({ billed_paise: 5000000, paid_paise: 5000000, invoices: [{ id: 'i1', number: 'INV/26-27/0003', status: 'paid', total_paise: 5000000, paid_paise: 5000000, issue_date: '2026-11-20' }], conflicts: [{ date: '2027-01-15', booking_id: 'b2', title: 'Second wedding', status: 'confirmed' }] })],
    });
    show('/studio/s1/bookings/b1', 'b1');
    expect(await screen.findByText('Double booking')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Second wedding' })).toHaveAttribute('href', '/studio/s1/bookings/b2');
    const money = screen.getByRole('heading', { name: 'Money' }).parentElement;
    expect(within(money).getByText('₹1,35,000')).toBeInTheDocument();
    expect(within(money).getByRole('link', { name: 'INV/26-27/0003' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create invoice' })).toHaveAttribute('href', '/studio/s1/invoices/new');
  });
});
