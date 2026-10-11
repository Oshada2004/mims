import { Inbox } from 'lucide-react';
import './EmptyState.css';

/** Placeholder for empty lists and sections. `icon` is a lucide component. */
export default function EmptyState({ icon: Icon = Inbox, title, message, action, compact = false }) {
  return (
    <div className={['empty-state', compact && 'empty-state--compact'].filter(Boolean).join(' ')}>
      <div className="empty-state__icon">
        <Icon size={compact ? 20 : 24} aria-hidden="true" />
      </div>
      {title && <p className="empty-state__title">{title}</p>}
      {message && <p className="empty-state__message">{message}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
