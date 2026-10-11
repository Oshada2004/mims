import client from '../client';
import { endpoints } from '../endpoints';

/** Body: { branchId, agentPersonId, customerId, planCode, initialDeposit }. */
export async function openAccount(data) {
  const response = await client.post(endpoints.accounts.root, data);
  return response.data;
}

/** No body. Returns the account with this account number. */
export async function getAccount(accountNo) {
  const response = await client.get(endpoints.accounts.byNumber(accountNo));
  return response.data;
}

/** Body: { coCustomerId }. Adds a joint holder to the account. */
export async function addJointHolder(accountNo, coCustomerId) {
  const response = await client.post(endpoints.accounts.jointHolder(accountNo), { coCustomerId });
  return response.data;
}

/** No body. Reactivates a dormant account. */
export async function reactivate(accountNo) {
  const response = await client.post(endpoints.accounts.reactivate(accountNo));
  return response.data;
}

/** No body. Closes the account. */
export async function close(accountNo) {
  const response = await client.post(endpoints.accounts.close(accountNo));
  return response.data;
}
