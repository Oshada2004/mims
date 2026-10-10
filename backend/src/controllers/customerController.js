
const pool = require('../config/db');

const CUSTOMER_PROCEDURES = {
  adult: 'sp_create_adult_customer',
  minorNewGuardian: 'sp_create_minor_with_new_guardian',
  minorExistingGuardian: 'sp_create_minor_with_existing_guardian'
};

// Normalize SQL parameter names and JSON keys.
// Example: p_first_name -> firstname
function normalizeKey(value) {
  return String(value)
    .replace(/^(p|in|input)_/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

// Flatten nested request bodies, such as { guardian: { first_name: "..." } }.
function flattenObject(value, prefix = '', result = {}) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    if (prefix) result[prefix] = value;
    return result;
  }

  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}_${key}` : key;

    if (
      item !== null &&
      typeof item === 'object' &&
      !Array.isArray(item)
    ) {
      flattenObject(item, path, result);
    } else {
      result[path] = item;
    }
  }

  return result;
}

// ignoring underscores, capitalization, and common prefixes.
async function callCustomerProcedure(procedureName, body) {
  const [parameters] = await pool.query(
    `SELECT PARAMETER_NAME, PARAMETER_MODE, ORDINAL_POSITION
       FROM INFORMATION_SCHEMA.PARAMETERS
      WHERE SPECIFIC_SCHEMA = DATABASE()
        AND SPECIFIC_NAME = ?
        AND ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ORDINAL_POSITION`,
    [procedureName]
  );

  if (parameters.length === 0) {
    throw new Error(
      `Stored procedure "${procedureName}" was not found, or its parameters are not visible.`
    );
  }

  const inputParameters = parameters.filter(
    (parameter) =>
      parameter.PARAMETER_MODE === 'IN' ||
      parameter.PARAMETER_MODE === 'INOUT'
  );

  const suppliedValues = flattenObject(body);
  const normalizedValues = new Map();

  for (const [key, value] of Object.entries(suppliedValues)) {
    normalizedValues.set(normalizeKey(key), value);
  }

  const values = [];

  for (const parameter of inputParameters) {
    const key = normalizeKey(parameter.PARAMETER_NAME);

    if (!normalizedValues.has(key)) {
      throw new Error(
        `Missing request field for stored procedure parameter "${parameter.PARAMETER_NAME}".`
      );
    }

    values.push(normalizedValues.get(key));
  }

  const placeholders = inputParameters.map(() => '?').join(', ');
  const sql = `CALL ${procedureName}(${placeholders})`;

  const [result] = await pool.query(sql, values);

  return result;
}

function handleControllerError(res, error, operation) {
  console.error(`${operation} failed:`, error.message);

  if (
    error.message.startsWith('Missing request field') ||
    error.message.includes('was not found')
  ) {
    return res.status(400).json({
      error: error.message
    });
  }

  return res.status(500).json({
    error: `Unable to ${operation.toLowerCase()}.`
  });
}

// POST /api/customers/adult
exports.createAdultCustomer = async (req, res) => {
  try {
    const result = await callCustomerProcedure(
      CUSTOMER_PROCEDURES.adult,
      req.body
    );

    return res.status(201).json({
      message: 'Adult customer registration request completed.',
      result
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      'Register adult customer'
    );
  }
};

// POST /api/customers/minor/new-guardian
exports.createMinorWithNewGuardian = async (req, res) => {
  try {
    const result = await callCustomerProcedure(
      CUSTOMER_PROCEDURES.minorNewGuardian,
      req.body
    );

    return res.status(201).json({
      message: 'Minor customer registration request completed.',
      result
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      'Register minor with new guardian'
    );
  }
};

// POST /api/customers/minor/existing-guardian
exports.createMinorWithExistingGuardian = async (req, res) => {
  try {
    const result = await callCustomerProcedure(
      CUSTOMER_PROCEDURES.minorExistingGuardian,
      req.body
    );

    return res.status(201).json({
      message: 'Minor customer registration request completed.',
      result
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      'Register minor with existing guardian'
    );
  }
};

// GET /api/customers/:personId/accounts
exports.getCustomerAccounts = async (req, res) => {
  const requestedPersonId = Number(req.params.personId);
  const authenticatedPersonId = Number(req.user.person_id);

  if (
    !Number.isSafeInteger(requestedPersonId) ||
    requestedPersonId <= 0
  ) {
    return res.status(400).json({
      error: 'A valid customer ID is required.'
    });
  }

  if (
    req.user.user_role === 'CUSTOMER' &&
    requestedPersonId !== authenticatedPersonId
  ) {
    return res.status(403).json({
      error: 'You can only access your own accounts.'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT get_accounts_by_person_id(?) AS accounts',
      [requestedPersonId]
    );

    let accounts = rows[0]?.accounts ?? [];

    if (typeof accounts === 'string') {
      try {
        accounts = JSON.parse(accounts);
      } catch {
      }
    }

    return res.json({ accounts });
  } catch (error) {
    console.error(
      'Customer account lookup failed:',
      error.message
    );

    return res.status(500).json({
      error: 'Unable to retrieve customer accounts.'
    });
  }
};