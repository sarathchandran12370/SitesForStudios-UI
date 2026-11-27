import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAsync } from '../../components/ui.jsx';

const SECTION_LABELS = { about: 'About', portfolio: 'Portfolio', packages: 'Packages & pricing', testimonials: 'Testimonials', faq: 'FAQ', contact: 'Contact & enquiry' };
const FONT_PAIRS = { template: "Template's own fonts", editorial: 'Cormorant + Inter', classic: 'Playfair + Inter', modern: 'DM Serif + Inter' };
const SWATCHES = ['#9a6b3c', '#b08d57', '#7a1f2b', '#2f4f4f', '#3f5d7d', '#1c1917', '#a0522d', '#6d4c7d'];
// Card previews + the accent colour each template is designed around.
const PREVIEW = {
  editorial: { background: '#fbfaf7', color: '#1c1917', font: 'Cormorant Garamond', accent: '#9a6b3c' },
  luxe: { background: 'linear-gradient(135deg,#f6efe3,#ead9bf)', color: '#5a4320', font: 'Playfair Display', accent: '#b08d57' },
  cinematic: { background: '#111', color: '#f2ede6', font: 'DM Serif Display', accent: '#b08d57' },
  boho: { background: 'radial-gradient(circle at 70% 40%,#e7cdb2,#f4ede3 60%)', color: '#3b2f25', font: 'Caveat', size: 30, accent: '#b5653d' },
  indian: { background: 'linear-gradient(#4a0e17 0 28%,#fbf4e6 28%)', color: '#3a0d12', font: 'Cinzel', accent: '#b8862b', pad: '34px 0 0' },
  grid: { background: '#fff', color: '#0c0a09', font: 'Space Grotesk', weight: 700, accent: '#0c0a09', border: true },
};
const TEMPLATE_ACCENTS = Object.values(PREVIEW).map((p) => p.accent.toLowerCase());

// Minimal customization by design: brand, colour, fonts, sections, content, contact, SEO.
export default function WebsiteEditor({ studio, onSaved }) {
  const [templates, setTemplates] = useState([]);
  const [site, setSite] = useState(null);
  const [heroChoices, setHeroChoices] = useState([]);
  const [saved, setSaved] = useState('');
  const { busy, error, run } = useAsync();

  useEffect(() => {
    api('/studios/templates').then(setTemplates);
    api(`/studios/${studio.id}/site`).then((r) => {
      setSite({ ...r.site, heroImages: r.site.heroImages || [], aboutImage: r.site.aboutImage || null, templateId: studio.template_id, contact: r.site.contact || {}, seo: r.site.seo || {}, packages: r.site.packages || [], testimonials: r.site.testimonials || [], faq: r.site.faq || [] });
      setHeroChoices(r.heroChoices);
    });
  }, [studio.id]);
  if (!site) return <p className="muted loading">Loading…</p>;

  const set = (patch) => setSite({ ...site, ...patch });
  const save = (publish) =>
    run(async () => {
      const { templateId, theme, tagline, about, heroImages, aboutImage, sections, packages, testimonials, faq, contact, seo, logoKey } = site;
      const clean = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null));
      await api(`/studios/${studio.id}/site`, {
        method: 'PUT',
        body: {
          templateId, theme: { accent: theme.accent, fontPair: theme.fontPair }, tagline, about,
          heroImages: heroImages.map(slotImage),
          aboutImage: aboutImage ? slotImage(aboutImage) : null,
          sections: sections.map(({ id, enabled }) => ({ id, enabled })),
          packages: packages.map(({ name, price, features }) => ({ name, price, features })),
          testimonials: testimonials.map(({ quote, author }) => ({ quote, author })),
          faq: faq.map(({ q, a }) => ({ q, a })),
          contact: clean(contact), seo: clean(seo), logoKey: logoKey || null, publish,
        },
      });
      setSaved(publish ? 'Published' : 'Saved');
      setTimeout(() => setSaved(''), 2500);
      onSaved?.();
    });

  const uploadLogo = (file) =>
    run(async () => {
      const { key, upload } = await api(`/studios/${studio.id}/logo-upload`, { method: 'POST', body: { contentType: file.type } });
      const res = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: file });
      if (!res.ok) throw new Error('Logo upload failed');
      set({ logoKey: key, logoUrl: URL.createObjectURL(file) });
    });

  // Upload a photo for a template image slot; returns { key, url } (url is a local preview).
  const MAX_IMAGE_MB = 20;
  const uploadSiteImage = async (file) => {
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`${file.name} is larger than ${MAX_IMAGE_MB} MB`);
    const { key, upload } = await api(`/studios/${studio.id}/site-image-upload`, { method: 'POST', body: { contentType: file.type } });
    const res = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: file });
    if (!res.ok) throw new Error('Photo upload failed');
    return { key, url: URL.createObjectURL(file) };
  };
  const addHeroUploads = (files) =>
    run(async () => {
      const room = 6 - site.heroImages.length;
      if (room <= 0) throw new Error('You can use up to 6 hero images. Remove one first.');
      const added = [];
      for (const f of [...files].slice(0, room)) added.push(await uploadSiteImage(f));
      setSite((s) => ({ ...s, heroImages: [...s.heroImages, ...added].slice(0, 6) }));
    });
  const setAboutUpload = (file) => run(async () => { const img = await uploadSiteImage(file); setSite((s) => ({ ...s, aboutImage: img })); });
  const isHero = (photoId) => site.heroImages.some((i) => i.photoId === photoId);
  const toggleHeroHighlight = (p) =>
    set({ heroImages: isHero(p.id) ? site.heroImages.filter((i) => i.photoId !== p.id) : [...site.heroImages, { photoId: p.id, url: p.thumb }].slice(0, 6) });
  const moveHero = (i, dir) => {
    const h = [...site.heroImages];
    const j = i + dir;
    if (j < 0 || j >= h.length) return;
    [h[i], h[j]] = [h[j], h[i]];
    set({ heroImages: h });
  };

  // Picking a template switches to its own fonts, and to its colour unless the studio set its own brand colour.
  const pickTemplate = (id) => {
    const keepAccent = !TEMPLATE_ACCENTS.includes(String(site.theme.accent).toLowerCase());
    set({ templateId: id, theme: { fontPair: 'template', accent: keepAccent ? site.theme.accent : (PREVIEW[id] || PREVIEW.editorial).accent } });
  };

  const moveSection = (i, dir) => {
    const s = [...site.sections];
    const j = i + dir;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    set({ sections: s });
  };

  return (
    <div className="stack">
      <div className="row between card" style={{ position: 'sticky', top: 0, zIndex: 5, padding: '12px 16px' }}>
        <span className="muted small">{saved || 'Changes appear on your website after you save.'}</span>
        <div className="row">
          <a className="btn" href={`/s/${studio.slug}`} target="_blank" rel="noreferrer">Preview</a>
          <button className="btn" disabled={busy} onClick={() => save(false)}>Save</button>
          <button className="btn accent" disabled={busy} onClick={() => save(true)}>{studio.published_at ? 'Save & publish' : 'Publish website'}</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}

      <section className="card stack">
        <h3>Template</h3>
        <div className="grid2">
          {templates.map((t) => {
            const locked = t.tier === 'premium' && !studio.plan.premium_templates;
            const p = PREVIEW[t.id] || PREVIEW.editorial;
            return (
              <button key={t.id} type="button" className={`template-card ${site.templateId === t.id ? 'active' : ''}`} disabled={locked} onClick={() => pickTemplate(t.id)} style={locked ? { opacity: 0.55 } : undefined}>
                <div className="preview" style={{ background: p.background, color: p.color, fontFamily: p.font, fontSize: p.size, fontWeight: p.weight, padding: p.pad, borderBottom: p.border ? '1px solid #e7e5e4' : undefined }}>{studio.name}</div>
                <div className="body">
                  <b>{t.name}</b> {t.tier === 'premium' && <span className="badge accent">Premium</span>}
                  <div className="small muted">{locked ? 'Available on Pro and above' : t.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <h3>Brand</h3>
        <div className="grid2">
          <div className="stack" style={{ gap: 6 }}>
            <span className="small muted">Logo</span>
            <div className="row">
              {site.logoUrl ? <img src={site.logoUrl} alt="Logo" style={{ height: 48, maxWidth: 160, objectFit: 'contain' }} /> : <span className="muted small">No logo — your studio name is shown.</span>}
              <label className="btn sm">Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => e.target.files[0] && uploadLogo(e.target.files[0])} /></label>
              {site.logoKey && <button className="btn sm ghost" onClick={() => set({ logoKey: null, logoUrl: null })}>Remove</button>}
            </div>
          </div>
          <label className="field">Tagline<input value={site.tagline || ''} maxLength={140} onChange={(e) => set({ tagline: e.target.value })} /></label>
        </div>
        <div className="grid2">
          <div className="stack" style={{ gap: 6 }}>
            <span className="small muted">Accent colour</span>
            <div className="row" style={{ gap: 6 }}>
              {SWATCHES.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => set({ theme: { ...site.theme, accent: c } })} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: site.theme.accent === c ? '3px solid #fff' : '1px solid #ddd', outline: site.theme.accent === c ? `2px solid ${c}` : 'none', cursor: 'pointer' }} />
              ))}
              <input type="color" value={site.theme.accent} onChange={(e) => set({ theme: { ...site.theme, accent: e.target.value } })} style={{ width: 44 }} />
            </div>
          </div>
          <label className="field">Fonts
            <select value={site.theme.fontPair} onChange={(e) => set({ theme: { ...site.theme, fontPair: e.target.value } })}>
              {Object.entries(FONT_PAIRS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="card stack">
        <h3>Hero images</h3>
        <p className="muted small" style={{ margin: 0 }}>
          The big photos at the top of your website (a slideshow, or the arch and mosaic in some templates). Use up to 6: upload your own or pick from your highlights. With none chosen, photos from your portfolio are used.
        </p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {site.heroImages.map((img, i) => (
            <div key={img.key || img.photoId} className="stack" style={{ gap: 4, width: 120 }}>
              <div style={{ width: 120, height: 80, borderRadius: 6, background: img.url ? `#eee center/cover url(${img.url})` : '#eee', display: 'grid', placeItems: 'center' }}>
                {!img.url && <span className="small muted">Unavailable</span>}
              </div>
              <div className="row between" style={{ gap: 2 }}>
                <button className="btn sm ghost" onClick={() => moveHero(i, -1)} aria-label="Move left" disabled={i === 0}>←</button>
                <button className="btn sm ghost danger" onClick={() => set({ heroImages: site.heroImages.filter((_, j) => j !== i) })}>Remove</button>
                <button className="btn sm ghost" onClick={() => moveHero(i, 1)} aria-label="Move right" disabled={i === site.heroImages.length - 1}>→</button>
              </div>
            </div>
          ))}
          {site.heroImages.length < 6 && (
            <label className="btn" style={{ width: 120, height: 80, display: 'grid', placeItems: 'center' }}>
              {busy ? 'Uploading…' : '+ Upload'}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { e.target.files.length && addHeroUploads(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
        <span className="small muted">Or pick from your highlights (mark photos as highlights inside an event to see them here):</span>
        <div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))' }}>
          {heroChoices.map((p) => {
            const on = isHero(p.id);
            return (
              <div key={p.id} className={`photo ${on ? 'sel' : ''}`} onClick={() => toggleHeroHighlight(p)}>
                <img src={p.thumb} alt="" loading="lazy" />
                <span className="check">{on ? '✓' : ''}</span>
              </div>
            );
          })}
          {!heroChoices.length && <span className="muted small">No highlights yet.</span>}
        </div>
      </section>

      <section className="card stack">
        <h3>About photo</h3>
        <p className="muted small" style={{ margin: 0 }}>Shown beside your About text. With none chosen, a photo from your portfolio is used.</p>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ width: 120, height: 150, borderRadius: 6, background: site.aboutImage?.url ? `#eee center/cover url(${site.aboutImage.url})` : '#eee', display: 'grid', placeItems: 'center' }}>
            {!site.aboutImage && <span className="small muted">Automatic</span>}
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <label className="btn sm">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { e.target.files[0] && setAboutUpload(e.target.files[0]); e.target.value = ''; }} /></label>
            {site.aboutImage && <button className="btn sm ghost" onClick={() => set({ aboutImage: null })}>Use automatic photo</button>}
          </div>
        </div>
        {!!heroChoices.length && (
          <>
            <span className="small muted">Or pick one of your highlights:</span>
            <div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))' }}>
              {heroChoices.map((p) => {
                const on = site.aboutImage?.photoId === p.id;
                return (
                  <div key={p.id} className={`photo ${on ? 'sel' : ''}`} onClick={() => set({ aboutImage: on ? null : { photoId: p.id, url: p.thumb } })}>
                    <img src={p.thumb} alt="" loading="lazy" />
                    <span className="check">{on ? '✓' : ''}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="card stack">
        <h3>Sections</h3>
        {site.sections.map((s, i) => (
          <div key={s.id} className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
            <label className="row"><input type="checkbox" checked={s.enabled} onChange={(e) => set({ sections: site.sections.map((x) => (x.id === s.id ? { ...x, enabled: e.target.checked } : x)) })} /> {SECTION_LABELS[s.id]}</label>
            <div className="row" style={{ gap: 4 }}>
              <button className="btn sm ghost" onClick={() => moveSection(i, -1)} aria-label="Move up">↑</button>
              <button className="btn sm ghost" onClick={() => moveSection(i, 1)} aria-label="Move down">↓</button>
            </div>
          </div>
        ))}
        <label className="field">About text<textarea value={site.about || ''} maxLength={3000} onChange={(e) => set({ about: e.target.value })} /></label>
      </section>

      <ListEditor
        title="Packages"
        items={site.packages}
        max={6}
        blank={{ name: '', price: '', features: [] }}
        onChange={(packages) => set({ packages })}
        render={(p, update) => (
          <>
            <div className="grid2">
              <input placeholder="Package name" value={p.name} onChange={(e) => update({ name: e.target.value })} />
              <input placeholder="Price, e.g. ₹1,20,000" value={p.price} onChange={(e) => update({ price: e.target.value })} />
            </div>
            <textarea placeholder="One feature per line" value={p.features.join('\n')} onChange={(e) => update({ features: e.target.value.split('\n').slice(0, 10) })} style={{ minHeight: 70 }} />
          </>
        )}
      />
      <ListEditor
        title="Testimonials"
        items={site.testimonials}
        max={8}
        blank={{ quote: '', author: '' }}
        onChange={(testimonials) => set({ testimonials })}
        render={(t, update) => (
          <>
            <textarea placeholder="What the couple said" value={t.quote} onChange={(e) => update({ quote: e.target.value })} style={{ minHeight: 60 }} />
            <input placeholder="Couple's names" value={t.author} onChange={(e) => update({ author: e.target.value })} />
          </>
        )}
      />
      <ListEditor
        title="FAQ"
        items={site.faq}
        max={12}
        blank={{ q: '', a: '' }}
        onChange={(faq) => set({ faq })}
        render={(f, update) => (
          <>
            <input placeholder="Question" value={f.q} onChange={(e) => update({ q: e.target.value })} />
            <textarea placeholder="Answer" value={f.a} onChange={(e) => update({ a: e.target.value })} style={{ minHeight: 60 }} />
          </>
        )}
      />

      <section className="card stack">
        <h3>Contact & SEO</h3>
        <div className="grid2">
          {[['email', 'Email'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp number (with country code)'], ['city', 'City'], ['instagram', 'Instagram URL'], ['youtube', 'YouTube URL']].map(([k, label]) => (
            <label key={k} className="field">{label}<input value={site.contact[k] || ''} onChange={(e) => set({ contact: { ...site.contact, [k]: e.target.value } })} /></label>
          ))}
        </div>
        <label className="field">Page title (Google)<input maxLength={70} value={site.seo.title || ''} onChange={(e) => set({ seo: { ...site.seo, title: e.target.value } })} /></label>
        <label className="field">Description (Google)<textarea maxLength={160} style={{ minHeight: 60 }} value={site.seo.description || ''} onChange={(e) => set({ seo: { ...site.seo, description: e.target.value } })} /></label>
      </section>
    </div>
  );
}

// What the API stores for an image slot (drops the preview url).
const slotImage = ({ photoId, key }) => (photoId ? { photoId } : { key });

function ListEditor({ title, items, max, blank, onChange, render }) {
  return (
    <section className="card stack">
      <div className="row between">
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button className="btn sm" disabled={items.length >= max} onClick={() => onChange([...items, { ...blank }])}>Add</button>
      </div>
      {items.map((it, i) => (
        <div key={i} className="stack" style={{ gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
          {render(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
          <div><button className="btn sm ghost danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button></div>
        </div>
      ))}
      {!items.length && <span className="muted small">None yet.</span>}
    </section>
  );
}
