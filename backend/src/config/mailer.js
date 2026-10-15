const nodemailer = require('nodemailer');
require('dotenv').config();

// SMTP settings come from the environment. Locally they point at Mailpit (see .env.example).
const SMTP_HOST = process.env.SMTP_HOST || 'mailpit';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 1025;
const MAIL_FROM = process.env.MAIL_FROM || 'MIMS <no-reply@mims.local>';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  // Port 465 uses TLS from the start; other ports upgrade with STARTTLS when the server offers it.
  secure: SMTP_PORT === 465,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

// Sends one email. Rejects if the SMTP server does not accept it.
async function sendMail({ to, subject, text, html }) {
  return transporter.sendMail({ from: MAIL_FROM, to, subject, text, html });
}

module.exports = { sendMail, transporter };
