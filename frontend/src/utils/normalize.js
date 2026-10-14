export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toAmountString(value) {
  const text = String(value ?? '').trim();
  if (/^\d+(\.\d{1,2})?$/.test(text)) return text;
  const number = Number(text);
  return text !== '' && Number.isFinite(number) ? number.toFixed(2) : text;
}

export function fullName(first, last) {
  return [first, last].filter(Boolean).join(' ');
}

export function toPage(body, mapItem) {
  const rows = Array.isArray(body?.data) ? body.data : [];
  return {
    items: rows.map(mapItem),
    total: toNumber(body?.total) ?? rows.length,
    limit: toNumber(body?.limit) ?? rows.length,
    offset: toNumber(body?.offset) ?? 0,
  };
}

export function listParams({ search, limit, offset } = {}) {
  const params = {};
  if (search && search.trim()) params.search = search.trim();
  if (limit !== undefined && limit !== null) params.limit = limit;
  if (offset !== undefined && offset !== null) params.offset = offset;
  return params;
}