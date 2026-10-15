
export const STATUS_BADGE = {
    ACTIVE: 'success',
    DORMANT: 'warning',
    CLOSED: 'danger',
    MATURED: 'neutral',
    PREMATURELY_CLOSED: 'danger',
    SETTLED: 'neutral',
};



export const TXN_BADGE = {
    DEPOSIT: 'success',
    WITHDRAWAL: 'accent',
    SAVINGS_INTEREST: 'neutral',
    FD_INTEREST: 'neutral',
    FD_FUNDING: 'accent',
    FD_PRINCIPAL_RETURN: 'success',
    TRANSFER_IN: 'success',
    TRANSFER_OUT: 'accent',
};

// How each transaction type is shown in history tables.
export const TXN_LABELS = {
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    FD_FUNDING: 'FD funding',
    FD_PRINCIPAL_RETURN: 'FD principal returned',
    SAVINGS_INTEREST: 'Savings interest',
    FD_INTEREST: 'FD interest',
    TRANSFER_IN: 'Transfer in',
    TRANSFER_OUT: 'Transfer out',
};

// Fallback when a row has no direction from the API: types that reduce the savings balance.
export const DEBIT_TYPES = ['WITHDRAWAL', 'FD_FUNDING', 'TRANSFER_OUT'];
