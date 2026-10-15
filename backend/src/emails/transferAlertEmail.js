// Alert sent after a completed transfer: "you sent" to the sender, "you received" to receivers.

const { formatAmount, maskAccount, escapeHtml } = require('./format');
const { formatBankDateTime } = require('../config/timezone');

/**
 * @param {{ direction: 'SENT'|'RECEIVED', firstName?: string, amount: string|number,
 *           senderAccountNo: string, receiverAccountNo: string, txnId: string|number,
 *           completedAt: Date, bankName?: string }} details
 * @returns {{ subject: string, text: string, html: string }}
 */
function transferAlertEmail({
  direction,
  firstName,
  amount,
  senderAccountNo,
  receiverAccountNo,
  txnId,
  completedAt,
  bankName = 'MIMS'
}) {
  const sent = direction === 'SENT';
  const formattedAmount = formatAmount(amount);
  const from = maskAccount(senderAccountNo);
  const to = maskAccount(receiverAccountNo);
  const when = formatBankDateTime(completedAt);
  const greeting = firstName ? `Hello ${firstName},` : 'Hello,';
  const summary = sent
    ? `You sent ${formattedAmount} from ${from} to ${to}.`
    : `You received ${formattedAmount} in ${to} from ${from}.`;

  const subject = sent
    ? `${bankName}: you sent ${formattedAmount}`
    : `${bankName}: you received ${formattedAmount}`;

  const text = [
    greeting,
    '',
    summary,
    '',
    `Amount:      ${formattedAmount}`,
    `From:        ${from}`,
    `To:          ${to}`,
    `Date/time:   ${when}`,
    `Transaction: #${txnId}`,
    '',
    sent
      ? 'Did not make this transfer? Change your password and contact your branch straight away.'
      : 'You can see this transfer in your transaction history.',
    'You can turn these alerts off in Settings.'
  ].join('\n');

  const rows = [
    ['Amount', formattedAmount],
    ['From', from],
    ['To', to],
    ['Date/time', when],
    ['Transaction', `#${txnId}`]
  ]
    .map(([label, value]) => `<tr><td style="padding:8px 12px;color:#6b7280;">${label}</td><td style="padding:8px 12px;${label === 'Amount' ? 'font-weight:600;' : ''}">${escapeHtml(value)}</td></tr>`)
    .join('\n          ');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#fafafa;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-top:4px solid #f97316;border-radius:12px;">
      <tr><td style="padding:24px;">
        <p style="margin:0 0 4px;font-weight:700;">${escapeHtml(bankName)}</p>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">${sent ? 'Money sent' : 'Money received'}</p>
        <p style="margin:0 0 12px;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 16px;">${escapeHtml(summary)}</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;font-size:14px;background:#fff7ed;border-radius:8px;">
          ${rows}
        </table>
        <p style="margin:0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
          ${sent
    ? 'Did not make this transfer? Change your password and contact your branch straight away.'
    : 'You can see this transfer in your transaction history.'}
          You can turn these alerts off in Settings.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

module.exports = { transferAlertEmail };
