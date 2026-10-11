import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import '../Pages.css';

const STATUS_VARIANTS = { ACTIVE: 'success', DORMANT: 'warning', CLOSED: 'danger' };

const COLUMNS = [
  { key: 'person_id', header: 'ID' },
  { key: 'name', header: 'Name', render: (row) => `${row.first_name} ${row.last_name}` },
  { key: 'nic', header: 'NIC' },
  { key: 'branch', header: 'Branch' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={STATUS_VARIANTS[row.status] ?? 'neutral'}>{row.status}</Badge>,
  },
];

// TODO: load from the backend — empty until then.
const customers = [];

export default function CustomerManagement() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const rows = customers.filter((customer) =>
    [customer.first_name, customer.last_name, customer.nic].join(' ').toLowerCase().includes(query),
  );

  return (
    <div className="page">
      <PageHeader
        title="Customers"
        description="Every customer registered with the bank."
        actions={<Button icon={UserPlus}>Add customer</Button>}
      />
      <Alert>This page will let administrators search customers and review their accounts.</Alert>

      <Card>
        <div className="toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or NIC" label="Search customers" />
        </div>
        <Table
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => row.person_id}
          emptyMessage={query ? 'No customers match your search.' : 'No customers to show yet.'}
          caption="Customers"
        />
      </Card>
    </div>
  );
}
