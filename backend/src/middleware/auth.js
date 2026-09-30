const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET ;

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    //why we putting startswith because the token is sent in the format "Bearer <token>", so we need to 
    // check if the header starts with "Bearer " and then extract the token part.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { personId, username, role, staffRole, branchId }[cite: 1, 2]
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }
};

exports.authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthenticated user.' });
        }
        
        const effectiveRole = req.user.staffRole || req.user.role;
        if (!allowedRoles.includes(effectiveRole) && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Access denied. Requires one of: [${allowedRoles.join(', ')}]` 
            });
        }
        next();
    };
};