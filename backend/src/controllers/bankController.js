const pool = require('../config/db');

exports.getMetadata = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         bank_id,
         bank_name,
         daily_agent_withdrawal_limit,
         contact_email,
         motto,
         bank_start_time,
         bank_close_time
       FROM BANK_META_DATA
       ORDER BY bank_id
       LIMIT 1`
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bank metadata is not configured.' });
    }

    return res.json({ bank: rows[0] });
  } catch (error) {
    return next(error);
  }
};
