import { Link } from 'react-router-dom';
import { ArrowLeftRight, PiggyBank, Wallet, Users } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import { getAccountSummary, getActiveFds, getAgentTransactions } from '../../api/services/reportService';
import { STATUS_BADGE } from '../../constants/status';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/format';
import { todayIso } from '../../utils/validation';
import '../Pages.css';

const RECENT_ACCOUNTS = 8;

function monthStart() {
  return `${todayIso().slice(0, 8)}01`;
}

const FD_COLUMNS = [
  { key: 'fdId', header: 'FD ID' },
  { key: 'accountNo', header: 'Account' },
  { key: 'termCode', header: 'Term' },
  { key: 'principal', header: 'Principal', align: 'right', render: (row) => formatCurrency(row.principal) },
  { key: 'nextPayoutDate', header: 'Next payout', render: (row) => formatDate(row.nextPayoutDate) },
  {
    key: 'expectedMonthlyInterest',
    header: 'Expected interest',
    align: 'right',
    render: (row) => formatCurrency(row.expectedMonthlyInterest),
  },
];

const ACCOUNT_COLUMNS = [
  {
    key: 'accountNo',
    header: 'Account',
    render: (row) => <Link to={`/staff/transactions?account=${encodeURIComponent(row.accountNo)}`}>{row.accountNo}</Link>,
  },
  { key: 'holderNames', header: 'Holders' },
  { key: 'planName', header: 'Plan' },
  { key: 'balance', header: 'Balance', align: 'right', render: (row) => formatCurrency(row.balance) },
  { key: 'lastTransactionDate', header: 'Last activity', render: (row) => formatDate(row.lastTransactionDate) },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{row.status}</Badge>,
  },
];

export default function StaffDashboard() {
  const { user } = useAuth();
  const dueBy = todayIso(30);

  const fds = useApi((signal) => getActiveFds(undefined, { signal }), []);
  const accounts = useApi((signal) => getAccountSummary({}, { signal }), []);
  const myActivity = useApi(
    (signal) => getAgentTransactions({ startDate: monthStart(), endDate: todayIso() }, { signal }),
    [],
  );

  const dueSoon = (fds.data ?? []).filter((fd) => fd.nextPayoutDate && fd.nextPayoutDate.slice(0, 10) <= dueBy);
  const accountRows = accounts.data ?? [];
  const totalBalance = accountRows.reduce((sum, row) => sum + (row.balance ?? 0), 0);
  const recentAccounts = [...accountRows]
    .sort((a, b) => String(b.lastTransactionDate ?? '').localeCompare(String(a.lastTransactionDate ?? '')))
    .slice(0, RECENT_ACCOUNTS);
  const mine = (myActivity.data ?? []).find((row) => row.agentId === user.person_id);

  const value = (state, compute) => (state.loading && !state.data ? '…' : state.error ? '—' : compute());

  return (
    <div className="page">
      <PageHeader
        title="Staff dashboard"
        description={`${user.branch_name ?? 'Your branch'} · ${formatDate(todayIso())}`}
      />

      {[fds.error, accounts.error, myActivity.error].filter(Boolean).map((message) => (
        <Alert key={message} variant="error">
          {message}
        </Alert>
      ))}

      <div className="stat-grid">
        <StatCard label="Savings accounts" icon={Users} value={value(accounts, () => accountRows.length)} />
        <StatCard label="Total savings balance" icon={Wallet} value={value(accounts, () => formatCurrency(totalBalance))} />
        <StatCard label="Active fixed deposits" icon={PiggyBank} value={value(fds, () => fds.data.length)} />
        <StatCard
          label="My transactions this month"
          icon={ArrowLeftRight}
          value={value(myActivity, () => mine?.totalTransactions ?? 0)}
          hint={mine ? `${formatCurrency(mine.grossValue)} processed` : undefined}
        />
      </div>

      <Card title="FD payouts due in the next 30 days">
        <Table
          columns={FD_COLUMNS}
          rows={dueSoon}
          rowKey={(row) => row.fdId}
          loading={fds.loading && !fds.data}
          emptyMessage="No FD payouts are due in the next 30 days."
          caption="FD payouts due soon"
        />
      </Card>

      <Card title="Recently active accounts" description="Bank-wide, most recent activity first.">
        <Table
          columns={ACCOUNT_COLUMNS}
          rows={recentAccounts}
          rowKey={(row) => row.accountNo}
          loading={accounts.loading && !accounts.data}
          emptyMessage="No savings accounts yet."
          caption="Recently active accounts"
        />
      </Card>
    </div>
  );
}
