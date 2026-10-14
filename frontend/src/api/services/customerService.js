import client from '../client';
import { endpoints } from '../endpoints';
import { fullName, listParams, toNumber, toPage } from '../../utils/normalize';

const SESSION_FIELDS = ['agent_person_id', 'agentPersonId', 'p_agent_person_id'];

function withoutSessionFields(body) {
    return Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => !SESSION_FIELDS.includes(key)));
}

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


export async function listCustomers(query = {}, { signal } = {}) {
    const { data } = await client.get(endpoints.customers.list, { params: listParams(query), signal });
    return toPage(data, toCustomer);
}


export async function createAdult(body) {
    const { data } = await client.post(endpoints.customers.adult, withoutSessionFields(body));
    return { personId: toNumber(firstResultRow(data).person_id), message: data?.message };
}


export async function createMinorNewGuardian(body) {
    const { data } = await client.post(endpoints.customers.minorNewGuardian, withoutSessionFields(body));
    const row = firstResultRow(data);
    return {
        personId: toNumber(row.minor_person_id),
        guardianPersonId: toNumber(row.guardian_person_id),
        message: data?.message,
    };
}


export async function createMinorExistingGuardian(body) {
    const { data } = await client.post(endpoints.customers.minorExistingGuardian, withoutSessionFields(body));
    const row = firstResultRow(data);
    return {
        personId: toNumber(row.minor_person_id),
        guardianPersonId: toNumber(row.guardian_person_id),
        message: data?.message,
    };
}


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