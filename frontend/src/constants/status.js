// Badge variant for each status coming from the backend
// (SAVINGS_ACCOUNT.status and FIXED_DEPOSIT.status).
export const STATUS_BADGE = {
  ACTIVE: 'success',
  DORMANT: 'warning',
  CLOSED: 'danger',
  MATURED: 'neutral',
  PREMATURELY_CLOSED: 'danger',
  SETTLED: 'neutral',
};

// Badge variant for each TRANSACTION_LOG.txn_type.
export const TXN_BADGE = {
  DEPOSIT: 'success',
  WITHDRAWAL: 'accent',
  SAVINGS_INTEREST: 'neutral',
  FD_INTEREST: 'neutral',
};

// Transaction types that reduce the savings balance (shown as negative amounts).
export const DEBIT_TYPES = ['WITHDRAWAL'];
