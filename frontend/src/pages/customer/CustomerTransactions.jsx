import { useState } from 'react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { formatCurrency, formatDate } from '../../utils/format';
import '../Pages.css';

const TRANSACTION_TYPES = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdrawal' },
];

const COLUMNS = [
  { key: 'created_at', header: 'Date', render: (row) => formatDate(row.created_at, { withTime: true }) },
  {
    key: 'type',
    header: 'Type',
    render: (row) => <Badge variant={row.type === 'DEPOSIT' ? 'success' : 'accent'}>{row.type}</Badge>,
  },
  { key: 'ref_text', header: 'Reference' },
  { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatCurrency(row.amount) },
];

// TODO: load the customer's accounts (customerService.getCustomerAccounts) and their history
// (reportService.getTransactionHistory) — both empty until then.
const accounts = [];
const transactions = [];

export default function CustomerTransactions() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const rows = transactions.filter((tx) => String(tx.ref_text ?? '').toLowerCase().includes(query));
  const accountOptions = accounts.map((account) => ({ value: account.account_no, label: account.account_no }));

  return (
    <div className="page">
      <PageHeader title="Transactions" description="Deposits, withdrawals and history for your accounts." />
      <Alert>This page will let you move money and review the history of your savings accounts.</Alert>

      <div className="two-column">
        <Card title="New transaction">
          <form onSubmit={(event) => event.preventDefault()}>
            <div className="form-grid">
              <FormField label="Type" required className="form-grid__full">
                <Select name="type" options={TRANSACTION_TYPES} defaultValue="deposit" />
              </FormField>
              <FormField label="Account" required className="form-grid__full">
                <Select
                  name="accountNo"
                  options={accountOptions}
                  placeholder={accounts.length ? 'Select an account' : 'No accounts yet'}
                  defaultValue=""
                />
              </FormField>
              <FormField label="Amount (LKR)" required className="form-grid__full">
                <Input name="amount" type="number" min="0" step="0.01" />
              </FormField>
              <FormField label="Reference" className="form-grid__full">
                <Input name="refText" />
              </FormField>
            </div>
            <div className="form-actions">
              <Button type="submit" disabled>
                Coming soon
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Transaction history">
          <div className="toolbar">
            <SearchBar value={search} onChange={setSearch} placeholder="Search references" label="Search transactions" />
          </div>
          <Table
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row.transaction_id}
            emptyMessage={query ? 'No transactions match your search.' : 'Your transactions will appear here.'}
            caption="Transaction history"
          />
        </Card>
      </div>
    </div>
  );
}
