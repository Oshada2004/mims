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
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return (withTime ? dateTimeFormatter : dateFormatter).format(date);
}
