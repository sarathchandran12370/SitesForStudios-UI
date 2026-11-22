import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from './auth.jsx';
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Landing from './pages/Landing.jsx';
import AppShell from './components/AppShell.jsx';
import SuperAdmin from './pages/superadmin/SuperAdmin.jsx';
import OrgHome from './pages/org/OrgHome.jsx';
import StudioHome from './pages/studio/StudioHome.jsx';
import EventManage from './pages/studio/EventManage.jsx';
import MyEvents from './pages/portal/MyEvents.jsx';
import EventView from './pages/portal/EventView.jsx';
import SiteRenderer from './site/SiteRenderer.jsx';

// Hosts that serve the platform app itself. Any other host is a studio's custom domain.
const APP_HOSTS = ['localhost', '127.0.0.1', 'app.sitesforstudios.com', 'sitesforstudios.com', 'www.sitesforstudios.com'];

function Protected({ roles, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <div className="center-page muted">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (user.must_change_password && loc.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

const MANAGERS = ['super_admin', 'org_admin', 'studio_admin', 'staff'];

export default function App() {
  const host = window.location.hostname;
  if (!APP_HOSTS.includes(host)) {
    return (
      <Routes>
        <Route path="*" element={<SiteRenderer byHost={host} />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/s/:slug" element={<SiteRenderer />} />
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<Protected><ChangePassword /></Protected>} />
      <Route element={<Protected roles={MANAGERS}><AppShell /></Protected>}>
        <Route path="/admin" element={<Protected roles={['super_admin']}><SuperAdmin /></Protected>} />
        <Route path="/org" element={<Protected roles={['org_admin', 'super_admin']}><OrgHome /></Protected>} />
        <Route path="/studio/:studioId" element={<StudioHome />} />
        <Route path="/studio/:studioId/:tab" element={<StudioHome />} />
        <Route path="/events/:eventId" element={<EventManage />} />
      </Route>
      <Route path="/portal" element={<Protected><MyEvents /></Protected>} />
      <Route path="/portal/events/:eventId" element={<Protected><EventView /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
