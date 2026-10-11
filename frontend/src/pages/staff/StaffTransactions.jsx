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
  { key: 'account_no', header: 'Account' },
  {
    key: 'type',
    header: 'Type',
    render: (row) => <Badge variant={row.type === 'DEPOSIT' ? 'success' : 'accent'}>{row.type}</Badge>,
  },
  { key: 'ref_text', header: 'Reference' },
  { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatCurrency(row.amount) },
];

const transactions = [];


export default function StaffTransactions() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const rows = transactions.filter((tx) => [tx.account_no, tx.ref_text].join(' ').toLowerCase().includes(query));

  return (
    <div className="page">
      <PageHeader title="Transactions" description="Record deposits and withdrawals for customer accounts." />
      <Alert>This page will let staff process deposits and withdrawals and review account history.</Alert>

      <div className="two-column">
        <Card title="New transaction">
          <form onSubmit={(event) => event.preventDefault()}>
            <div className="form-grid">
              <FormField label="Type" required className="form-grid__full">
                <Select name="type" options={TRANSACTION_TYPES} defaultValue="deposit" />
              </FormField>
              <FormField label="Account number" required className="form-grid__full">
                <Input name="accountNo" />
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
            <SearchBar value={search} onChange={setSearch} placeholder="Search account or reference" label="Search transactions" />
          </div>
          <Table
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row.transaction_id}
            emptyMessage={query ? 'No transactions match your search.' : 'Transactions you record will appear here.'}
            caption="Transaction history"
          />
        </Card>
      </div>
    </div>
  );
}