import { Landmark, X } from 'lucide-react';
import { useBank } from '../../context/BankContext';
import SidebarItem from './SidebarItem';
import './Sidebar.css';

/**
 * App sidebar. On desktop it is always visible; below 768px it becomes a drawer
 * controlled by `open` / `onClose`.
 */
export default function Sidebar({ id, items, open, onClose }) {
  const bank = useBank();

  return (
    <>
      <div
        className={['sidebar-backdrop', open && 'sidebar-backdrop--visible'].filter(Boolean).join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside id={id} className={['sidebar', open && 'sidebar--open'].filter(Boolean).join(' ')}>
        <div className="sidebar__brand">
          <span className="sidebar__logo">
            <Landmark size={20} aria-hidden="true" />
          </span>
          <span className="sidebar__brand-text">
            <span className="sidebar__brand-name">{bank?.bank_name ?? 'bank'}</span>
            <span className="sidebar__brand-sub">MIMS</span>
          </span>
          <button
            type="button"
            className="sidebar__close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <ul className="sidebar__list">
            {items.map((item) => (
              <SidebarItem key={item.path} {...item} onNavigate={onClose} />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
