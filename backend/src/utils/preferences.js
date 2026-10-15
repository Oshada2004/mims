const db = require('../config/db');

// USER_PREFERENCES: a missing row means these defaults.
const THEMES = ['LIGHT', 'DARK', 'SYSTEM'];
const DEFAULT_PREFERENCES = Object.freeze({ theme: 'SYSTEM', emailTxnAlerts: true });

function toPreferences(row) {
  if (!row) return { ...DEFAULT_PREFERENCES };
  return { theme: row.theme, emailTxnAlerts: Boolean(row.email_txn_alerts) };
}

async function readPreferences(personId) {
  const [rows] = await db.query(
    'SELECT theme, email_txn_alerts FROM USER_PREFERENCES WHERE person_id = ?',
    [personId]
  );
  return toPreferences(rows[0]);
}

// Validates a { theme, emailTxnAlerts } body; both fields are required.
// Returns { value } or { error } with a message for the client.
function parsePreferences(body) {
  const theme = typeof body?.theme === 'string' ? body.theme.trim().toUpperCase() : '';
  if (!THEMES.includes(theme)) {
    return { error: `theme must be one of ${THEMES.join(', ')}.` };
  }
  if (typeof body?.emailTxnAlerts !== 'boolean') {
    return { error: 'emailTxnAlerts must be true or false.' };
  }
  return { value: { theme, emailTxnAlerts: body.emailTxnAlerts } };
}

async function savePreferences(personId, { theme, emailTxnAlerts }) {
  await db.query(
    `INSERT INTO USER_PREFERENCES (person_id, theme, email_txn_alerts)
     VALUES (?, ?, ?) AS new_values
     ON DUPLICATE KEY UPDATE
       theme = new_values.theme,
       email_txn_alerts = new_values.email_txn_alerts`,
    [personId, theme, emailTxnAlerts]
  );
  return readPreferences(personId);
}

module.exports = { DEFAULT_PREFERENCES, readPreferences, parsePreferences, savePreferences };
