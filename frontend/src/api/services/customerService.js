import client from '../client';
import { endpoints } from '../endpoints';

/** Body: adult customer's personal details (name, DOB, NIC, contact, address). */
export async function createAdult(data) {
  const response = await client.post(endpoints.customers.adult, data);
  return response.data;
}

/** Body: the minor's details plus the new guardian's personal details. */
export async function createMinorNewGuardian(data) {
  const response = await client.post(endpoints.customers.minorNewGuardian, data);
  return response.data;
}

/** Body: the minor's details plus the existing guardian's person id. */
export async function createMinorExistingGuardian(data) {
  const response = await client.post(endpoints.customers.minorExistingGuardian, data);
  return response.data;
}

/** No body. Lists the accounts held by the customer with this person id. */
export async function getCustomerAccounts(personId) {
  const response = await client.get(endpoints.customers.accounts(personId));
  return response.data;
}
