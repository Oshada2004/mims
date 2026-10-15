import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from './Input';
import './PasswordInput.css';

/**
 * Password input with a show/hide toggle. Forwards all other props to Input. Pass `visible` and
 * `onToggle` to control it from outside; otherwise it keeps its own state.
 */
export default function PasswordInput({ visible, onToggle, ...props }) {
  const [ownVisible, setOwnVisible] = useState(false);
  const isVisible = visible ?? ownVisible;
  const toggle = onToggle ?? (() => setOwnVisible((current) => !current));

  return (
    <div className="password-input">
      <Input type={isVisible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="password-input__toggle"
        onClick={toggle}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
      >
        {isVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
