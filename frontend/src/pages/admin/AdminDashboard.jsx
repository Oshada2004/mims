import { ArrowLeftRight, Landmark, PiggyBank, Wallet } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import {
  getAccountSummary,
  getActiveFds,
  getAgentTransactions,
  getInterestDistribution,
} from '../../api/services/reportService';
import { STATUS_BADGE } from '../../constants/status';
import { formatCurrency, formatDate } from '../../utils/format';
import { todayIso } from '../../utils/validation';
import '../Pages.css';

const sum = (rows, field) => rows.reduce((total, row) => total + (row[field] ?? 0), 0);

/** Accounts grouped by plan: count and balance per status. */
function groupByPlan(rows) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.planCode) ?? { planCode: row.planCode, planName: row.planName, ACTIVE: 0, DORMANT: 0, CLOSED: 0, balance: 0 };
    group[row.status] = (group[row.status] ?? 0) + 1;
    group.balance += row.balance ?? 0;
    groups.set(row.planCode, group);
  }
  return [...groups.values()];
}

const PLAN_COLUMNS = [
  { key: 'planName', header: 'Plan' },
  ...['ACTIVE', 'DORMANT', 'CLOSED'].map((status) => ({
    key: status,
    header: <Badge variant={STATUS_BADGE[status]}>{status}</Badge>,
    align: 'right',
  })),
  { key: 'balance', header: 'Balance', align: 'right', render: (row) => formatCurrency(row.balance) },
];

const AGENT_COLUMNS = [
  { key: 'agentName', header: 'Agent' },
  { key: 'branchName', header: 'Branch' },
  { key: 'totalTransactions', header: 'Transactions', align: 'right' },
  { key: 'grossValue', header: 'Gross value', align: 'right', render: (row) => formatCurrency(row.grossValue) },
  { key: 'netValue', header: 'Net value', align: 'right', render: (row) => formatCurrency(row.netValue) },
];

const FD_COLUMNS = [
  { key: 'fdId', header: 'FD ID' },
  { key: 'accountNo', header: 'Account' },
  { key: 'termCode', header: 'Term' },
  { key: 'principal', header: 'Principal', align: 'right', render: (row) => formatCurrency(row.principal) },
  { key: 'maturityDate', header: 'Matures', render: (row) => formatDate(row.maturityDate) },
  { key: 'nextPayoutDate', header: 'Next payout', render: (row) => formatDate(row.nextPayoutDate) },
];

export default function AdminDashboard() {
  const today = todayIso();
  const monthStart = `${today.slice(0, 8)}01`;
  const year = Number(today.slice(0, 4));

  const accounts = useApi((signal) => getAccountSummary({}, { signal }), []);
  const fds = useApi((signal) => getActiveFds(undefined, { signal }), []);
  const agents = useApi((signal) => getAgentTransactions({ startDate: monthStart, endDate: today }, { signal }), [monthStart, today]);
  const interest = useApi((signal) => getInterestDistribution({ year }, { signal }), [year]);

  const accountRows = accounts.data ?? [];
  const fdRows = fds.data ?? [];
  const agentRows = agents.data ?? [];
  const show = (state, compute) => (state.loading && !state.data ? '…' : state.error ? '—' : compute());

  return (
    <div className="page">
      <PageHeader title="Admin dashboard" description={`Bank-wide figures · ${formatDate(today)}`} />

      {[accounts.error, fds.error, agents.error, interest.error].filter(Boolean).map((message) => (
        <Alert key={message} variant="error">
          {message}
        </Alert>
      ))}

      <div className="stat-grid">
        <StatCard
          label="Savings accounts"
          icon={Landmark}
          value={show(accounts, () => accountRows.length)}
          hint={accounts.data ? `${accountRows.filter((row) => row.status === 'ACTIVE').length} active` : undefined}
        />
        <StatCard label="Total savings balance" icon={Wallet} value={show(accounts, () => formatCurrency(sum(accountRows, 'balance')))} />
        <StatCard
          label="Active fixed deposits"
          icon={PiggyBank}
          value={show(fds, () => fdRows.length)}
          hint={fds.data ? `${formatCurrency(sum(fdRows, 'principal'))} invested` : undefined}
        />
        <StatCard
          label="Transactions this month"
          icon={ArrowLeftRight}
          value={show(agents, () => sum(agentRows, 'totalTransactions'))}
          hint={interest.data ? `${formatCurrency(sum(interest.data, 'totalInterest'))} interest paid in ${year}` : undefined}
        />
      </div>

      <div className="two-column two-column--even">
        <Card title="Accounts by plan">
          <Table
            columns={PLAN_COLUMNS}
            rows={groupByPlan(accountRows)}
            rowKey={(row) => row.planCode}
            loading={accounts.loading && !accounts.data}
            emptyMessage="No savings accounts yet."
            caption="Accounts by plan"
          />
        </Card>
        <Card title="Agent activity this month">
          <Table
            columns={AGENT_COLUMNS}
            rows={agentRows}
            rowKey={(row) => row.agentId}
            loading={agents.loading && !agents.data}
            emptyMessage="No agent transactions this month."
            caption="Agent activity this month"
          />
        </Card>
      </div>

      <Card title="Active fixed deposits">
        <Table
          columns={FD_COLUMNS}
          rows={fdRows}
          rowKey={(row) => row.fdId}
          loading={fds.loading && !fds.data}
          emptyMessage="No active fixed deposits."
          caption="Active fixed deposits"
        />
      </Card>
    </div>
  );
}
