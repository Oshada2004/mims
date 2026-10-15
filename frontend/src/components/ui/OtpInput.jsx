import { useRef } from 'react';
import './OtpInput.css';

/**
 * One-time code entry as separate digit boxes. Controlled: `value` is a string of digits,
 * `onChange(next)` receives the new string. Supports typing, Backspace, arrow keys and pasting the whole code.
 */
export default function OtpInput({ value, onChange, length = 6, disabled = false, autoFocus = false, label = 'Code', onComplete }) {
  const inputs = useRef([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const focusBox = (index) => inputs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const update = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleChange = (index, event) => {
    const typed = event.target.value.replace(/\D/g, '');
    if (!typed) return;
    // Typing over a box replaces that digit; several digits (autofill) fill the following boxes.
    const next = (value.slice(0, index) + typed + value.slice(index + typed.length)).slice(0, length);
    update(next);
    focusBox(index + typed.length);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        update(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        update(value.slice(0, index - 1) + value.slice(index));
        focusBox(index - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    update(pasted);
    focusBox(pasted.length);
  };

  return (
    <div className="otp-input" role="group" aria-label={label}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          className="otp-input__box"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`${label} digit ${index + 1} of ${length}`}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}
