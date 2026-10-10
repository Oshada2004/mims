<<<<<<< HEAD
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
=======
const pool = require('../config/db');

// Register Credentials
exports.register = async (req, res) => {
  const { person_id, email, username, password, user_role } = req.body;
  try {
    await pool.query(
      `CALL sp_register_user_credentials(?, ?, ?, ?, ?)`,
      [person_id, email, username, password, user_role || 'CUSTOMER']
    );
    res.status(201).json({ message: 'User credentials created successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

  try {
    const [rows] = await pool.query(
      `CALL sp_authenticate_user(?, ?, ?, @p_session_id, @p_person_id, @p_user_role, @p_staff_role, @p_branch_id);
       SELECT @p_session_id AS session_id, @p_person_id AS person_id, @p_user_role AS user_role, @p_staff_role AS staff_role, @p_branch_id AS branch_id;`,
      [username, password, clientIp]
    );

    const authResult = rows[1][0];
    res.json({
      message: 'Login successful',
      session_id: authResult.session_id,
      user: {
        person_id: authResult.person_id,
        user_role: authResult.user_role,
        staff_role: authResult.staff_role,
        branch_id: authResult.branch_id
      }
    });
  } catch (error) {
    res.status(401).json({ error: error.sqlMessage || 'Authentication failed' });
  }
};

// Get Profile Context
exports.getProfile = async (req, res) => {
  const sessionId = req.headers['authorization'];
  if (!sessionId) return res.status(401).json({ error: 'Session ID required' });

  try {
    const [rows] = await pool.query(
      `SELECT
         au.person_id,
         au.email,
         au.username,
         au.user_role,
         p.first_name,
         p.last_name,
         sp.staff_role,
         sp.branch_id
       FROM USER_SESSION us
       JOIN AUTH_USER au ON au.person_id = us.person_id
       JOIN PERSON p ON p.person_id = au.person_id
       LEFT JOIN STAFF_PROFILE sp ON sp.person_id = au.person_id
       WHERE us.session_id = ?
         AND us.is_active = TRUE
         AND us.expires_at > NOW()
       LIMIT 1`,
      [sessionId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout
exports.logout = async (req, res) => {
  const sessionId = req.headers['authorization'];
  const clientIp = req.ip || '127.0.0.1';

  try {
    await pool.query(`CALL sp_logout_user(?, ?)`, [sessionId, clientIp]);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
>>>>>>> docker
};