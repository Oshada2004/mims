const BANK_TIMEZONE = process.env.BANK_TIMEZONE || '+05:30';

function offsetMinutes(offset) {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!match) {
    throw new Error(`BANK_TIMEZONE must look like +05:30, got "${offset}".`);
  }
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

const BANK_OFFSET_MINUTES = offsetMinutes(BANK_TIMEZONE);

function bankToday(now = new Date()) {
  return new Date(now.getTime() + BANK_OFFSET_MINUTES * 60 * 1000).toISOString().slice(0, 10);
}

module.exports = { BANK_TIMEZONE, bankToday };