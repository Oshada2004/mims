const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'mims_super_secret_jwt_key_2026';

exports.login = async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const [results] = await db.query('CALL sp_authenticate_user(?)', [username]);
        const user = results[0][0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            {
                personId: user.person_id,
                username: user.username,
                role: user.user_role,
                staffRole: user.staff_role,
                branchId: user.branch_id
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.status(200).json({
            success: true,
            token,
            user: {
                personId: user.person_id,
                username: user.username,
                role: user.user_role,
                staffRole: user.staff_role
            }
        });
    } catch (err) {
        next(err);
    }
};