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

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';
  return currencyFormatter.format(amount);
}
export function formatDate(value, { withTime = false } = {}) {
  const date = toDate(value);
  if (!date) return '—';
  return (withTime ? dateTimeFormatter : dateFormatter).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { withTime: true });
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  const rate = Number(value);
  if (Number.isNaN(rate)) return '—';
  return `${percentFormatter.format(rate)}%`;
}

export function formatLabel(value) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}