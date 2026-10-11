import { LogOut } from 'lucide-react';
import Button from '../ui/Button';
import { ROLE_LABELS } from '../../constants/navigation';

function displayName(user) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return fullName || user.username || 'Signed in';
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Current user's avatar, name and role, plus the logout button. */
export default function UserMenu({ user, onLogout, loggingOut = false }) {
  const name = displayName(user);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <div className="user-menu">
      <span className="user-menu__avatar" aria-hidden="true">
        {initials(name)}
      </span>
      <span className="user-menu__text">
        <span className="user-menu__name">{name}</span>
        <span className="user-menu__role">{roleLabel}</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        icon={LogOut}
        onClick={onLogout}
        loading={loggingOut}
        aria-label="Log out"
      >
        <span className="user-menu__logout-label">Log out</span>
      </Button>
    </div>
  );
}
