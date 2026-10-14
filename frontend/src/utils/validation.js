
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

export function isValidDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text ?? '')) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}


export function ageInYears(dob, today = new Date()) {
  if (!dob) return null;
  const birth = new Date(String(dob).length === 10 ? `${dob}T00:00:00` : dob);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}


export function todayIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isValidNic(text) {
  return /^(\d{9}[VvXx]|\d{12})$/.test((text ?? '').trim());
}

export function isValidPhone(text) {
  const value = (text ?? '').trim();
  return /^\+?\d{9,12}$/.test(value) && value.length <= 12;
}

export function isValidAmount(text, { allowZero = false } = {}) {
  const value = String(text ?? '').trim();
  if (!AMOUNT_PATTERN.test(value)) return false;
  return allowZero ? Number(value) >= 0 : Number(value) > 0;
}
export function isPositiveInteger(text) {
  return /^\d+$/.test(String(text ?? '').trim()) && Number(text) > 0;
}

export function validate(values, rules) {
  const errors = {};
  for (const [field, checks] of Object.entries(rules)) {
    for (const check of checks) {
      const message = check(values[field], values);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  return errors;
}

export const rules = {
  required: (label = 'This field') => (value) =>
    String(value ?? '').trim() ? null : `${label} is required.`,
  maxLength: (max) => (value) =>
    String(value ?? '').trim().length > max ? `Must be at most ${max} characters.` : null,
  date: () => (value) => (!value || isValidDate(value) ? null : 'Enter a valid date.'),
  notFuture: () => (value) => (!value || value <= todayIso() ? null : 'Date cannot be in the future.'),
  minAge: (min, message) => (value) => {
    const age = ageInYears(value);
    return age === null || age >= min ? null : message;
  },
  maxAge: (max, message) => (value) => {
    const age = ageInYears(value);
    return age === null || age <= max ? null : message;
  },
  nic: () => (value) =>
    !value || isValidNic(value) ? null : 'NIC must be 9 digits followed by V/X, or 12 digits.',
  phone: () => (value) => (!value || isValidPhone(value) ? null : 'Enter a phone number of 9–12 digits.'),
  amount: (options) => (value) =>
    !value || isValidAmount(value, options) ? null : 'Enter a positive amount with at most 2 decimals.',
  positiveInteger: (label = 'Value') => (value) =>
    !value || isPositiveInteger(value) ? null : `${label} must be a positive whole number.`,
};