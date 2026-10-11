import './Card.css';

/** Bordered white surface with an optional header (title, description, actions). */
export default function Card({ title, description, actions, padded = true, className = '', children }) {
  const hasHeader = title || description || actions;

  return (
    <section className={['card', className].filter(Boolean).join(' ')}>
      {hasHeader && (
        <header className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {description && <p className="card__description">{description}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'card__body' : undefined}>{children}</div>
    </section>
  );
}
