const pool = require('../config/db');
const { sendMail, describeMailError } = require('../config/mailer');
const { passwordChangedEmail } = require('../emails/passwordChangedEmail');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function getSessionId(req) {
  return (
    req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.headers['x-session-id']
  );
}


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
  const sessionId = getSessionId(req);
  if (!sessionId) return res.status(401).json({ error: 'Session ID required' });

  try {
    const [rows] = await pool.query(
      'SELECT fn_get_profile_context(?) AS profile',
      [sessionId]
    );
    const profile = rows[0]?.profile;

    if (!profile) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    res.json({ user: typeof profile === 'string' ? JSON.parse(profile) : profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout
exports.logout = async (req, res) => {
  const sessionId = getSessionId(req);
  const clientIp = req.ip || '127.0.0.1';

  try {
    await pool.query(`CALL sp_logout_user(?, ?)`, [sessionId, clientIp]);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
};

async function sendPasswordChangedEmail({ to, firstName, endedSessions }) {
  const [[bank]] = await pool.query('SELECT bank_name FROM BANK_META_DATA ORDER BY bank_id LIMIT 1');
  const mail = passwordChangedEmail({
    firstName,
    endedSessions,
    changedAt: new Date(),
    bankName: bank?.bank_name || 'MIMS'
  });
  await sendMail({ to, ...mail });
}

// POST /api/auth/change-password { currentPassword, newPassword }
// Any logged-in user; identity and the session to keep come from req.user (verifySession).
exports.changePassword = async (req, res, next) => {
  const { personId, session_id: sessionId, email, first_name: firstName } = req.user;
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== 'string' || !currentPassword
      || typeof newPassword !== 'string' || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
  }
  if (currentPassword.length > 255) {
    return res.status(422).json({ success: false, message: 'The current password is incorrect.' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `The new password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`
    });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'The new password must be different from the current password.'
    });
  }

  let endedSessions = 0;
  try {
    const [results] = await pool.query(
      `CALL sp_change_password(?, ?, ?, ?, ?, @p_ended_sessions);
       SELECT @p_ended_sessions AS ended_sessions;`,
      [personId, sessionId, currentPassword, newPassword, req.ip || '']
    );
    endedSessions = Number(results[results.length - 1][0]?.ended_sessions) || 0;
  } catch (err) {
    if (err.sqlState === '45000') {
      return res.status(422).json({
        success: false,
        error: 'BusinessRuleViolation',
        message: err.sqlMessage || err.message
      });
    }
    if (err.sqlState === '45401') {
      return res.status(401).json({ error: 'Session is invalid or expired.' });
    }
    return next(err);
  }

  // The change is committed; the notice is best effort and never undoes it.
  if (email) {
    sendPasswordChangedEmail({ to: email, firstName, endedSessions }).catch((mailError) => {
      console.error(`Password changed email failed for person ${personId}: ${describeMailError(mailError)}`);
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Your password has been changed.',
    data: { endedSessions }
  });
};
