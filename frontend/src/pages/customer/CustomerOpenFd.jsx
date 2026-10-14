import { useState } from 'react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import { listFdPlans } from '../../api/services/bankService';
import { getCustomerAccounts } from '../../api/services/customerService';
import { STATUS_BADGE } from '../../constants/status';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPercent } from '../../utils/format';
import { isValidAmount } from '../../utils/validation';
import '../Pages.css';

function termLabel(months) {
    return months % 12 === 0 ? `${months / 12} year${months === 12 ? '' : 's'}` : `${months} months`;
}

/** Information only: FDs are opened by the customer's agent (the backend is agent-only). */
export default function CustomerOpenFd() {
    const { user } = useAuth();
    const [principal, setPrincipal] = useState('');
    const accounts = useApi((signal) => getCustomerAccounts(user.person_id, { signal }), [user.person_id]);
    const plans = useApi((signal) => listFdPlans(undefined, { signal }), []);

    const amount = isValidAmount(principal) ? Number(principal) : null;

    const planColumns = [
        { key: 'termCode', header: 'Term', render: (row) => termLabel(row.months) },
        { key: 'interestRate', header: 'Interest', render: (row) => `${formatPercent(row.interestRate)} p.a.` },
        {
            key: 'monthly',
            header: 'Monthly interest',
            align: 'right',
            render: (row) => (amount ? formatCurrency((amount * row.interestRate) / 100 / 12) : '—'),
        },
        {
            key: 'total',
            header: 'Total interest',
            align: 'right',
            render: (row) => (amount ? formatCurrency((amount * row.interestRate * row.months) / 100 / 12) : '—'),
        },
    ];

    const accountColumns = [
        { key: 'accountNo', header: 'Account' },
        { key: 'planCode', header: 'Plan' },
        {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{row.status}</Badge>,
        },
        { key: 'balance', header: 'Available to invest', align: 'right', render: (row) => formatCurrency(row.balance) },
    ];

    return (
        <div className="page">
            <PageHeader title="Fixed deposits" description="Compare fixed deposit terms and see which account can fund one." />

            <Alert title="Fixed deposits are opened by your agent">
                Visit your branch with your savings account number. Your agent opens the FD from an active savings
                account; interest is paid into that account every month.
            </Alert>

            <Card title="FD plans" description="Enter an amount to estimate the interest.">
                <div className="stack">
                    <div className="form-grid">
                        <FormField label="Amount to invest (LKR)" error={principal && !amount ? 'Enter a positive amount.' : undefined}>
                            <Input inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} />
                        </FormField>
                    </div>
                    {plans.error && <Alert variant="error">{plans.error}</Alert>}
                    <Table
                        columns={planColumns}
                        rows={plans.data?.items ?? []}
                        rowKey={(row) => row.termCode}
                        loading={plans.loading && !plans.data}
                        emptyMessage="No FD plans are configured."
                        caption="FD plans"
                    />
                    <p className="text-muted">Estimates only; the rate is fixed when the deposit is opened.</p>
                </div>
            </Card>

            <Card title="My savings accounts">
                {accounts.error && <Alert variant="error">{accounts.error}</Alert>}
                <Table
                    columns={accountColumns}
                    rows={accounts.data ?? []}
                    rowKey={(row) => row.accountNo}
                    loading={accounts.loading && !accounts.data}
                    emptyMessage="You don't have any savings accounts yet."
                    caption="My savings accounts"
                />
            </Card>
        </div>
    );
}