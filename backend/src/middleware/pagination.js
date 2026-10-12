// Parses ?limit, ?offset and ?search for list endpoints and stores them on req.pagination.
// limit: 1..100 (default 20), offset: 0 or more (default 0), search: trimmed, max 100 chars.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;

function readWholeNumber(value, defaultValue) {
  if (value === undefined || value === '') return defaultValue;
  return /^\d+$/.test(String(value)) ? Number(value) : NaN;
}

// Escapes LIKE wildcards so a search for "50%" matches the literal text.
function toLikePattern(search) {
  return `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

exports.paginate = (req, res, next) => {
  const limit = readWholeNumber(req.query.limit, DEFAULT_LIMIT);
  const offset = readWholeNumber(req.query.offset, 0);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return res.status(400).json({
      success: false,
      message: `limit must be a whole number from 1 to ${MAX_LIMIT}.`
    });
  }

  if (!Number.isInteger(offset)) {
    return res.status(400).json({
      success: false,
      message: 'offset must be a whole number of 0 or more.'
    });
  }

  if (search.length > MAX_SEARCH_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `search must be at most ${MAX_SEARCH_LENGTH} characters.`
    });
  }

  req.pagination = { limit, offset, search, like: toLikePattern(search) };
  next();
};

// Runs a COUNT query and a page query that share the same FROM/WHERE clause,
// and returns the standard list payload { success, total, limit, offset, data }.
exports.listPage = async (db, { select, from, where = '1 = 1', params = [], orderBy }, pagination) => {
  const { limit, offset } = pagination;

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM ${from} WHERE ${where}`,
    params
  );

  const [rows] = await db.query(
    `SELECT ${select} FROM ${from} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { success: true, total, limit, offset, data: rows };
};
