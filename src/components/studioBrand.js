import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { isAppHost } from '../hosts.js';

/**
 * Which studio, if any, the visitor came from: the studio's custom domain, or ?studio=<slug>
 * (added by the "Client login" link on studio websites). Returns null on the platform's own login.
 */
export function studioContext(search = window.location.search, host = window.location.hostname) {
  const slug = new URLSearchParams(search).get('studio');
  if (slug && /^[a-z0-9-]{1,80}$/i.test(slug)) return { slug };
  if (!isAppHost(host)) return { host };
  return null;
}

/**
 * Loads a studio's public branding for white-label pages (login, change password).
 * Returns undefined while loading, null when there is no studio context or it was not found,
 * otherwise { name, slug, logoUrl, accent, image }.
 */
export function useStudioBrand(ctx) {
  const key = ctx ? ctx.slug || ctx.host : '';
  const [brand, setBrand] = useState(ctx ? undefined : null);
  useEffect(() => {
    if (!ctx) return setBrand(null);
    let live = true;
    setBrand(undefined);
    api(ctx.slug ? `/sites/${encodeURIComponent(ctx.slug)}` : `/sites-by-host/${encodeURIComponent(ctx.host)}`)
      .then((d) => {
        if (!live) return;
        const firstPhoto = d.portfolio?.flatMap((p) => p.photos || [])[0]?.web;
        setBrand({
          name: d.studio.name,
          slug: d.studio.slug,
          logoUrl: d.site?.logoUrl || null,
          accent: d.site?.theme?.accent || null,
          image: d.hero?.[0] || firstPhoto || null,
        });
      })
      .catch(() => live && setBrand(null));
    return () => {
      live = false;
    };
  }, [key]);
  return brand;
}
