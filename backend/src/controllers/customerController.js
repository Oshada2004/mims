const pool = require('../config/db');

// Single step: Onboard Adult Customer
exports.createAdultCustomer = async (req, res) => {
  const {
    first_name, last_name, dob, phone_number, address, postal_code,
    nic, tax_id, agent_person_id, occupation, monthly_income
  } = req.body;

  try {
    const [rows] = await pool.query(
      `CALL sp_create_adult_customer(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name, last_name, dob, phone_number, address, postal_code,
        nic, tax_id || null, agent_person_id || null, occupation || null, monthly_income || 0.00
      ]
    );

    const personId = rows[0][0].person_id;
    res.status(201).json({
      message: 'Adult customer onboarded successfully',
      customer_person_id: personId
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
};

// Single step: Onboard Minor Customer with a NEW Guardian
exports.createMinorWithNewGuardian = async (req, res) => {
  const {
    minor_first_name, minor_last_name, minor_dob, minor_phone_number, minor_address, minor_postal_code, birth_cert_no,
    guardian_first_name, guardian_last_name, guardian_dob, guardian_nic, guardian_phone_number, guardian_address, guardian_postal_code,
    relation, agent_person_id
  } = req.body;

  try {
    const [rows] = await pool.query(
      `CALL sp_create_minor_with_new_guardian(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        minor_first_name, minor_last_name, minor_dob, minor_phone_number, minor_address, minor_postal_code, birth_cert_no,
        guardian_first_name, guardian_last_name, guardian_dob, guardian_nic, guardian_phone_number, guardian_address, guardian_postal_code,
        relation, agent_person_id || null
      ]
    );

    const result = rows[0][0];
    res.status(201).json({
      message: 'Minor customer and new guardian onboarded successfully',
      minor_person_id: result.minor_person_id,
      guardian_person_id: result.guardian_person_id
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
};

// Single step: Onboard Minor Customer linked to an existing Guardian by NIC
exports.createMinorWithExistingGuardian = async (req, res) => {
  const {
    minor_first_name, minor_last_name, minor_dob, minor_phone_number, minor_address, minor_postal_code, birth_cert_no,
    guardian_nic, relation, agent_person_id
  } = req.body;

  try {
    // Look up guardian by NIC using the stored procedure
    const [guardianRows] = await pool.query(`CALL sp_find_guardian_by_nic(?)`, [guardian_nic]);
    const guardian = guardianRows[0][0];

    if (!guardian) {
      return res.status(404).json({ error: 'Guardian NIC not found or person does not qualify as an adult guardian.' });
    }

    const [rows] = await pool.query(
      `CALL sp_create_minor_with_existing_guardian(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        minor_first_name, minor_last_name, minor_dob, minor_phone_number, minor_address, minor_postal_code,
        birth_cert_no, guardian.person_id, relation, agent_person_id || null
      ]
    );

    const result = rows[0][0];
    res.status(201).json({
      message: 'Minor customer onboarded with existing guardian successfully',
      minor_person_id: result.minor_person_id,
      guardian_person_id: result.guardian_person_id
    });
  } catch (error) {
    res.status(400).json({ error: error.sqlMessage || error.message });
  }
};

// Query active accounts by customer person_id
exports.getCustomerAccounts = async (req, res) => {
  const { personId } = req.params;
  try {
    const [rows] = await pool.query(`SELECT get_accounts_by_person_id(?) AS accounts`, [personId]);
    res.json({ accounts: rows[0].accounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};