import client from '../client';
import { endpoints } from '../endpoints';
import { fullName, listParams, toNumber, toPage } from '../../utils/normalize';

// The backend takes the registering agent from the session; never send it from the browser.
const SESSION_FIELDS = ['agent_person_id', 'agentPersonId', 'p_agent_person_id'];

function withoutSessionFields(body) {
  return Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => !SESSION_FIELDS.includes(key)));
}

/** The create procedures return their new ids as the first result set. */
function firstResultRow(body) {
  const result = body?.result;
  const firstSet = Array.isArray(result) ? result[0] : null;
  return Array.isArray(firstSet) ? (firstSet[0] ?? {}) : {};
}

function toCustomer(row) {
  return {
    personId: row.person_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: fullName(row.first_name, row.last_name),
    type: row.customer_type, // 'ADULT' | 'MINOR'
    nic: row.nic ?? null,
    birthCertNo: row.birth_cert_no ?? null,
    idNumber: row.nic ?? row.birth_cert_no ?? null,
    phone: row.phone_number,
    dob: row.dob,
    guardianPersonId: row.guardian_person_id ?? null,
  };
}

/**
 * GET /customers?search=&limit=&offset= (staff, admin). Search matches name, NIC, birth
 * certificate number or phone. Returns a page of customers.
 */
export async function listCustomers(query = {}, { signal } = {}) {
  const { data } = await client.get(endpoints.customers.list, { params: listParams(query), signal });
  return toPage(data, toCustomer);
}

/**
 * POST /customers/adult. Body: { first_name, last_name, dob (YYYY-MM-DD), phone_number, address,
 * postal_code, nic, tax_id?, occupation?, monthly_income? }. Returns { personId, message }.
 */
export async function createAdult(body) {
  const { data } = await client.post(endpoints.customers.adult, withoutSessionFields(body));
  return { personId: toNumber(firstResultRow(data).person_id), message: data?.message };
}

/**
 * POST /customers/minor/new-guardian. Body: { minor_first_name, minor_last_name, minor_dob,
 * minor_phone_number, minor_address, minor_postal_code, birth_cert_no, guardian_first_name,
 * guardian_last_name, guardian_dob, guardian_nic, guardian_phone_number, guardian_address,
 * guardian_postal_code, relation ('FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN') }.
 * Returns { personId (the minor), guardianPersonId, message }.
 */
export async function createMinorNewGuardian(body) {
  const { data } = await client.post(endpoints.customers.minorNewGuardian, withoutSessionFields(body));
  const row = firstResultRow(data);
  return {
    personId: toNumber(row.minor_person_id),
    guardianPersonId: toNumber(row.guardian_person_id),
    message: data?.message,
  };
}

/**
 * POST /customers/minor/existing-guardian. Body: { minor_first_name, minor_last_name, minor_dob,
 * minor_phone_number, minor_address, minor_postal_code, birth_cert_no, guardian_person_id, relation }.
 * Returns { personId (the minor), guardianPersonId, message }.
 */
export async function createMinorExistingGuardian(body) {
  const { data } = await client.post(endpoints.customers.minorExistingGuardian, withoutSessionFields(body));
  const row = firstResultRow(data);
  return {
    personId: toNumber(row.minor_person_id),
    guardianPersonId: toNumber(row.guardian_person_id),
    message: data?.message,
  };
}

/**
 * GET /customers/:personId/accounts. A customer may only ask for their own id.
 * Returns [{ accountNo, planCode, balance (number), status, holderRole }].
 */
export async function getCustomerAccounts(personId, { signal } = {}) {
  const { data } = await client.get(endpoints.customers.accounts(personId), { signal });
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  return accounts.map((row) => ({
    accountNo: row.account_no,
    planCode: row.plan_code,
    balance: toNumber(row.balance),
    status: row.status,
    holderRole: row.holder_role,
  }));
}
