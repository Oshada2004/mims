
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
    // Controllers use both spellings.
    req.user.personId = req.user.person_id;
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

// Passes if EITHER the login role (user_role) OR the staff role (staff_role) is listed,
// e.g. authorizeRoles('AGENT', 'ADMIN') admits agents (user_role STAFF) and admins.
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const { user_role: userRole, staff_role: staffRole } = req.user;

    if (!roles.includes(userRole) && !roles.includes(staffRole)) {
      return res.status(403).json({
        error: 'You do not have permission to perform this operation.'
      });
    }

    next();
  };
};

// Guards routes with an :accountNo param.
// CUSTOMER: must be a holder of the account, otherwise 404 (we don't reveal that it exists).
// Everyone else: with no roles given, any STAFF or ADMIN user; otherwise the same rule as authorizeRoles.
exports.requireAccountAccess = (...staffRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const { user_role: userRole, staff_role: staffRole, person_id: personId } = req.user;

    if (userRole === 'CUSTOMER') {
      try {
        const [rows] = await pool.query(
          `SELECT 1
             FROM ACCOUNT_HOLDER
            WHERE account_no = ?
              AND customer_person_id = ?
            LIMIT 1`,
          [req.params.accountNo, personId]
        );

        if (!rows.length) {
          return res.status(404).json({
            success: false,
            message: 'Account not found.'
          });
        }

        return next();
      } catch (error) {
        console.error('Account access check failed:', error.message);

        return res.status(500).json({
          error: 'Unable to verify account access.'
        });
      }
    }

    const allowed = staffRoles.length
      ? staffRoles.includes(userRole) || staffRoles.includes(staffRole)
      : userRole === 'STAFF' || userRole === 'ADMIN';

    if (!allowed) {
      return res.status(403).json({
        error: 'You do not have permission to perform this operation.'
      });
    }

    next();
  };
};