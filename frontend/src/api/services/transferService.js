import client from '../client';
import { endpoints } from '../endpoints';
import { toAmountString, toNumber } from '../../utils/normalize';

// Customer account-to-account transfers, confirmed with a 6-digit code sent by email.
// Only account numbers, the amount and the code are sent; the backend takes the customer from the session.

function toChallenge(body) {
  const data = body?.data ?? {};
  return {
    challengeId: data.challengeId,
    maskedEmail: data.maskedEmail,
    expiresAt: data.expiresAt,
    // Seconds left as measured by the database; preferred over expiresAt for countdowns.
    expiresInSeconds: typeof data.expiresInSeconds === 'number' ? data.expiresInSeconds : null,
    message: body?.message,
  };
}

/** GET /transfers/recipient/:accountNo. Returns { accountNo, maskedName } of an ACTIVE account (404 otherwise). */
export async function recipientLookup(accountNo, { signal } = {}) {
  const { data } = await client.get(endpoints.transfers.recipient(String(accountNo).trim().toUpperCase()), {
    signal,
  });
  return { accountNo: data?.data?.accountNo, maskedName: data?.data?.maskedName };
}

/**
 * POST /transfers/initiate. Body: { senderAccountNo, receiverAccountNo, amount (string, ≤ 2 decimals), refText? }.
 * Validates the transfer and emails a code. Returns { challengeId, maskedEmail, expiresAt }.
 */
export async function initiate({ senderAccountNo, receiverAccountNo, amount, refText }) {
  const reference = refText?.trim();
  const { data } = await client.post(endpoints.transfers.initiate, {
    senderAccountNo,
    receiverAccountNo: String(receiverAccountNo).trim().toUpperCase(),
    amount: toAmountString(amount),
    ...(reference ? { refText: reference } : {}),
  });
  return toChallenge(data);
}

/** POST /transfers/resend. Body: { challengeId }. Emails a new code. Returns { challengeId, maskedEmail, expiresAt }. */
export async function resend(challengeId) {
  const { data } = await client.post(endpoints.transfers.resend, { challengeId });
  return toChallenge(data);
}

/** POST /transfers/confirm. Body: { challengeId, code }. Returns { txnId, senderBalanceAfter (number) }. */
export async function confirm(challengeId, code) {
  const { data } = await client.post(endpoints.transfers.confirm, { challengeId, code });
  return {
    txnId: data?.data?.txnId,
    senderBalanceAfter: toNumber(data?.data?.senderBalanceAfter),
    message: data?.message,
  };
}
