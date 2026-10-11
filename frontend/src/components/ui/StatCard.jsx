import './StatCard.css';

/** Compact metric tile: label, value and an optional lucide icon and hint line. */
export default function StatCard({ label, value = '—', icon: Icon, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-card__text">
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value}</p>
        {hint && <p className="stat-card__hint">{hint}</p>}
      </div>
      {Icon && (
        <div className="stat-card__icon">
          <Icon size={20} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
