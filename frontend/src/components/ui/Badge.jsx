import './Badge.css';

/** Small status pill. Variants: neutral | success | warning | danger | accent. */
export default function Badge({ variant = 'neutral', children }) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}

