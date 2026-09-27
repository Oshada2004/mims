// Grants access if req.user's person_role OR staff_role matches one of allowedRoles.
// e.g. authorize('STAFF') lets in any staff member; authorize('MANAGER') restricts
// to staff whose staff_role is MANAGER. Must run after `authenticate`.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { person_role, staff_role } = req.user;
    const allowed = allowedRoles.includes(person_role) || allowedRoles.includes(staff_role);

    if (!allowed) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
}

module.exports = authorize;
