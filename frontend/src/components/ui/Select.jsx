import { ChevronDown } from 'lucide-react';
import './Input.css';
import './Select.css';

/**
 * Native select. Pass `options` as [{ value, label }] or render <option> children yourself.
 * `placeholder` adds an empty first option. Forwards all standard props to the <select>.
 */
export default function Select({
  options,
  placeholder,
  invalid = false,
  className = '',
  children,
  ...props
}) {
  return (
    <div className="select-wrapper">
      <select
        className={['select', invalid && 'select--invalid', className].filter(Boolean).join(' ')}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown className="select-wrapper__icon" size={16} aria-hidden="true" />
    </div>
  );
}
