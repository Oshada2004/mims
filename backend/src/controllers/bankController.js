const db = require('../config/db');

exports.getMetadata = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT bank_name, motto, contact_email
       FROM BANK_META_DATA
       ORDER BY bank_id
       LIMIT 1`
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bank metadata is not configured.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
};
