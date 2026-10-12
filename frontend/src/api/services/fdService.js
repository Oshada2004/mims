import client from '../client';
import { endpoints } from '../endpoints';
import { toAmountString, toNumber } from '../../utils/normalize';

/**
 * POST /fd/open (agent). Body: { savingsAccountNo, termCode ('6M' | '1Y' | '3Y'), principal }.
 * Returns { fdId, accountNo, principal (number), termCode, message }.
 */
export async function openFd({ savingsAccountNo, termCode, principal }) {
  const { data } = await client.post(endpoints.fd.open, {
    savingsAccountNo: String(savingsAccountNo).trim(),
    termCode,
    principal: toAmountString(principal),
  });
  const result = data?.data ?? {};
  return {
    fdId: result.fdId,
    accountNo: result.linkedAccount,
    principal: toNumber(result.principal),
    termCode: result.termCode,
    message: data?.message,
  };
}

/** POST /fd/:fdId/close-early (agent). No body. Returns { message }. */
export async function closeFdEarly(fdId) {
  const { data } = await client.post(endpoints.fd.closeEarly(fdId));
  return { message: data?.message };
}
