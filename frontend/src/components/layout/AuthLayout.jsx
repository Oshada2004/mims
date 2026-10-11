import { Landmark } from 'lucide-react';
import { useBank } from '../../context/BankContext';
import './AuthLayout.css';

/** Centred card used by the login and signup pages. */
export default function AuthLayout({ title, description, wide = false, footer, children }) {
  const bank = useBank();

  return (
    <main className="auth-layout">
      <div className={['auth-layout__card', wide && 'auth-layout__card--wide'].filter(Boolean).join(' ')}>
        <div className="auth-layout__brand">
          <span className="auth-layout__logo">
            <Landmark size={22} aria-hidden="true" />
          </span>
          <span>
            <span className="auth-layout__brand-name">{bank?.bank_name ?? 'bank'}</span>
            <span className="auth-layout__brand-sub">MIMS</span>
          </span>
        </div>
        <p className="auth-layout__motto">{bank?.motto ?? ' '}</p>

        <header className="auth-layout__header">
          <h1 className="auth-layout__title">{title}</h1>
          {description && <p className="auth-layout__description">{description}</p>}
        </header>

        {children}

        {footer && <div className="auth-layout__footer">{footer}</div>}
      </div>
    </main>
  );
}