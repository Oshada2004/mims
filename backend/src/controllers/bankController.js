const pool = require('../config/db');

exports.getMetadata = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT fn_get_bank_metadata() AS bank'
    );
    const bank = rows[0]?.bank;

    if (!bank) {
      return res.status(404).json({ error: 'Bank metadata is not configured.' });
    }

    return res.json({ bank: typeof bank === 'string' ? JSON.parse(bank) : bank });
  } catch (error) {
    return next(error);
  }
};
