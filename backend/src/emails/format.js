// Helpers shared by the email templates.

const amountFormatter = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// 1500 -> "LKR 1,500.00"
function formatAmount(amount) {
  return `LKR ${amountFormatter.format(Number(amount))}`;
}

// "SA0361474564" -> "SA••••••4564": enough to recognise the account, not enough to reuse it.
function maskAccount(accountNo) {
  const text = String(accountNo || '');
  if (text.length <= 6) return text;
  return `${text.slice(0, 2)}${'•'.repeat(text.length - 6)}${text.slice(-4)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { formatAmount, maskAccount, escapeHtml };
