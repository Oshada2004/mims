import client from '../client';
import { endpoints } from '../endpoints';

/** Body: { savingsAccountNo, termCode: '6M' | '1Y' | '3Y', principal }. */
export async function openFd(data) {
  const response = await client.post(endpoints.fd.open, data);
  return response.data;
}

/** No body. Closes the fixed deposit with this id before maturity. */
export async function closeFdEarly(id) {
  const response = await client.post(endpoints.fd.closeEarly(id));
  return response.data;
}
