import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, homeFor, isOrgBlocked } from './auth.jsx';
import AccountBlocked from './components/AccountBlocked.jsx';
import AcceptTerms from './components/AcceptTerms.jsx';
import Terms from './pages/legal/Terms.jsx';
import Privacy from './pages/legal/Privacy.jsx';
import { isAppHost } from './hosts.js';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Landing from './pages/Landing.jsx';
import AppShell from './components/AppShell.jsx';
import SuperAdmin from './pages/superadmin/SuperAdmin.jsx';
import OrgHome from './pages/org/OrgHome.jsx';
import Billing from './pages/org/Billing.jsx';
import StudioHome from './pages/studio/StudioHome.jsx';
import EventManage from './pages/studio/EventManage.jsx';
import MyEvents from './pages/portal/MyEvents.jsx';
import EventView from './pages/portal/EventView.jsx';
import MyInvoices from './pages/portal/MyInvoices.jsx';
import SiteRenderer from './site/SiteRenderer.jsx';



function Protected({ roles, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <div className="center-page muted">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (isOrgBlocked(user)) return <AccountBlocked />;
  if (user.terms_current_version && user.terms_version !== user.terms_current_version) return <AcceptTerms />;
  if (user.must_change_password && loc.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

const MANAGERS = ['super_admin', 'org_admin', 'studio_admin', 'staff'];

export default function App() {
  const host = window.location.hostname;
  if (!isAppHost(host)) {
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
      <Route path="/signup" element={<Signup />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/change-password" element={<Protected><ChangePassword /></Protected>} />
      <Route element={<Protected roles={MANAGERS}><AppShell /></Protected>}>
        <Route path="/admin" element={<Protected roles={['super_admin']}><SuperAdmin /></Protected>} />
        <Route path="/org" element={<Protected roles={['org_admin', 'super_admin']}><OrgHome /></Protected>} />
        <Route path="/org/billing" element={<Protected roles={['org_admin']}><Billing /></Protected>} />
        <Route path="/studio/:studioId" element={<StudioHome />} />
        <Route path="/studio/:studioId/:tab" element={<StudioHome />} />
        <Route path="/studio/:studioId/:tab/:itemId" element={<StudioHome />} />
        <Route path="/events/:eventId" element={<EventManage />} />
      </Route>
      <Route path="/portal" element={<Protected><MyEvents /></Protected>} />
      <Route path="/portal/events/:eventId" element={<Protected><EventView /></Protected>} />
      <Route path="/portal/invoices" element={<Protected><MyInvoices /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
