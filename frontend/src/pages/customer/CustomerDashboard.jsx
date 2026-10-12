import { Link } from 'react-router-dom';
import { ArrowLeftRight, Clock, Landmark, Wallet } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import '../../components/ui/Button.css';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import { listSavingsPlans } from '../../api/services/bankService';
import { getCustomerAccounts } from '../../api/services/customerService';
import { STATUS_BADGE } from '../../constants/status';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatLabel, formatPercent } from '../../utils/format';
import '../Pages.css';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const accounts = useApi((signal) => getCustomerAccounts(user.person_id, { signal }), [user.person_id]);
  const plans = useApi((signal) => listSavingsPlans(undefined, { signal }), []);

  const planByCode = Object.fromEntries((plans.data?.items ?? []).map((plan) => [plan.code, plan]));
  const rows = accounts.data ?? [];
  const activeRows = rows.filter((row) => row.status !== 'CLOSED');
  const totalBalance = activeRows.reduce((sum, row) => sum + (row.balance ?? 0), 0);
  const loadingValue = accounts.loading && !accounts.data;

  const columns = [
    { key: 'accountNo', header: 'Account' },
    {
      key: 'planCode',
      header: 'Plan',
      render: (row) => planByCode[row.planCode]?.name ?? row.planCode,
    },
    {
      key: 'rate',
      header: 'Interest',
      render: (row) => (planByCode[row.planCode] ? `${formatPercent(planByCode[row.planCode].interestRate)} p.a.` : '—'),
    },
    { key: 'holderRole', header: 'Holder', render: (row) => formatLabel(row.holderRole) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{row.status}</Badge>,
    },
    { key: 'balance', header: 'Balance', align: 'right', render: (row) => formatCurrency(row.balance) },
    {
      key: 'history',
      header: '',
      align: 'right',
      render: (row) => (
        <Link to={`/customer/transactions?account=${encodeURIComponent(row.accountNo)}`}>History</Link>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title={user.first_name ? `Welcome, ${user.first_name}` : 'Welcome'}
        description="Your savings accounts at a glance."
      />

      {accounts.error && (
        <Alert variant="error" title="Could not load your accounts">
          {accounts.error}
        </Alert>
      )}

      <div className="stat-grid">
        <StatCard label="Total balance" icon={Wallet} value={loadingValue ? '…' : formatCurrency(totalBalance)} />
        <StatCard label="Open accounts" icon={Landmark} value={loadingValue ? '…' : activeRows.length} />
        <StatCard
          label="Dormant accounts"
          icon={Clock}
          value={loadingValue ? '…' : rows.filter((row) => row.status === 'DORMANT').length}
          hint="Visit your agent to reactivate a dormant account."
        />
      </div>

      <Card
        title="My accounts"
        actions={
          <Link to="/customer/transactions" className="btn btn--secondary btn--sm">
            <ArrowLeftRight size={16} aria-hidden="true" />
            <span>Transactions</span>
          </Link>
        }
      >
        <Table
          columns={columns}
          rows={rows}
          rowKey={(row) => row.accountNo}
          loading={loadingValue}
          emptyMessage="You don't have any savings accounts yet. Visit your agent to open one."
          caption="My accounts"
        />
      </Card>
    </div>
  );
}
