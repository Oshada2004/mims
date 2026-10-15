// Email sent with a transfer confirmation code.

const { formatAmount, maskAccount, escapeHtml } = require('./format');
const { formatBankDateTime } = require('../config/timezone');

/**
 * @param {{ code: string, amount: string|number, senderAccountNo: string, receiverAccountNo: string,
 *           expiresAt?: Date, bankName?: string, minutesValid?: number }} details
 * @returns {{ subject: string, text: string, html: string }}
 */
function transferCodeEmail({
  code,
  amount,
  senderAccountNo,
  receiverAccountNo,
  expiresAt,
  bankName = 'MIMS',
  minutesValid = 5
}) {
  // "valid for 5 minutes, until 15 Oct 2026, 12:46 (Sri Lanka time)"
  const validity = expiresAt
    ? `${minutesValid} minutes, until ${formatBankDateTime(expiresAt)}`
    : `${minutesValid} minutes`;
  const formattedAmount = formatAmount(amount);
  const from = maskAccount(senderAccountNo);
  const to = maskAccount(receiverAccountNo);

  const subject = `${bankName}: your transfer confirmation code`;

  const text = [
    `Your ${bankName} transfer confirmation code is: ${code}`,
    '',
    `Amount: ${formattedAmount}`,
    `From:   ${from}`,
    `To:     ${to}`,
    '',
    `This code is valid for ${validity}.`,
    `Never share this code with anyone, including ${bankName} staff. We will never ask you for it.`,
    '',
    'Did not request this transfer? Do not enter the code. Change your password and contact your',
    'branch straight away. Without the code, no money will be moved.'
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#fafafa;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-top:4px solid #f97316;border-radius:12px;">
      <tr><td style="padding:24px;">
        <p style="margin:0 0 4px;font-weight:700;">${escapeHtml(bankName)}</p>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Transfer confirmation</p>
        <p style="margin:0 0 8px;">Your confirmation code is:</p>
        <p style="margin:0 0 20px;font-size:32px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(code)}</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;font-size:14px;background:#fff7ed;border-radius:8px;">
          <tr><td style="padding:8px 12px;color:#6b7280;">Amount</td><td style="padding:8px 12px;font-weight:600;">${escapeHtml(formattedAmount)}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280;">From</td><td style="padding:8px 12px;">${escapeHtml(from)}</td></tr>
          <tr><td style="padding:8px 12px;color:#6b7280;">To</td><td style="padding:8px 12px;">${escapeHtml(to)}</td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:14px;">This code is valid for <strong>${escapeHtml(validity)}</strong>.</p>
        <p style="margin:0 0 16px;font-size:14px;"><strong>Never share this code</strong> with anyone, including ${escapeHtml(bankName)} staff. We will never ask you for it.</p>
        <p style="margin:0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
          Did not request this transfer? Do not enter the code. Change your password and contact your branch straight away.
          Without the code, no money will be moved.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

module.exports = { transferCodeEmail, maskAccount };
