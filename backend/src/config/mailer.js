const nodemailer = require('nodemailer');
require('dotenv').config();

// Two ways to send email, chosen by MAIL_TRANSPORT:
//   smtp (default) - any SMTP server: Mailpit locally (no auth), or Gmail with an App Password.
//   http           - Brevo's HTTP API (https://api.brevo.com), for hosts that block SMTP ports.
// See README "Sending real emails". Credentials are never logged.

const MAIL_TRANSPORT = (process.env.MAIL_TRANSPORT || 'smtp').trim().toLowerCase();
const MAIL_FROM = process.env.MAIL_FROM || 'MIMS <no-reply@mims.local>';

const SMTP_HOST = process.env.SMTP_HOST || 'mailpit';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 1025;
// Port 465 uses TLS from the start; other ports (587, 1025) upgrade with STARTTLS when offered.
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE.trim().toLowerCase() === 'true'
  : SMTP_PORT === 465;

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_ACCOUNT_URL = 'https://api.brevo.com/v3/account';
const HTTP_TIMEOUT_MS = 15000;

if (!['smtp', 'http'].includes(MAIL_TRANSPORT)) {
  throw new Error(`MAIL_TRANSPORT must be "smtp" or "http", got "${MAIL_TRANSPORT}".`);
}

const transporter = MAIL_TRANSPORT === 'smtp'
  ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  })
  : null;

// "MIMS Bank <alerts@example.com>" -> { name: 'MIMS Bank', email: 'alerts@example.com' }
function parseAddress(address) {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(address);
  if (match) return { name: match[1].trim() || undefined, email: match[2].trim() };
  return { email: address.trim() };
}

// An error from the HTTP provider, shaped like nodemailer's (code + responseCode + response).
class MailProviderError extends Error {
  constructor(message, { code, responseCode, response } = {}) {
    super(message);
    this.name = 'MailProviderError';
    this.code = code;
    this.responseCode = responseCode;
    this.response = response;
  }
}

async function brevoRequest(url, options = {}) {
  if (!process.env.MAIL_API_KEY) {
    throw new MailProviderError('MAIL_API_KEY is not set.', { code: 'ECONFIG' });
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.MAIL_API_KEY
      },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    throw new MailProviderError(
      timedOut ? `Connection timeout after ${HTTP_TIMEOUT_MS} ms` : (error.cause?.message || error.message),
      { code: timedOut ? 'ETIMEDOUT' : (error.cause?.code || 'ECONNECTION') }
    );
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Brevo errors look like { code: 'unauthorized', message: 'Key not found' }.
    throw new MailProviderError(body.message || `HTTP ${response.status}`, {
      code: body.code || 'EPROVIDER',
      responseCode: response.status
    });
  }
  return body;
}

async function sendWithBrevo({ to, subject, text, html }) {
  const body = await brevoRequest(BREVO_SEND_URL, {
    method: 'POST',
    body: JSON.stringify({
      sender: parseAddress(MAIL_FROM),
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    })
  });
  return { messageId: body.messageId };
}

// Sends one email. Rejects if the server/provider does not accept it.
async function sendMail({ to, subject, text, html }) {
  if (MAIL_TRANSPORT === 'http') {
    return sendWithBrevo({ to, subject, text, html });
  }
  return transporter.sendMail({ from: MAIL_FROM, to, subject, text, html });
}

// Where mail goes, without credentials: "smtp smtp.gmail.com:465 (TLS)" or "http Brevo API".
function describeTransport() {
  if (MAIL_TRANSPORT === 'http') return 'http Brevo API';
  return `smtp ${SMTP_HOST}:${SMTP_PORT}${SMTP_SECURE ? ' (TLS)' : ''}`;
}

// One line for logs: the provider's error code and message, e.g.
// "EAUTH 535 Invalid login: 535-5.7.8 Username and Password not accepted".
// Contains no message content (codes) and no credentials.
function describeMailError(error) {
  const parts = [];
  if (error.code) parts.push(error.code);
  if (error.responseCode) parts.push(error.responseCode);
  parts.push(String(error.message || error).replace(/\s+/g, ' ').trim());
  return parts.join(' ');
}

// Checks the connection/credentials once and logs one line. Never throws.
async function verifyMailer() {
  try {
    if (MAIL_TRANSPORT === 'http') {
      await brevoRequest(BREVO_ACCOUNT_URL, { method: 'GET' });
    } else {
      await transporter.verify();
    }
    console.log(`Mail: ready (${describeTransport()}, from ${parseAddress(MAIL_FROM).email}).`);
    return true;
  } catch (error) {
    console.error(`Mail: NOT ready (${describeTransport()}): ${describeMailError(error)}`);
    return false;
  }
}

module.exports = { sendMail, verifyMailer, describeMailError, describeTransport };
