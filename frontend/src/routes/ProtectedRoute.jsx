import { Navigate, Outlet } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner size="lg" fullPage label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}