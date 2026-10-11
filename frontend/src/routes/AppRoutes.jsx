import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import { ROLE_HOME, ROLES } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner size="lg" fullPage label="Checking your session" />;

  const home = user ? (ROLE_HOME[user.role] ?? '/unauthorized') : '/login';
  const redirectHome = <Navigate to={home} replace />;

  return (
    <Routes>
      <Route path="/" element={redirectHome} />
      <Route path="/login" element={user ? redirectHome : <Login />} />
      <Route path="/signup" element={user ? redirectHome : <Signup />} />

      <Route path="/admin" element={<ProtectedRoute role={ROLES.ADMIN} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}