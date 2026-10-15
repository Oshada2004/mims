// Sends one test email with the same mailer the API uses.
//   docker compose exec backend npm run mail:test -- someone@example.com
const path = require('path');

// In Docker the variables come from env_file; on the host, read the project's .env.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const to = (process.argv[2] || '').trim();
  if (!EMAIL_PATTERN.test(to)) {
    console.error('Usage: npm run mail:test -- someone@example.com');
    process.exit(2);
  }

  const { sendMail, describeMailError, describeTransport } = require('../src/config/mailer');
  const sentAt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date());

  console.log(`Sending a test email to ${to} via ${describeTransport()}...`);
  try {
    const info = await sendMail({
      to,
      subject: 'MIMS test email',
      text: `This is a test email from MIMS, sent ${sentAt} (Sri Lanka time).\nIf you can read this, email delivery works.`,
      html: `<p>This is a test email from MIMS, sent ${sentAt} (Sri Lanka time).</p><p>If you can read this, email delivery works.</p>`
    });
    console.log(`Sent. Message id: ${info.messageId || '(none returned)'}. Check the inbox and the spam folder.`);
  } catch (error) {
    console.error(`Failed: ${describeMailError(error)}`);
    process.exit(1);
  }
}

main();
