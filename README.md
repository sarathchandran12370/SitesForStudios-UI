# SitesForStudios UI

Web app for SitesForStudios: the Super Admin, Organization, Studio and Client dashboards, plus the public studio websites. The backend lives in [SitesForStudios-API](https://github.com/sarathchandran12370/SitesForStudios-API).

React 19 · Vite · React Router

## Run locally

Start the API first (see the API repo). Then:

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. In development, Vite forwards `/api` to the API at http://localhost:4000 (see `vite.config.js`).

```bash
npm run build
```

builds static files into `dist/`.

## Tests

```bash
npm test
```

Runs the Vitest + Testing Library suite (host detection, login and password screens, suspended-account notice, Super Admin plan editor, website enquiry form). The API is mocked, so no server is needed.

## Structure

```
src/
├── App.jsx             routes and which roles can open them
├── api.js, auth.jsx    API helper and login state (shared)
├── components/         app layout (sidebar) and shared UI pieces
├── pages/
│   ├── Login, ChangePassword, Landing
│   ├── superadmin/     Super Admin dashboard
│   ├── org/            Organization dashboard
│   ├── studio/         Studio dashboard: events, uploads, website editor, clients, enquiries, domain
│   └── portal/         Client portal: events, highlights, people, downloads
└── site/               public studio websites (3 templates) and the enquiry form
```

| Role | Opens at |
| --- | --- |
| Super Admin | `/admin` |
| Organization | `/org` |
| Studio (partner) | `/studio/:studioId` |
| Client | `/portal` |
| Public studio website | `/s/:slug`, or the studio's own domain |

Any host not listed in `APP_HOSTS` (`src/App.jsx`) is treated as a studio's custom domain and renders that studio's website.

## Deployment

Pushes to `main` build the app and upload it to S3 behind CloudFront (`.github/workflows/deploy.yml`). Pull requests only build. The one-time AWS setup, including the repository variables this workflow needs (`AWS_DEPLOY_ROLE_ARN`, `UI_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, optional `APP_HOSTS`), is in the API repo's [DEPLOYMENT.md](https://github.com/sarathchandran12370/SitesForStudios-API/blob/main/DEPLOYMENT.md). Until those variables are set, the deploy job is skipped.

## Future split

The dashboards will become separate apps later (Super Admin first). Keep each role's pages in its own folder and never import across role folders; shared code goes in `components/`, `api.js` or `auth.jsx`.
