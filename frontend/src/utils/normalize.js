// Helpers the API services use to turn backend responses into plain data for pages.

/** MySQL DECIMALs arrive as strings ("500.00"). Returns a number, or null when empty/invalid. */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Amount to send to the API: a string with at most 2 decimals ("1500", "1500.5", "1500.50").
 * Valid strings are sent as typed; other numbers are rounded to 2 decimals. Anything
 * unparseable is sent as-is so the backend's validation message reaches the user.
 */
export function toAmountString(value) {
  const text = String(value ?? '').trim();
  if (/^\d+(\.\d{1,2})?$/.test(text)) return text;
  const number = Number(text);
  return text !== '' && Number.isFinite(number) ? number.toFixed(2) : text;
}

/** "First Last" from the parts that exist. */
export function fullName(first, last) {
  return [first, last].filter(Boolean).join(' ');
}

/**
 * Normalises a paged list response ({ total, limit, offset, data }) to
 * { items, total, limit, offset }, mapping each row with `mapItem`.
 */
export function toPage(body, mapItem) {
  const rows = Array.isArray(body?.data) ? body.data : [];
  return {
    items: rows.map(mapItem),
    total: toNumber(body?.total) ?? rows.length,
    limit: toNumber(body?.limit) ?? rows.length,
    offset: toNumber(body?.offset) ?? 0,
  };
}

/** Builds query params for list endpoints, leaving out empty values. */
export function listParams({ search, limit, offset } = {}) {
  const params = {};
  if (search && search.trim()) params.search = search.trim();
  if (limit !== undefined && limit !== null) params.limit = limit;
  if (offset !== undefined && offset !== null) params.offset = offset;
  return params;
}
