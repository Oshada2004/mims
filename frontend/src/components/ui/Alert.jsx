import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import './Alert.css';

const ICONS = { info: Info, success: CheckCircle2, error: AlertCircle };

/** Inline message. Variants: info | success | error. Pass onClose to show a dismiss button. */
export default function Alert({ variant = 'info', title, onClose, children }) {
  const Icon = ICONS[variant] ?? Info;

  return (
    <div className={`alert alert--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <Icon className="alert__icon" size={18} aria-hidden="true" />
      <div className="alert__content">
        {title && <p className="alert__title">{title}</p>}
        {children && <div className="alert__message">{children}</div>}
      </div>
      {onClose && (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Dismiss">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
