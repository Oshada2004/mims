/**
 * Every backend path in one place, relative to VITE_API_URL (which already ends in /api).
 * Dynamic segments are functions so callers never build URLs by hand.
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
    // TODO: backend endpoint not implemented yet
    signup: '/auth/signup',
  },
  customers: {
    adult: '/customers/adult',
    minorNewGuardian: '/customers/minor/new-guardian',
    minorExistingGuardian: '/customers/minor/existing-guardian',
    accounts: (personId) => `/customers/${encodeURIComponent(personId)}/accounts`,
  },
  accounts: {
    root: '/accounts',
    byNumber: (accountNo) => `/accounts/${encodeURIComponent(accountNo)}`,
    jointHolder: (accountNo) => `/accounts/${encodeURIComponent(accountNo)}/joint-holder`,
    reactivate: (accountNo) => `/accounts/${encodeURIComponent(accountNo)}/reactivate`,
    close: (accountNo) => `/accounts/${encodeURIComponent(accountNo)}/close`,
  },
  fd: {
    open: '/fd/open',
    closeEarly: (id) => `/fd/${encodeURIComponent(id)}/close-early`,
  },
  transactions: {
    deposit: '/transactions/deposit',
    withdraw: '/transactions/withdraw',
  },
  reports: {
    activeFds: '/reports/active-fds',
    transactions: (accountNo) => `/reports/transactions/${encodeURIComponent(accountNo)}`,
  },
  staff: {
    root: '/staff',
  },
};
