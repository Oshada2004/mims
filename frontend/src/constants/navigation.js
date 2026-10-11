import {
  ArrowLeftRight,
  Building2,
  CirclePlus,
  LayoutDashboard,
  PiggyBank,
  Settings,
  UserCircle,
  UserPlus,
  Users,
  UserCog,
} from 'lucide-react';
import { ROLES } from './roles';

// Sidebar items for each role
export const NAVIGATION = {
  [ROLES.ADMIN]: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Bank management', path: '/admin/banks', icon: Building2 },
    { label: 'Agents', path: '/admin/agents', icon: UserCog },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Profile', path: '/admin/profile', icon: UserCircle },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ],
  [ROLES.STAFF]: [
    { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'Register customer', path: '/staff/register-customer', icon: UserPlus },
    { label: 'Open account', path: '/staff/open-account', icon: CirclePlus },
    { label: 'Open fixed deposit', path: '/staff/open-fd', icon: PiggyBank },
    { label: 'Transactions', path: '/staff/transactions', icon: ArrowLeftRight },
    { label: 'Profile', path: '/staff/profile', icon: UserCircle },
    { label: 'Settings', path: '/staff/settings', icon: Settings },
  ],
  [ROLES.CUSTOMER]: [
    { label: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/customer/transactions', icon: ArrowLeftRight },
    { label: 'Open fixed deposit', path: '/customer/open-fd', icon: PiggyBank },
    { label: 'Profile', path: '/customer/profile', icon: UserCircle },
    { label: 'Settings', path: '/customer/settings', icon: Settings },
  ],
};

// Role name for UI
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.STAFF]: 'Staff',
  [ROLES.CUSTOMER]: 'Customer',
};