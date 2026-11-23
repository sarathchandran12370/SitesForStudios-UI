// Hosts that serve the platform app itself. Any other host is a studio's custom domain.
// Extra hosts come from VITE_APP_HOSTS at build time (comma-separated), set by the deploy workflow.
export const APP_HOSTS = [
  'localhost',
  '127.0.0.1',
  'app.sitesforstudios.com',
  'sitesforstudios.com',
  'www.sitesforstudios.com',
  'app.thaaram.in', // test environment
  ...String(import.meta.env.VITE_APP_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
];
export const isAppHost = (host) => APP_HOSTS.includes(host) || host.endsWith('.cloudfront.net');
