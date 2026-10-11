
const pool = require('../config/db');

exports.verifySession = async (req, res, next) => {
  const sessionId =
    req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
    req.headers['x-session-id'];

  if (!sessionId) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         s.session_id,
         s.person_id,
         u.username,
         u.email,
         u.user_role,
         p.first_name,
         p.last_name,
         sp.staff_role,
         sp.branch_id,
         sp.department,
         b.branch_name
       FROM USER_SESSION s
       JOIN AUTH_USER u ON u.person_id = s.person_id
       JOIN PERSON p ON p.person_id = s.person_id
       LEFT JOIN STAFF_PROFILE sp ON sp.person_id = s.person_id
       LEFT JOIN BRANCH b ON b.branch_id = sp.branch_id
       WHERE s.session_id = ?
         AND s.is_active = 1
         AND s.expires_at > NOW()
       LIMIT 1`,
      [sessionId]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: 'Session is invalid or expired.'
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    console.error('Session verification failed:', error.message);

    return res.status(500).json({
      error: 'Unable to verify your session.'
    });
  }
};

exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.user_role)) {
      return res.status(403).json({
        error: 'You do not have permission to perform this operation.'
      });
    }

    next();
  };
};

exports.verifyToken = exports.verifySession;

exports.authorizeRoles = (...roles) =>
  exports.requireRole(...roles);