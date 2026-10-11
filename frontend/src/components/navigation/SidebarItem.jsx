import { NavLink } from 'react-router-dom';

/** One sidebar link. The active route is highlighted in orange. */
export default function SidebarItem({ label, path, icon: Icon, onNavigate }) {
  return (
    <li>
      <NavLink
        to={path}
        onClick={onNavigate}
        className={({ isActive }) =>
          ['sidebar-item', isActive && 'sidebar-item--active'].filter(Boolean).join(' ')
        }
      >
        {Icon && <Icon size={18} aria-hidden="true" />}
        <span>{label}</span>
      </NavLink>
    </li>
  );
}
