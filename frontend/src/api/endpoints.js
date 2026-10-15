const segment = (value) => encodeURIComponent(value);

export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
    changePassword: '/auth/change-password',
 
    signup: '/auth/signup',
  },
  bank: {
    metadata: '/bank/metadata', 
    branches: '/bank/branches',
    savingsPlans: '/bank/savings-plans',
    fdPlans: '/bank/fd-plans',
  },
  customers: {
    list: '/customers', 
    adult: '/customers/adult',
    minorNewGuardian: '/customers/minor/new-guardian',
    minorExistingGuardian: '/customers/minor/existing-guardian',
    accounts: (personId) => `/customers/${segment(personId)}/accounts`,
  },
  accounts: {
    root: '/accounts',
    byNumber: (accountNo) => `/accounts/${segment(accountNo)}`,
    jointHolder: (accountNo) => `/accounts/${segment(accountNo)}/joint-holder`,
    reactivate: (accountNo) => `/accounts/${segment(accountNo)}/reactivate`,
    close: (accountNo) => `/accounts/${segment(accountNo)}/close`,
  },
  fd: {
    open: '/fd/open',
    closeEarly: (fdId) => `/fd/${segment(fdId)}/close-early`,
  },
  transactions: {
    deposit: '/transactions/deposit',
    withdraw: '/transactions/withdraw',
  },
  reports: {
    activeFds: '/reports/active-fds', 
    transactions: (accountNo) => `/reports/transactions/${segment(accountNo)}`, 
    accountSummary: '/reports/account-summary', 
    interestDistribution: '/reports/interest-distribution', 
    agentTransactions: '/reports/agent-transactions', 
    customerActivity: (customerId) => `/reports/customer-activity/${segment(customerId)}`,
  },
  staff: {
    root: '/staff', 
  },
  transfers: {
    // Customer-only. The initiating customer is always taken from the session.
    recipient: (accountNo) => `/transfers/recipient/${segment(accountNo)}`,
    initiate: '/transfers/initiate',
    resend: '/transfers/resend',
    confirm: '/transfers/confirm',
  },
  jobs: {
    
    savingsInterest: '/jobs/interest/savings',
    fdInterest: '/jobs/interest/fd',
    dormancyCheck: '/jobs/dormancy/check',
  },
};