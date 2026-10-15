const BANK_TIMEZONE = process.env.BANK_TIMEZONE || '+05:30';
// IANA name of the bank's zone, for showing times to people (emails). Sri Lanka has no DST.
const BANK_TIME_ZONE_NAME = 'Asia/Colombo';

const bankDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BANK_TIME_ZONE_NAME,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

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

// "15 Oct 2026, 12:41 (Sri Lanka time)" whatever the server's own time zone is.
function formatBankDateTime(date = new Date()) {
  return `${bankDateTimeFormatter.format(new Date(date))} (Sri Lanka time)`;
}

module.exports = { BANK_TIMEZONE, BANK_TIME_ZONE_NAME, bankToday, formatBankDateTime };