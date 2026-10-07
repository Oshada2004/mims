const db = require('../config/db');

const normalize = (value) => String(value || '').trim().toUpperCase();

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No authorization token/session ID provided.'
            });
        }

        const sessionId = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : authHeader.trim();

        if (!sessionId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization token format.'
            });
        }

        const [rows] = await db.query(
            `SELECT 
                s.session_id,
                s.person_id,
                s.expires_at,
                u.email,
                u.username,
                u.user_role,
                sp.staff_role,
                sp.branch_id
             FROM USER_SESSION s
             JOIN AUTH_USER u ON s.person_id = u.person_id
             LEFT JOIN STAFF_PROFILE sp ON s.person_id = sp.person_id
             WHERE s.session_id = ? 
               AND s.is_active = TRUE 
               AND s.expires_at > NOW()`,
            [sessionId]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired session. Please log in again.'
            });
        }

        const sessionUser = rows[0];

        req.user = {
            sessionId: sessionUser.session_id,
            personId: sessionUser.person_id,
            email: sessionUser.email,
            username: sessionUser.username,
            userRole: normalize(sessionUser.user_role),
            staffRole: normalize(sessionUser.staff_role),
            branchId: sessionUser.branch_id
        };

        next();
    } catch (error) {
        console.error('Error in verifyToken middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication verification.'
        });
    }
};

const authorizeRoles = (...allowedRoles) => {
    const normalizedAllowedRoles = allowedRoles.map(normalize);

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User is not authenticated.'
            });
        }

        const { userRole, staffRole } = req.user;

        const hasPermission =
            normalizedAllowedRoles.includes(userRole) ||
            (staffRole && normalizedAllowedRoles.includes(staffRole));

        if (!hasPermission) {
            const response = {
                success: false,
                message: 'Forbidden: You do not have permission to perform this action.'
            };

            if (process.env.NODE_ENV !== 'production') {
                response.requiredRoles = normalizedAllowedRoles;
            }

            return res.status(403).json(response);
        }

        next();
    };
};

const authorizeSelfForCustomer = (paramName = 'personId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User is not authenticated.'
            });
        }

        if (req.user.userRole === 'CUSTOMER' && !req.user.staffRole) {
            if (String(req.params[paramName]) !== String(req.user.personId)) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You can only access your own data.'
                });
            }
        }

        next();
    };
};

module.exports = {
    verifyToken,
    authorizeRoles,
    authorizeSelfForCustomer
};