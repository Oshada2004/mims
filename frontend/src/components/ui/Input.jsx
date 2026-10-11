import './Input.css';

/** Text input. Forwards all standard props (and `ref`) to the <input>. */
export default function Input({ invalid = false, className = '', ...props }) {
  return (
    <input
      className={['input', invalid && 'input--invalid', className].filter(Boolean).join(' ')}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
