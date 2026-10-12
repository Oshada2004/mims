import client from '../client';
import { endpoints } from '../endpoints';
import { listParams, toNumber, toPage } from '../../utils/normalize';

/**
 * @typedef {{ bankId: string, name: string, contactEmail: string, motto: string,
 *   openTime: string, closeTime: string }} BankMetadata
 */

/** GET /bank/metadata (public). Returns BankMetadata, or null if not configured. */
export async function getMetadata({ signal } = {}) {
  const { data } = await client.get(endpoints.bank.metadata, { signal });
  const bank = data?.bank;
  if (!bank) return null;
  return {
    bankId: bank.bank_id,
    name: bank.bank_name,
    contactEmail: bank.contact_email,
    motto: bank.motto,
    openTime: bank.bank_start_time,
    closeTime: bank.bank_close_time,
  };
}

/** GET /bank/branches?search=&limit=&offset=. Returns a page of { branchId, name, district }. */
export async function listBranches(query = {}, { signal } = {}) {
  const { data } = await client.get(endpoints.bank.branches, { params: listParams(query), signal });
  return toPage(data, (row) => ({
    branchId: row.branch_id,
    name: row.branch_name,
    district: row.district,
  }));
}

/**
 * GET /bank/savings-plans. Returns a page of
 * { code, name, interestRate, minBalance, minAge, maxAge, allowsJoint } (numbers, maxAge may be null).
 */
export async function listSavingsPlans(query = { limit: 100 }, { signal } = {}) {
  const { data } = await client.get(endpoints.bank.savingsPlans, { params: listParams(query), signal });
  return toPage(data, (row) => ({
    code: row.plan_code,
    name: row.plan_name,
    interestRate: toNumber(row.annual_interest_rate),
    minBalance: toNumber(row.min_balance),
    minAge: toNumber(row.min_age),
    maxAge: toNumber(row.max_age),
    allowsJoint: Boolean(row.allows_joint),
  }));
}

/** GET /bank/fd-plans. Returns a page of { termCode, months, interestRate }. */
export async function listFdPlans(query = { limit: 100 }, { signal } = {}) {
  const { data } = await client.get(endpoints.bank.fdPlans, { params: listParams(query), signal });
  return toPage(data, (row) => ({
    termCode: row.term_code,
    months: toNumber(row.duration_months),
    interestRate: toNumber(row.annual_interest_rate),
  }));
}
