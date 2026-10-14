const pool = require('../config/db');
const { listPage } = require('../middleware/pagination');

const PUBLIC_METADATA_FIELDS = [
  'bank_id',
  'bank_name',
  'contact_email',
  'motto',
  'bank_start_time',
  'bank_close_time'
];

exports.getMetadata = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT fn_get_bank_metadata() AS bank'
    );
    const bank = rows[0]?.bank;

    if (!bank) {
      return res.status(404).json({ error: 'Bank metadata is not configured.' });
    }

    const metadata = typeof bank === 'string' ? JSON.parse(bank) : bank;
    const publicMetadata = Object.fromEntries(
      PUBLIC_METADATA_FIELDS.filter((field) => field in metadata).map((field) => [field, metadata[field]])
    );

    return res.json({ bank: publicMetadata });
  } catch (error) {
    return next(error);
  }
};

exports.listBranches = async (req, res, next) => {
  const { search, like } = req.pagination;

  try {
    const result = await listPage(
      pool,
      {
        select: 'branch_id, branch_name, district',
        from: 'BRANCH',
        where: "(? = '' OR branch_name LIKE ? OR district LIKE ?)",
        params: [search, like, like],
        orderBy: 'branch_id'
      },
      req.pagination
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

exports.listSavingsPlans = async (req, res, next) => {
  const { search, like } = req.pagination;

  try {
    const result = await listPage(
      pool,
      {
        select: `plan_code, plan_name, annual_interest_rate, min_balance,
                 min_age, max_age, allows_joint`,
        from: 'SAV_ACC_PLAN',
        where: "(? = '' OR plan_code LIKE ? OR plan_name LIKE ?)",
        params: [search, like, like],
        orderBy: 'min_age, plan_code'
      },
      req.pagination
    );

    result.data = result.data.map((plan) => ({ ...plan, allows_joint: Boolean(plan.allows_joint) }));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

exports.listFdPlans = async (req, res, next) => {
  const { search, like } = req.pagination;

  try {
    const result = await listPage(
      pool,
      {
        select: 'term_code, duration_months, annual_interest_rate',
        from: 'FD_ACC_PLAN',
        where: "(? = '' OR term_code LIKE ?)",
        params: [search, like],
        orderBy: 'duration_months'
      },
      req.pagination
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};