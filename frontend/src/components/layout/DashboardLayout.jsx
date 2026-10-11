import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../navigation/Sidebar';
import Topbar from '../navigation/Topbar';
import { NAVIGATION } from '../../constants/navigation';
import { useAuth } from '../../context/AuthContext';
import { useBank } from '../../context/BankContext';
import './DashboardLayout.css';

const SIDEBAR_ID = 'app-sidebar';

/* Shell for every signed-in page */
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const bank = useBank();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const items = NAVIGATION[user.role] ?? [];
  const title = items.find((item) => item.path === pathname)?.label ?? (bank?.bank_name ?? 'bank');

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // ProtectedRoute redirects to login once the user is cleared.
  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        id={SIDEBAR_ID}
        items={items}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="dashboard-layout__main">
        <Topbar
          title={title}
          user={user}
          sidebarId={SIDEBAR_ID}
          menuOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
        <main className="dashboard-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}