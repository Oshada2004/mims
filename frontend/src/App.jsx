import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import { ROLE_HOME, ROLES } from './constants/roles';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ProtectedRoute from './routes/ProtectedRoute';

// TEMPORARY (phase 4): placeholder routes until AppRoutes.jsx and the real pages land in phase 6.
function PlaceholderHome() {
  const { user, logout } = useAuth();
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <Card
        title={`Signed in as ${user.first_name ?? user.username ?? user.person_id}`}
        description={`Role: ${user.role}`}
        actions={
          <Button variant="secondary" size="sm" icon={LogOut} onClick={logout}>
            Log out
          </Button>
        }
      >
        <p className="text-muted">The {user.role.toLowerCase()} dashboard is coming soon.</p>
      </Card>
    </main>
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
          <Route path="*" element={<PlaceholderHome />} />
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
