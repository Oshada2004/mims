import { Plus } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import '../Pages.css';

const BRANCH_COLUMNS = [
  { key: 'branch_id', header: 'ID' },
  { key: 'name', header: 'Branch' },
  { key: 'city', header: 'City' },
  { key: 'manager', header: 'Manager' },
];

const SAVINGS_PLAN_COLUMNS = [
  { key: 'plan_code', header: 'Plan' },
  { key: 'min_age', header: 'Min age' },
  { key: 'min_balance', header: 'Min balance' },
  { key: 'interest_rate', header: 'Interest rate', align: 'right' },
];

const FD_PLAN_COLUMNS = [
  { key: 'term_code', header: 'Term' },
  { key: 'months', header: 'Months' },
  { key: 'interest_rate', header: 'Interest rate', align: 'right' },
];

export default function BankManagement() {
  return (
    <div className="page">
      <PageHeader title="Bank management" description="Branches, savings plans and fixed deposit plans." />
      <Alert>This page will let administrators manage branches and the bank&apos;s savings and FD plans.</Alert>

      <Card
        title="Branches"
        actions={
          <Button variant="secondary" size="sm" icon={Plus}>
            Add branch
          </Button>
        }
      >
        <Table columns={BRANCH_COLUMNS} rows={[]} emptyMessage="No branches loaded yet." caption="Branches" />
      </Card>

      <Card title="Savings plans">
        <Table
          columns={SAVINGS_PLAN_COLUMNS}
          rows={[]}
          emptyMessage="No savings plans loaded yet."
          caption="Savings plans"
        />
      </Card>

      <Card title="FD plans">
        <Table columns={FD_PLAN_COLUMNS} rows={[]} emptyMessage="No FD plans loaded yet." caption="FD plans" />
      </Card>
    </div>
  );
}