const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const TOKEN_TTL = '8h';

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT ua.person_id, ua.username, ua.email, ua.password_hash,
              p.person_role, sp.staff_role
       FROM USER_ACCOUNT ua
       JOIN PERSON p ON p.person_id = ua.person_id
       LEFT JOIN STAFF_PROFILE sp ON sp.person_id = ua.person_id
       WHERE ua.username = ? OR ua.email = ?
       LIMIT 1`,
      [username, username]
    );

    const account = rows[0];
    if (!account) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, account.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      person_id: account.person_id,
      username: account.username,
      person_role: account.person_role,
      staff_role: account.staff_role || null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

    await db.query('UPDATE USER_ACCOUNT SET last_login_at = NOW() WHERE person_id = ?', [
      account.person_id,
    ]);
    await db.query(
      'INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip) VALUES (?, ?, ?)',
      [account.person_id, 'LOGIN', req.ip]
    );

    return res.json({ token, user: payload });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to log in' });
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = {
  login,
  me,
};
