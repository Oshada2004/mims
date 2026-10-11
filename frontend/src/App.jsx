import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import DashboardLayout from './components/layout/DashboardLayout';
import Card from './components/ui/Card';
import EmptyState from './components/ui/EmptyState';
import PageHeader from './components/ui/PageHeader';
import { ROLE_HOME, ROLES } from './constants/roles';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ProtectedRoute from './routes/ProtectedRoute';

// TEMPORARY (phases 4–5): placeholder routes until AppRoutes.jsx and the real pages land in phase 6.
function PlaceholderPage() {
  const { pathname } = useLocation();
  return (
    <>
      <PageHeader title="Coming soon" description={`The page at ${pathname} is built in phase 6.`} />
      <Card>
        <EmptyState icon={Construction} title="Under construction" message="Use the sidebar to check navigation." />
      </Card>
    </>
  );
}

function TemporaryRoutes() {
  const { user, loading } = useAuth();
  const home = user ? (ROLE_HOME[user.role] ?? '/unauthorized') : '/login';
  const publicOnly = (page) => (loading ? null : user ? <Navigate to={home} replace /> : page);

  return (
    <Routes>
      <Route path="/" element={publicOnly(<Navigate to="/login" replace />)} />
      <Route path="/login" element={publicOnly(<Login />)} />
      <Route path="/signup" element={publicOnly(<Signup />)} />
      {Object.values(ROLES).map((role) => (
        <Route key={role} path={`/${role.toLowerCase()}`} element={<ProtectedRoute role={role} />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Route>
      ))}
      <Route path="/unauthorized" element={<p style={{ padding: 'var(--space-8)' }}>Unauthorized.</p>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TemporaryRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
