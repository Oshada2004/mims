export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
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