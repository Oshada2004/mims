const pool = require('../config/db');
const { listPage } = require('../middleware/pagination');

// Allowed values
const STAFF_ROLES = ['MANAGER', 'CASHIER', 'OFFICER', 'AGENT', 'ADMIN'];
const DEPARTMENTS = ['OPERATIONS', 'CREDIT', 'IT', 'CUSTOMER_SERVICE'];

// Maximum lengths of fields.
// Checking them here stops MySQL from rejecting the data halfway.
const TEXT_FIELDS = {
    first_name: 100,
    last_name: 100,
    nic: 12,
    phone_number: 12,
    address: 100,
    postal_code: 6,
    email: 50,
    username: 50
};

// Turns a field into text. Numbers are turned into strings and anything else is turned into null.
function readText(value) {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return null;
}

// Checks if the date is in correct date form Y-M-D.
function isValidDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(text + 'T00:00:00Z');
    return !isNaN(date) && date.toISOString().slice(0, 10) === text;
}

// Checks everything before touching the database and returns error or message if something goes wrong.
function validateStaffInput(body) {
    const data = {};

    for (const [field, maxLength] of Object.entries(TEXT_FIELDS)) {
        const text = readText(body[field]);
        if (!text) {
            return { error: `${field} is required.` };
        }
        if (text.length > maxLength) {
            return { error: `${field} must be at most ${maxLength} characters.` };
        }
        data[field] = text;
    }

    const dob = readText(body.dob);
    if (!dob || !isValidDate(dob)) {
        return { error: 'dob must be a valid date in YYYY-MM-DD format.' };
    }
    data.dob = dob;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return { error: 'email must be a valid email address.' };
    }

    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) {
        return { error: 'password must be between 8 and 128 characters.' };
    }
    data.password = body.password;

    if (!STAFF_ROLES.includes(body.staff_role)) {
        return { error: `staff_role must be one of: ${STAFF_ROLES.join(', ')}.` };
    }
    data.staff_role = body.staff_role;

    if (!DEPARTMENTS.includes(body.department)) {
        return { error: `department must be one of: ${DEPARTMENTS.join(', ')}.` };
    }
    data.department = body.department;

    const branchId = Number(body.branch_id);
    if (!Number.isInteger(branchId) || branchId <= 0) {
        return { error: 'branch_id must be a positive whole number.' };
    }
    data.branch_id = branchId;

    // Check if salary matches the format.
    const salaryText = readText(body.salary);
    if (!salaryText || !/^\d{1,10}(\.\d{1,2})?$/.test(salaryText)) {
        return { error: 'salary must be a non-negative number with at most two decimal places.' };
    }
    data.salary = salaryText;

    return { data };
}

// Handles database errors and sends necessary response.
// Anything unexpected goes to the error handler as 500 error.
function handleDatabaseError(error, res, next) {
    if (error.sqlState === '45000') {
        return res.status(422).json({ error: error.sqlMessage });
    }

    if (error.code === 'ER_DUP_ENTRY') {
        const message = error.sqlMessage || '';
        let field = 'A record with these details';
        if (message.includes('uq_person_nic')) field = 'That NIC';
        else if (message.includes('uq_user_email')) field = 'That email';
        else if (message.includes('uq_user_username')) field = 'That username';
        return res.status(409).json({ error: `${field} is already registered.` });
    }

    // The only foreign key the request controls is the branch.
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: 'That branch does not exist.' });
    }

    return next(error);
}

// Creates the staff members person and staff profile rows, then their login.
exports.createStaff = async (req, res, next) => {
    const { error, data } = validateStaffInput(req.body || {});
    if (error) {
        return res.status(400).json({ error });
    }

    // A staff ADMIN is also taken as a system admin, so they can use admin only routes.
    // Everyone else logs in as STAFF.
    const userRole = data.staff_role === 'ADMIN' ? 'ADMIN' : 'STAFF';

    // Check the login details first, so we don't create a staff member
    try {
        const [existing] = await pool.query(
            'SELECT person_id FROM AUTH_USER WHERE username = ? OR email = ? LIMIT 1',
            [data.username, data.email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'That username or email is already registered.' });
        }

        // This creates PERSON and STAFF_PROFILE and commits them itself.
        const [procedureResult] = await pool.query(
            'CALL sp_create_staff(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                data.first_name,
                data.last_name,
                data.dob,
                data.nic,
                data.phone_number,
                data.address,
                data.postal_code,
                data.staff_role,
                data.branch_id,
                data.department,
                data.salary
            ]
        );

        const personId = procedureResult?.[0]?.[0]?.person_id;
        if (!personId) {
            throw new Error('sp_create_staff did not return a person_id.');
        }

// Create the login. The procedure has already committed, so if this fails we delete the person we just made. Deleting PERSON also removes the
// STAFF_PROFILE row. Without this, a staff member would be left with no login, and retrying would fail on "NIC already exists".
        try {
            await pool.query(
                `INSERT INTO AUTH_USER (person_id, email, username, password_hash, user_role)
                 VALUES (?, ?, ?, SHA2(?, 256), ?)`,
                [personId, data.email, data.username, data.password, userRole]
            );
        } catch (loginError) {
            try {
                await pool.query('DELETE FROM PERSON WHERE person_id = ?', [personId]);
            } catch (cleanupError) {
                console.error(`Could not remove half-created staff member ${personId}:`, cleanupError);
            }
            throw loginError;
        }

        return res.status(201).json({
            message: 'Staff member and login created successfully.',
            person_id: personId,
            username: data.username,
            staff_role: data.staff_role,
            user_role: userRole
        });
    } catch (err) {
        return handleDatabaseError(err, res, next);
    }
};

// GET /api/staff?search=&limit=&offset=
// Staff members with their branch and login name. Never returns salary, password hashes or sessions.
exports.listStaff = async (req, res, next) => {
  const { search, like } = req.pagination;

  try {
    const result = await listPage(
      pool,
      {
        select: `sp.person_id, p.first_name, p.last_name, sp.staff_role, sp.department,
                 sp.branch_id, b.branch_name, u.username, u.email, u.user_role`,
        from: `STAFF_PROFILE sp
               JOIN PERSON p ON p.person_id = sp.person_id
               JOIN BRANCH b ON b.branch_id = sp.branch_id
               LEFT JOIN AUTH_USER u ON u.person_id = sp.person_id`,
        where: `(? = ''
                 OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?
                 OR u.username LIKE ?
                 OR sp.staff_role LIKE ?
                 OR b.branch_name LIKE ?)`,
        params: [search, like, like, like, like],
        orderBy: 'p.last_name, p.first_name, sp.person_id'
      },
      req.pagination
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};