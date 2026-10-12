import client from '../client';
import { endpoints } from '../endpoints';
import { fullName, listParams, toPage } from '../../utils/normalize';

/**
 * GET /staff?search=&limit=&offset= (admin). Search matches name, username, staff role or branch.
 * Returns a page of { personId, firstName, lastName, fullName, staffRole, department, branchId,
 *   branchName, username, email, userRole }.
 */
export async function listStaff(query = {}, { signal } = {}) {
  const { data } = await client.get(endpoints.staff.root, { params: listParams(query), signal });
  return toPage(data, (row) => ({
    personId: row.person_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: fullName(row.first_name, row.last_name),
    staffRole: row.staff_role,
    department: row.department,
    branchId: row.branch_id,
    branchName: row.branch_name,
    username: row.username,
    email: row.email,
    userRole: row.user_role,
  }));
}

/**
 * POST /staff (admin). Body: { first_name, last_name, dob (YYYY-MM-DD), nic, phone_number, address,
 * postal_code, email, username, password (8–128), staff_role ('MANAGER' | 'CASHIER' | 'OFFICER' |
 * 'AGENT' | 'ADMIN'), department ('OPERATIONS' | 'CREDIT' | 'IT' | 'CUSTOMER_SERVICE'), branch_id,
 * salary (string, ≤ 2 decimals) }. Returns { personId, username, staffRole, userRole, message }.
 */
export async function createStaff(body) {
  const { data } = await client.post(endpoints.staff.root, body);
  return {
    personId: data?.person_id,
    username: data?.username,
    staffRole: data?.staff_role,
    userRole: data?.user_role,
    message: data?.message,
  };
}
