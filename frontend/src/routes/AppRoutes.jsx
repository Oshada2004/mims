import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import { ROLE_HOME, ROLES } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import AdminDashboard from '../pages/admin/AdminDashboard';
import StaffDashboard from '../pages/staff/StaffDashboard';
import RegisterCustomer from '../pages/staff/RegisterCustomer';
import OpenAccount from '../pages/staff/OpenAccount';
import StaffOpenFd from '../pages/staff/StaffOpenFd';
import StaffTransactions from '../pages/staff/StaffTransactions';
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import CustomerTransactions from '../pages/customer/CustomerTransactions';
import CustomerOpenFd from '../pages/customer/CustomerOpenFd';
import Profile from '../pages/shared/Profile';
import Settings from '../pages/shared/Settings';
import Unauthorized from '../pages/shared/Unauthorized';
import NotFound from '../pages/shared/NotFound';

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

      <Route path="/staff" element={<ProtectedRoute role={ROLES.STAFF} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="register-customer" element={<RegisterCustomer />} />
          <Route path="open-account" element={<OpenAccount />} />
          <Route path="open-fd" element={<StaffOpenFd />} />
          <Route path="transactions" element={<StaffTransactions />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="/customer" element={<ProtectedRoute role={ROLES.CUSTOMER} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="transactions" element={<CustomerTransactions />} />
          <Route path="open-fd" element={<CustomerOpenFd />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}