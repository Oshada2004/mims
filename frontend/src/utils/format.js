// The bank runs on Sri Lanka time. Times are always shown in this zone, whatever the browser's zone is.
export const BANK_TIME_ZONE = 'Asia/Colombo';

// A calendar date as sent by the API for DATE columns: no time, no zone.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// en-GB: "15 Oct 2026" and "15 Oct 2026, 10:55" in every browser.
const DATE_LOCALE = 'en-GB';
const DATE_PARTS = { year: 'numeric', month: 'short', day: '2-digit' };

// Calendar dates are formatted in UTC from a UTC midnight, so they can never move to another day.
const calendarDateFormatter = new Intl.DateTimeFormat(DATE_LOCALE, { ...DATE_PARTS, timeZone: 'UTC' });
// Moments in time (timestamps) are formatted in bank time.
const bankDateFormatter = new Intl.DateTimeFormat(DATE_LOCALE, { ...DATE_PARTS, timeZone: BANK_TIME_ZONE });
const bankDateTimeFormatter = new Intl.DateTimeFormat(DATE_LOCALE, {
  ...DATE_PARTS,
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BANK_TIME_ZONE,
});
// en-CA formats as YYYY-MM-DD.
const bankIsoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: BANK_TIME_ZONE,
});

const percentFormatter = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isDateOnly(value) {
  return typeof value === 'string' && DATE_ONLY.test(value);
}

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

// 'YYYY-MM-DD' -> "15 Oct 2026" exactly as given. A timestamp -> its date (and time) in bank time.
export function formatDate(value, { withTime = false } = {}) {
  if (isDateOnly(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return calendarDateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
  }
  const date = toDate(value);
  if (!date) return '—';
  return (withTime ? bankDateTimeFormatter : bankDateFormatter).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { withTime: true });
}

// 'YYYY-MM-DD' for CSV files and comparisons: a calendar date is kept, a timestamp becomes its bank date.
export function toIsoDate(value) {
  if (isDateOnly(value)) return value;
  const date = toDate(value);
  return date ? bankIsoDateFormatter.format(date) : '';
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