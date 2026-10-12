/**
 * Every backend path in one place, relative to VITE_API_URL (which already ends in /api).
 * Dynamic segments are functions so callers never build URLs by hand.
 */
const segment = (value) => encodeURIComponent(value);

export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
    // TODO: backend endpoint not implemented yet
    signup: '/auth/signup',
  },
  bank: {
    metadata: '/bank/metadata', // public
    branches: '/bank/branches',
    savingsPlans: '/bank/savings-plans',
    fdPlans: '/bank/fd-plans',
  },
  customers: {
    list: '/customers', // ?search=&limit=&offset= (staff, admin)
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
    activeFds: '/reports/active-fds', // ?due_by=YYYY-MM-DD
    transactions: (accountNo) => `/reports/transactions/${segment(accountNo)}`, // ?limit=&offset=
    accountSummary: '/reports/account-summary', // ?plan_code=&status=
    interestDistribution: '/reports/interest-distribution', // ?year=&month=&plan_code=
    agentTransactions: '/reports/agent-transactions', // ?start_date=&end_date= (required)
    customerActivity: (customerId) => `/reports/customer-activity/${segment(customerId)}`, // ?start_date=&end_date=
  },
  staff: {
    root: '/staff', // GET list (?search=&limit=&offset=), POST create — admin only
  },
  jobs: {
    // Admin only. The savings-interest and dormancy procedures do not exist in the database yet.
    savingsInterest: '/jobs/interest/savings',
    fdInterest: '/jobs/interest/fd',
    dormancyCheck: '/jobs/dormancy/check',
  },
};
