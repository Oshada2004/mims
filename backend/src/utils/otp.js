const crypto = require('crypto');

const MIN_SECRET_LENGTH = 32;

// Throws at startup if OTP_SECRET is missing or too short, so codes are never hashed with a weak key.
function assertOtpConfig() {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new Error(
      'OTP_SECRET is not set. Add a long random value to .env, e.g. the output of: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`OTP_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`);
  }
}

// A 6-digit code from a cryptographically secure source; leading zeros are kept ("004213").
function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// HMAC-SHA256 over challengeId + code, keyed with OTP_SECRET, as 64 lowercase hex characters.
// Only this hash is stored; the code itself is never stored or logged.
function hashCode(challengeId, code) {
  assertOtpConfig();
  return crypto
    .createHmac('sha256', process.env.OTP_SECRET)
    .update(`${challengeId}${code}`)
    .digest('hex');
}

module.exports = { assertOtpConfig, generateCode, hashCode };
