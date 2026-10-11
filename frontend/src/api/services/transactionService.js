import client from '../client';
import { endpoints } from '../endpoints';

/** Body: { accountNo, amount, refText }. */
export async function deposit(data) {
  const response = await client.post(endpoints.transactions.deposit, data);
  return response.data;
}

/** Body: { accountNo, amount, refText }. */
export async function withdraw(data) {
  const response = await client.post(endpoints.transactions.withdraw, data);
  return response.data;
}
