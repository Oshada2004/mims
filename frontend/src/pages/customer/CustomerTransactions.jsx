import { useSearchParams } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FormField from '../../components/ui/FormField';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { useApi } from '../../api/useApi';
import { getCustomerAccounts } from '../../api/services/customerService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import TransactionHistory from '../shared/TransactionHistory';
import '../Pages.css';

export default function CustomerTransactions() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const accounts = useApi((signal) => getCustomerAccounts(user.person_id, { signal }), [user.person_id]);

  const rows = accounts.data ?? [];
  // Default to the first account; the backend still checks the account belongs to this customer.
  const selected = searchParams.get('account') ?? rows[0]?.accountNo ?? '';
  const current = rows.find((row) => row.accountNo === selected);

  return (
    <div className="page">
      <PageHeader title="Transactions" description="The history of your savings accounts, newest first." />

      <Alert>
        Deposits and withdrawals are made through your agent at the branch. This page shows your history only.
      </Alert>

      {accounts.error && (
        <Alert variant="error" title="Could not load your accounts">
          {accounts.error}
        </Alert>
      )}

      <Card
        title="Account history"
        description={current ? `Current balance: ${formatCurrency(current.balance)}` : undefined}
      >
        {accounts.loading && !accounts.data && <Spinner label="Loading your accounts" />}
        {accounts.data && rows.length === 0 && (
          <EmptyState title="No accounts yet" message="Visit your agent to open a savings account." compact />
        )}
        {rows.length > 0 && (
          <div className="stack">
            <div className="form-grid">
              <FormField label="Account">
                <Select
                  value={selected}
                  onChange={(event) => setSearchParams({ account: event.target.value })}
                  options={[
                    // Keep an unknown account from the URL visible so its error is explained.
                    ...(selected && !current ? [{ value: selected, label: selected }] : []),
                    ...rows.map((row) => ({
                      value: row.accountNo,
                      label: `${row.accountNo} · ${row.planCode} · ${row.status}`,
                    })),
                  ]}
                />
              </FormField>
            </div>
            <TransactionHistory accountNo={selected} />
          </div>
        )}
      </Card>
    </div>
  );
}
