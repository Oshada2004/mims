import './Spinner.css';

/**
 * Loading indicator. Sizes: sm | md | lg.
 * `inline` renders just the ring (e.g. inside a Button); `fullPage` centres it in the viewport.
 */
export default function Spinner({ size = 'md', label = 'Loading', inline = false, fullPage = false }) {
  const ring = <span className={`spinner spinner--${size}`} aria-hidden="true" />;

  if (inline) return ring;

  return (
    <div
      className={['spinner-container', fullPage && 'spinner-container--full'].filter(Boolean).join(' ')}
      role="status"
    >
      {ring}
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
