import client from '../client';
import { endpoints } from '../endpoints';
import { fullName, listParams, toPage } from '../../utils/normalize';

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