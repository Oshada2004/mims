import { Children, cloneElement, isValidElement, useId } from 'react';
import './FormField.css';

/**
 * Label + control + hint/error. The single child (Input, Select, …) receives the generated
 * `id`, `aria-describedby` and `invalid` props so the label and messages are tied to it.
 */
export default function FormField({ label, id, error, hint, required = false, className = '', children }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const child = Children.only(children);
  const control = isValidElement(child)
    ? cloneElement(child, {
        id: fieldId,
        required: child.props.required ?? required,
        invalid: Boolean(error),
        'aria-describedby': describedBy,
      })
    : child;

  return (
    <div className={['form-field', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="form-field__label" htmlFor={fieldId}>
          {label}
          {required && (
            <span className="form-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
