import { Menu } from 'lucide-react';
import UserMenu from './UserMenu';
import './Topbar.css';

/** Top bar: drawer toggle (mobile), page title and the user menu. */
export default function Topbar({ title, user, onMenuClick, menuOpen, sidebarId, onLogout, loggingOut }) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__menu"
        onClick={onMenuClick}
        aria-label="Open navigation"
        aria-controls={sidebarId}
        aria-expanded={menuOpen}
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      <p className="topbar__title">{title}</p>
      <UserMenu user={user} onLogout={onLogout} loggingOut={loggingOut} />
    </header>
  );
}
