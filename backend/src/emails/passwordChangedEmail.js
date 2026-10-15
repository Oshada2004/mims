// Email sent after a user changes their password.

const { escapeHtml } = require('./format');
const { formatBankDateTime } = require('../config/timezone');

/**
 * @param {{ firstName?: string, changedAt?: Date, endedSessions?: number, bankName?: string }} details
 * @returns {{ subject: string, text: string, html: string }}
 */
function passwordChangedEmail({ firstName, changedAt = new Date(), endedSessions = 0, bankName = 'MIMS' }) {
  const when = formatBankDateTime(changedAt);
  const greeting = firstName ? `Hello ${firstName},` : 'Hello,';
  const sessionsLine = endedSessions > 0
    ? `For your safety we signed you out on ${endedSessions} other device${endedSessions === 1 ? '' : 's'}.`
    : '';

  const subject = `${bankName}: your password was changed`;

  const text = [
    greeting,
    '',
    `The password for your ${bankName} online banking login was changed on ${when}.`,
    sessionsLine,
    '',
    'If you made this change, you do not need to do anything.',
    'If you did not, contact your branch straight away so we can lock your login.'
  ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '').join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#fafafa;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-top:4px solid #f97316;border-radius:12px;">
      <tr><td style="padding:24px;">
        <p style="margin:0 0 4px;font-weight:700;">${escapeHtml(bankName)}</p>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Security notice</p>
        <p style="margin:0 0 12px;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 12px;">The password for your ${escapeHtml(bankName)} online banking login was changed on <strong>${escapeHtml(when)}</strong>.</p>
        ${sessionsLine ? `<p style="margin:0 0 12px;">${escapeHtml(sessionsLine)}</p>` : ''}
        <p style="margin:0 0 16px;">If you made this change, you do not need to do anything.</p>
        <p style="margin:0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
          Did not change your password? Contact your branch straight away so we can lock your login.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

module.exports = { passwordChangedEmail };
