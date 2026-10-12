const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-LK', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-LK', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const percentFormatter = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format a number (or numeric string from MySQL DECIMAL) as LKR with 2 decimals.
 * Returns '—' for empty or non-numeric values.
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';
  return currencyFormatter.format(amount);
}

/**
 * Format a date (Date, ISO string or timestamp). Pass { withTime: true } to include the time.
 * Returns '—' for empty or invalid values.
 */
export function formatDate(value, { withTime = false } = {}) {
  const date = toDate(value);
  if (!date) return '—';
  return (withTime ? dateTimeFormatter : dateFormatter).format(date);
}

/** Format a date with its time. Returns '—' for empty or invalid values. */
export function formatDateTime(value) {
  return formatDate(value, { withTime: true });
}

/** Format an annual rate such as 11 or "11.00" as "11.00%". Returns '—' when empty. */
export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  const rate = Number(value);
  if (Number.isNaN(rate)) return '—';
  return `${percentFormatter.format(rate)}%`;
}

/** Turn a backend enum such as 'CUSTOMER_SERVICE' into 'Customer service'. Returns '' when empty. */
export function formatLabel(value) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
