const pool = require('../config/db');

// Public endpoint: only expose these fields (internal limits such as
// daily_agent_withdrawal_limit stay server-side).
const PUBLIC_METADATA_FIELDS = [
  'bank_id',
  'bank_name',
  'contact_email',
  'motto',
  'bank_start_time',
  'bank_close_time'
];

exports.getMetadata = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT fn_get_bank_metadata() AS bank'
    );
    const bank = rows[0]?.bank;

    if (!bank) {
      return res.status(404).json({ error: 'Bank metadata is not configured.' });
    }

    const metadata = typeof bank === 'string' ? JSON.parse(bank) : bank;
    const publicMetadata = Object.fromEntries(
      PUBLIC_METADATA_FIELDS.filter((field) => field in metadata).map((field) => [field, metadata[field]])
    );

    return res.json({ bank: publicMetadata });
  } catch (error) {
    return next(error);
  }
};
