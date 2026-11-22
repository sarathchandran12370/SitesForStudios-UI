import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAsync } from '../../components/ui.jsx';

const SECTION_LABELS = { about: 'About', portfolio: 'Portfolio', packages: 'Packages & pricing', testimonials: 'Testimonials', faq: 'FAQ', contact: 'Contact & enquiry' };
const FONT_PAIRS = { editorial: 'Cormorant + Inter', classic: 'Playfair + Inter', modern: 'DM Serif + Inter' };
const SWATCHES = ['#9a6b3c', '#b08d57', '#7a1f2b', '#2f4f4f', '#3f5d7d', '#1c1917', '#a0522d', '#6d4c7d'];
const PREVIEW = {
  editorial: { background: '#fbfaf7', color: '#1c1917', font: 'Cormorant Garamond' },
  luxe: { background: 'linear-gradient(135deg,#f6efe3,#ead9bf)', color: '#5a4320', font: 'Playfair Display' },
  cinematic: { background: '#111', color: '#f2ede6', font: 'DM Serif Display' },
};

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
      setSite({ ...r.site, templateId: studio.template_id, contact: r.site.contact || {}, seo: r.site.seo || {}, packages: r.site.packages || [], testimonials: r.site.testimonials || [], faq: r.site.faq || [] });
      setHeroChoices(r.heroChoices);
    });
  }, [studio.id]);
  if (!site) return <p className="muted">Loading…</p>;

  const set = (patch) => setSite({ ...site, ...patch });
  const save = (publish) =>
    run(async () => {
      const { templateId, theme, tagline, about, heroPhotoIds, sections, packages, testimonials, faq, contact, seo, logoKey } = site;
      const clean = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null));
      await api(`/studios/${studio.id}/site`, {
        method: 'PUT',
        body: {
          templateId, theme: { accent: theme.accent, fontPair: theme.fontPair }, tagline, about, heroPhotoIds,
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
              <button key={t.id} type="button" className={`template-card ${site.templateId === t.id ? 'active' : ''}`} disabled={locked} onClick={() => set({ templateId: t.id })} style={locked ? { opacity: 0.55 } : undefined}>
                <div className="preview" style={{ background: p.background, color: p.color, fontFamily: p.font }}>{studio.name}</div>
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
        <p className="muted small" style={{ margin: 0 }}>Pick up to 6 from your highlights. Mark photos as highlights inside an event to see them here.</p>
        <div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))' }}>
          {heroChoices.map((p) => {
            const on = site.heroPhotoIds?.includes(p.id);
            return (
              <div key={p.id} className={`photo ${on ? 'sel' : ''}`} onClick={() => set({ heroPhotoIds: on ? site.heroPhotoIds.filter((x) => x !== p.id) : [...(site.heroPhotoIds || []), p.id].slice(0, 6) })}>
                <img src={p.thumb} alt="" loading="lazy" />
                <span className="check">{on ? '✓' : ''}</span>
              </div>
            );
          })}
          {!heroChoices.length && <span className="muted small">No highlights yet.</span>}
        </div>
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
