import client from '../client';
import { endpoints } from '../endpoints';

/** No body. Query: due_by (YYYY-MM-DD, optional) — active FDs maturing by that date. */
export async function getActiveFds(dueBy) {
  const response = await client.get(endpoints.reports.activeFds, {
    params: dueBy ? { due_by: dueBy } : undefined,
  });
  return response.data;
}

/** No body. Query: limit, offset (both optional) — paginated history for one account. */
export async function getTransactionHistory(accountNo, { limit, offset } = {}) {
  const response = await client.get(endpoints.reports.transactions(accountNo), {
    params: { limit, offset },
  });
  return response.data;
}
