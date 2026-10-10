
import { useContext, useState } from 'react';
import {
  Landmark,
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  Clock3,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserRound,
  Building2
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);

  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.user_role;
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF';
  const isCustomer = role === 'CUSTOMER';

  const displayName = [
    user?.first_name,
    user?.last_name
  ].filter(Boolean).join(' ') || user?.username || 'User';

  const navigation = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      visible: true
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      visible: isStaff || isAdmin
    },
    {
      id: 'add-customer',
      label: 'Register Customer',
      icon: UserPlus,
      visible: isStaff
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: Building2,
      visible: isAdmin
    },
    {
      id: 'accounts',
      label: 'My Accounts',
      icon: Wallet,
      visible: isCustomer
    }
  ].filter(item => item.visible);

  const selectPage = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`dashboard-sidebar ${
          sidebarOpen ? 'sidebar-open' : ''
        }`}
      >
        <div className="sidebar-brand">
          <div className="bank-logo">
            <Landmark size={25} />
          </div>

          <div>
            <h2>Arunodaya</h2>
            <span>Banking MIMS</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">
          WORKSPACE
        </div>

        <nav className="sidebar-navigation">
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id ? 'active' : ''
                }`}
                onClick={() => selectPage(item.id)}
              >
                <Icon size={19} />

                <span>{item.label}</span>

                {activePage === item.id && (
                  <ChevronRight size={16} className="nav-chevron" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={20} />

            <div>
              <strong>Secure Banking</strong>
              <span>Protected session</span>
            </div>
          </div>

          <button
            className="sidebar-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <span className="breadcrumb">
                Arunodaya Bank / MIMS
              </span>

              <h1 className="topbar-title">
                {activePage === 'overview'
                  ? 'Dashboard'
                  : navigation.find(
                      item => item.id === activePage
                    )?.label}
              </h1>
            </div>
          </div>

          <div className="topbar-user">
            <div className="user-avatar">
              <UserRound size={20} />
            </div>

            <div className="user-meta">
              <strong>{displayName}</strong>
              <span>
                {user?.staff_role || user?.user_role}
              </span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-section">
            <div>
              <span className="eyebrow">
                ARUNODAYA BANK · MIMS
              </span>

              <h2 className='welcome'>Welcome back, {displayName}</h2>

              <p>
                Manage your banking operations from one place.
              </p>
            </div>

            <div className="welcome-icon">
              <Landmark size={32} />
            </div>
          </section>

          {activePage === 'overview' && (
            <section className="dashboard-section">
              <div className="section-heading">
                

                <span className="role-pill">
                  {user?.user_role || 'USER'}
                </span>
              </div>

              <div className="overview-grid">
                {isAdmin && (
                  <button
                    className="overview-card"
                    onClick={() => selectPage('staff')}
                  >
                    <div className="overview-icon">
                      <Building2 size={23} />
                    </div>

                    <span className="card-label">
                      ADMINISTRATION
                    </span>

                    <h4>Staff Management</h4>

                    <p>
                      Create staff accounts and manage staff access.
                    </p>

                    <span className="card-action">
                      Open management <ChevronRight size={16} />
                    </span>
                  </button>
                )}

                {(isStaff || isAdmin) && (
                  <button
                    className="overview-card"
                    onClick={() =>
                      selectPage(isStaff ? 'add-customer' : 'customers')
                    }
                  >
                    <div className="overview-icon">
                      <Users size={23} />
                    </div>

                    <span className="card-label">
                      CUSTOMER SERVICES
                    </span>

                    <h4>Customer Management</h4>

                    <p>
                      Access customer management tools.
                    </p>

                    <span className="card-action">
                      Open customers <ChevronRight size={16} />
                    </span>
                  </button>
                )}

                {isCustomer && (
                  <button
                    className="overview-card"
                    onClick={() => selectPage('accounts')}
                  >
                    <div className="overview-icon">
                      <Wallet size={23} />
                    </div>

                    <span className="card-label">
                      PERSONAL BANKING
                    </span>

                    <h4>My Accounts</h4>

                    <p>
                      Access your own permitted account information.
                    </p>

                    <span className="card-action">
                      View accounts <ChevronRight size={16} />
                    </span>
                  </button>
                )}

                <div className="overview-card information-card">
                  <div className="overview-icon">
                    <ShieldCheck size={23} />
                  </div>

                  <span className="card-label">
                    ACCOUNT SECURITY
                  </span>

                  <h4>Session active</h4>

                  <p>
                    Your dashboard is protected by your authenticated
                    banking session.
                  </p>
                </div>
              </div>

              <div className="dashboard-information">
                <div className="information-heading">
                  <Clock3 size={20} />
                  <h3>Quick information</h3>
                </div>

                <div className="information-row">
                  <span>Signed-in user</span>
                  <strong>{displayName}</strong>
                </div>

                <div className="information-row">
                  <span>System role</span>
                  <strong>{user?.user_role || 'Unknown'}</strong>
                </div>

                {user?.staff_role && (
                  <div className="information-row">
                    <span>Staff designation</span>
                    <strong>{user.staff_role}</strong>
                  </div>
                )}

                {user?.branch_id && (
                  <div className="information-row">
                    <span>Branch ID</span>
                    <strong>{user.branch_id}</strong>
                  </div>
                )}
              </div>
            </section>
          )}

          {activePage === 'add-customer' && isStaff && (
            <CustomerRegistration />
          )}

          {activePage === 'staff' && isAdmin && (
            <StaffManagement />
          )}

          {activePage === 'customers' && (isStaff || isAdmin) && (
            <PlaceholderPanel
              title="Customer Management"
              description="Customer search and customer records will be connected to the existing MySQL database in the next step."
            />
          )}

          {activePage === 'accounts' && isCustomer && (
            <CustomerAccounts personId={user?.person_id} />
          )}

          <footer className="dashboard-footer">
            <span>
              © 2026 Arunodaya Bank · Microbanking & Interest
              Management System
            </span>

            <span>Secure Banking Workspace</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function PlaceholderPanel({ title, description }) {
  return (
    <section className="workspace-panel">
      <h3>{title}</h3>
      <p>{description}</p>
    </section>
  );
}

function CustomerRegistration() {
  return (
    <PlaceholderPanel
      title="Register Customer"
      description="The adult and minor registration forms will use the existing customer stored procedures. The next step is connecting these forms to the API."
    />
  );
}

function StaffManagement() {
  return (
    <PlaceholderPanel
      title="Staff Management"
      description="The staff registration form will be restricted to administrators and will create both a staff profile and login credentials."
    />
  );
}

function CustomerAccounts({ personId }) {
  return (
    <PlaceholderPanel
      title="My Accounts"
      description={
        personId
          ? 'Your account information will be retrieved securely from the accounts API.'
          : 'Your customer profile is not available.'
      }
    />
  );
}