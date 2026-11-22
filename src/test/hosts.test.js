import { describe, it, expect } from 'vitest';
import { isAppHost } from '../hosts.js';

describe('isAppHost', () => {
  it('treats the platform hosts as the app', () => {
    expect(isAppHost('localhost')).toBe(true);
    expect(isAppHost('app.sitesforstudios.com')).toBe(true);
    expect(isAppHost('d123abc.cloudfront.net')).toBe(true);
  });
  it("treats any other host as a studio's own website", () => {
    expect(isAppHost('www.arjunphotography.in')).toBe(false);
    expect(isAppHost('cloudfront.net.evil.com')).toBe(false);
  });
});
