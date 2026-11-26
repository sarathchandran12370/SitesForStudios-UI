# SitesForStudios: notes for development

This repo is the web app (`web/` in the local workspace). The API is SitesForStudios-API.

Website builder and client photo delivery SaaS for wedding studios. Stack and setup are in README.md.

## Architecture rule: one app now, split later

All dashboards (Super Admin, Organization, Studio/partner, Client portal) and the studio websites currently run in **one web app** (`web/`) and **one API** (`server/`). This is deliberate for the MVP.

**Planned future split** (decided 2026-11-22): the dashboards will become separate apps, Super Admin first (for example `admin.sitesforstudios.com`, behind an IP allowlist or two-factor login). Every change must keep that split cheap.

### Rules for new code

- **Web: one folder per role.** `web/src/pages/superadmin/`, `pages/org/`, `pages/studio/`, `pages/portal/`, and `web/src/site/` for public studio websites. Never import from another role's folder. Shared code goes only in `web/src/components/`, `api.js` or `auth.jsx`.
- **API: one router per role, under its own prefix.**

  | Role | Route file | Prefix |
  | --- | --- | --- |
  | Super Admin | `routes/admin.js` | `/api/admin` |
  | Organization | `routes/orgs.js` | `/api/org` |
  | Studio | `routes/studios.js`, `routes/events.js`, `routes/invoices.js`, `routes/bookings.js` | `/api/studios`, `/api/events`, `/api/invoices`, `/api/bookings` |
  | Client | `routes/portal.js` | `/api/portal` |
  | Public | `routes/public.js` | `/api/sites…`, `/api/invoice-view`, `/api/media`, `/api/uploads` |
  | Shared | `routes/auth.js`, `routes/billing.js` | `/api/auth`, `/api/billing` |

  Logic needed by two roles goes in `server/src/services/`, never in another role's route file.
- **Authorization lives in the API.** Each router checks the role (`requireRole`) and ownership (`studioGuard`, `eventGuard`). Hiding a link in the UI is never the protection.
- **Auth must survive subdomains.** Login uses an httpOnly cookie today. When splitting, use a shared parent cookie domain or a token handoff; don't add code that assumes everything is on one origin.
- **New role-specific features** go in that role's folder and router. Call out any feature that crosses roles and how it affects the split.

## Other decisions

- Payments: Razorpay only. AWS region: Mumbai (`ap-south-1`) for hosting, databases, email and face recognition.
- Photos and videos: Cloudflare R2 (decided 2026-11-26; free downloads). No gallery archiving: galleries stay online while the studio subscribes and stays within plan storage.
- Keep both PostgreSQL (tenants, accounts, billing, events, enquiries) and MongoDB (site configs, photo metadata, faces).
- Users have no self sign-up and no forgot-password link. Studios create accounts and reset passwords; users can change their own.
- Plan for growth from the product plan: https://claude.ai/artifact/9VSxVSfSFRPEGHnrFM4xet
