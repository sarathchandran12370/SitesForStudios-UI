import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Invoices from '../pages/studio/Invoices.jsx';
import { mockApi } from './setup.js';

const studio = { id: 's1', name: 'Arjun Photography', plan: { client_galleries: true } };
const settings = (over = {}) => ({
  legal_name: 'Arjun Photography', gstin: '32AAACR5055K1ZG', state_code: '32', prefix: 'INV', default_sac: '998383', default_gst_rate: 18, due_days: 7,
  bank_details: '', upi_id: 'arjun@okhdfcbank', terms: '', email: '', phone: '', address: '', saved: true, canEdit: true,
  states: { '32': 'Kerala', '29': 'Karnataka' }, gstRates: [0, 5, 12, 18, 28], ...over,
});
const inv = (over = {}) => ({
  id: 'i1', number: 'INV/26-27/0001', status: 'sent', customer: { name: 'Anu & Vivek', email: 'anu@example.com', phone: '9800000001' },
  issue_date: '2026-11-20', due_date: '2026-11-27', lines: [{ description: 'Wedding photography', sac: '998383', qty: 1, rate_paise: 8500000, amount_paise: 8500000 }],
  discount_paise: 0, gst_rate: 18, taxable_paise: 8500000, cgst_paise: 765000, sgst_paise: 765000, igst_paise: 0, total_paise: 10030000, paid_paise: 0, balance_paise: 10030000,
  overdue: false, view_url: 'http://app.test/api/invoice-view/tok', payments: [], event_title: null, client_account_id: null, ...over,
});
const show = (itemId) => render(<MemoryRouter><Invoices studio={studio} itemId={itemId} /></MemoryRouter>);

describe('Studio invoices', () => {
  it('lists invoices with totals and filters', async () => {
    mockApi({
      'GET /api/invoices/studio/s1': [200, {
        invoices: [inv(), inv({ id: 'i2', number: 'INV/26-27/0002', status: 'paid', paid_paise: 10030000, balance_paise: 0 }), inv({ id: 'i3', number: null, status: 'draft', view_url: null })],
        summary: { outstanding_paise: 10030000, overdue_paise: 0, overdue_count: 0, paid_this_month_paise: 10030000, draft_count: 1 },
      }],
      'GET /api/invoices/studio/s1/settings': [200, settings()],
    });
    show();
    expect(await screen.findByText('INV/26-27/0001')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,00,300').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Paid (1)' }));
    expect(screen.queryByText('INV/26-27/0001')).not.toBeInTheDocument();
    expect(screen.getByText('INV/26-27/0002')).toBeInTheDocument();
  });

  it('new invoice: works out GST as you type and sends it', async () => {
    const calls = mockApi({
      'GET /api/invoices/studio/s1/settings': [200, settings()],
      'GET /api/studios/s1/accounts?role=client': [200, [{ id: 'c1', name: 'Anu & Vivek', email: 'anu@example.com', phone: '9800000001', events: [] }]],
      'GET /api/events/studio/s1': [200, []],
      'POST /api/invoices/studio/s1': [201, inv({ status: 'draft', number: null })],
      'POST /api/invoices/i1/send': [200, inv()],
      'GET /api/invoices/i1': [200, inv()],
    });
    show('new');
    await userEvent.selectOptions(await screen.findByLabelText('Client'), 'c1');
    expect(screen.getByLabelText('Name')).toHaveValue('Anu & Vivek');
    await userEvent.type(screen.getByLabelText('Item 1 description'), 'Wedding photography');
    await userEvent.type(screen.getByLabelText('Item 1 rate'), '85000');
    expect(screen.getByText('CGST 9%')).toBeInTheDocument();
    expect(screen.getByText('₹1,00,300')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save and email to client' }));
    const create = calls.find((c) => c.key === 'POST /api/invoices/studio/s1');
    expect(create.body).toMatchObject({ clientAccountId: 'c1', gstRate: 18, lines: [{ description: 'Wedding photography', qty: 1, rate: 85000 }] });
    expect(calls.find((c) => c.key === 'POST /api/invoices/i1/send').body).toEqual({ email: true });
  });

  it('without a GSTIN the GST choice is off and points to settings', async () => {
    mockApi({
      'GET /api/invoices/studio/s1/settings': [200, settings({ gstin: null, state_code: null })],
      'GET /api/studios/s1/accounts?role=client': [200, []],
      'GET /api/events/studio/s1': [200, []],
    });
    show('new');
    expect(await screen.findByLabelText('Charge GST')).toBeDisabled();
    expect(screen.getByLabelText('Charge GST')).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'invoice settings' })).toHaveAttribute('href', '/studio/s1/invoices/settings');
    expect(screen.queryByText(/CGST/)).not.toBeInTheDocument();
  });

  it('GST can be switched off on a single invoice', async () => {
    const calls = mockApi({
      'GET /api/invoices/studio/s1/settings': [200, settings()],
      'GET /api/studios/s1/accounts?role=client': [200, []],
      'GET /api/events/studio/s1': [200, []],
      'POST /api/invoices/studio/s1': [201, inv({ status: 'draft', number: null, gst_rate: 0 })],
      'GET /api/invoices/i1': [200, inv({ status: 'draft', number: null, gst_rate: 0 })],
    });
    show('new');
    const toggle = await screen.findByLabelText('Charge GST');
    expect(toggle).toBeChecked();
    await userEvent.type(screen.getByLabelText('Name'), 'Meera');
    await userEvent.type(screen.getByLabelText('Item 1 description'), 'Pre-wedding shoot');
    await userEvent.type(screen.getByLabelText('Item 1 rate'), '20000');
    expect(screen.getByText('CGST 9%')).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByText(/CGST/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('GST rate')).not.toBeInTheDocument();
    expect(screen.getAllByText('₹20,000').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(calls.find((c) => c.key === 'POST /api/invoices/studio/s1').body.gstRate).toBe(0);
  });

  it('records a payment against a sent invoice', async () => {
    const calls = mockApi({
      'GET /api/invoices/i1': [200, inv()],
      'POST /api/invoices/i1/payments': [201, inv({ status: 'partially_paid', paid_paise: 5000000, balance_paise: 5030000, payments: [{ id: 'p1', amount_paise: 5000000, method: 'upi', reference: 'UTR1', paid_on: '2026-11-22' }] })],
    });
    show('i1');
    await userEvent.click((await screen.findAllByRole('button', { name: 'Record payment' }))[0]);
    const dialog = screen.getByRole('dialog');
    const amount = within(dialog).getByLabelText('Amount (₹)');
    await userEvent.clear(amount);
    await userEvent.type(amount, '50000');
    await userEvent.type(within(dialog).getByLabelText('Reference (optional)'), 'UTR1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record payment' }));
    expect(calls.find((c) => c.key === 'POST /api/invoices/i1/payments').body).toMatchObject({ amount: 50000, method: 'upi', reference: 'UTR1', notifyClient: true });
    expect(await screen.findByText(/A receipt was emailed/)).toBeInTheDocument();
    expect(screen.getByText('₹50,300')).toBeInTheDocument();
  });

  it('shares a sent invoice on WhatsApp with the private link', async () => {
    mockApi({ 'GET /api/invoices/i1': [200, inv()] });
    show('i1');
    const wa = await screen.findByRole('link', { name: 'Share on WhatsApp' });
    expect(wa.getAttribute('href')).toContain('https://wa.me/919800000001?text=');
    expect(decodeURIComponent(wa.getAttribute('href'))).toContain('http://app.test/api/invoice-view/tok');
  });
});
