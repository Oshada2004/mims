import './Switch.css';

/** On/off switch with a visible label and optional description. */
export default function Switch({ checked, onChange, label, description, disabled = false, id }) {
  return (
    <label className={['switch', disabled && 'switch--disabled'].filter(Boolean).join(' ')} htmlFor={id}>
      <span className="switch__text">
        <span className="switch__label">{label}</span>
        {description && <span className="switch__description">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={['switch__control', checked && 'switch__control--on'].filter(Boolean).join(' ')}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" aria-hidden="true" />
      </button>
    </label>
  );
}
