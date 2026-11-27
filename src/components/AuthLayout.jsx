import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isAppHost } from '../hosts.js';

/**
 * Split layout for login and account pages: brand panel on the left (hidden on phones), form on the right.
 *
 * `brand` picks whose name is shown:
 * - left out: SitesForStudios (the platform's own login)
 * - a studio { name, slug, logoUrl, accent, image }: white-label, no platform name or links
 * - 'none': white-label with no name yet (the studio is still loading, or was not found)
 */
export default function AuthLayout({ quote, points = [], wide = false, brand, children }) {
  const studio = brand && brand !== 'none' ? brand : null;
  const whiteLabel = !!brand;

  useEffect(() => {
    if (!whiteLabel) return undefined;
    const before = document.title;
    document.title = studio ? `Client login · ${studio.name}` : 'Client login';
    return () => { document.title = before; };
  }, [whiteLabel, studio?.name]);

  // On a custom domain the studio website is "/"; on the platform it is /s/<slug>.
  const siteHref = studio ? (isAppHost(window.location.hostname) ? `/s/${studio.slug}` : '/') : null;
  const mark = studio
    ? <a href={siteHref} className="auth-studio">{studio.logoUrl ? <img src={studio.logoUrl} alt={studio.name} /> : studio.name}</a>
    : whiteLabel ? <span /> : <Link to="/" className="brand"><i />SitesForStudios</Link>;
  const mobileMark = studio
    ? <a href={siteHref} className="auth-studio auth-mobile-brand">{studio.logoUrl ? <img src={studio.logoUrl} alt={studio.name} /> : studio.name}</a>
    : whiteLabel ? null : <Link to="/" className="brand auth-mobile-brand"><i />SitesForStudios</Link>;

  const artStyle = studio?.image
    ? { backgroundImage: `linear-gradient(to top, rgba(12, 9, 7, 0.82), rgba(12, 9, 7, 0.15) 60%), url("${studio.image}")` }
    : undefined;

  return (
    <div className={`auth${whiteLabel ? ' white-label' : ''}`} style={studio?.accent ? { '--accent': studio.accent } : undefined}>
      <aside className="auth-art" style={artStyle}>
        {mark}
        {(quote || points.length > 0) && (
          <div>
            {quote && <p className="auth-quote">{quote}</p>}
            {points.length > 0 && <ul className="auth-points">{points.map((p) => <li key={p}>{p}</li>)}</ul>}
          </div>
        )}
      </aside>
      <main className="auth-main">
        <div className={`auth-card${wide ? ' wide' : ''}`}>
          {mobileMark}
          {children}
        </div>
      </main>
    </div>
  );
}
