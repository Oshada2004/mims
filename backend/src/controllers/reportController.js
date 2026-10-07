const db = require('../config/db');

exports.getActiveFDReport = async (req, res, next) => {
    try {
        const [results] = await db.query(
            'CALL sp_get_active_fd_schedule(?)',
            [null]
        );
        const rows = results[0];
        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};