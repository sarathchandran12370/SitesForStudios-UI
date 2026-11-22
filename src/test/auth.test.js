import { describe, it, expect } from 'vitest';
import { homeFor, isOrgBlocked } from '../auth.jsx';

describe('homeFor', () => {
  it('sends each role to its dashboard', () => {
    expect(homeFor(null)).toBe('/login');
    expect(homeFor({ role: 'super_admin' })).toBe('/admin');
    expect(homeFor({ role: 'org_admin' })).toBe('/org');
    expect(homeFor({ role: 'studio_admin', studio_id: 's1' })).toBe('/studio/s1');
    expect(homeFor({ role: 'staff', studio_id: 's1' })).toBe('/studio/s1');
    expect(homeFor({ role: 'client' })).toBe('/portal');
  });
  it('sends users with a temporary password to change it first', () => {
    expect(homeFor({ role: 'client', must_change_password: true })).toBe('/change-password');
  });
});

describe('isOrgBlocked', () => {
  it('blocks suspended and cancelled organizations but never the Super Admin', () => {
    expect(isOrgBlocked({ role: 'client', org_status: 'suspended' })).toBe(true);
    expect(isOrgBlocked({ role: 'org_admin', org_status: 'cancelled' })).toBe(true);
    expect(isOrgBlocked({ role: 'org_admin', org_status: 'past_due' })).toBe(false);
    expect(isOrgBlocked({ role: 'super_admin', org_status: 'suspended' })).toBe(false);
    expect(isOrgBlocked(null)).toBe(false);
  });
});
