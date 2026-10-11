import client from '../client';
import { endpoints } from '../endpoints';

/** Body: the staff member's personal details, staff role, branch and login credentials. Admin only. */
export async function createStaff(data) {
  const response = await client.post(endpoints.staff.root, data);
  return response.data;
}
