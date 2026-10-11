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

const COLUMNS = [
  { key: 'person_id', header: 'ID' },
  { key: 'name', header: 'Name', render: (row) => `${row.first_name} ${row.last_name}` },
  { key: 'email', header: 'Email' },
  { key: 'branch', header: 'Branch' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>,
  },
];

// TODO: load from the backend (staffService) — empty until then.
const agents = [];

export default function AgentManagement() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const rows = agents.filter((agent) =>
    [agent.first_name, agent.last_name, agent.email].join(' ').toLowerCase().includes(query),
  );

  return (
    <div className="page">
      <PageHeader
        title="Agents"
        description="Staff members who serve customers at each branch."
        actions={<Button icon={UserPlus}>Add agent</Button>}
      />
      <Alert>This page will let administrators create and manage staff accounts.</Alert>

      <Card>
        <div className="toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email" label="Search agents" />
        </div>
        <Table
          columns={COLUMNS}
          rows={rows}
          rowKey={(row) => row.person_id}
          emptyMessage={query ? 'No agents match your search.' : 'No agents to show yet.'}
          caption="Agents"
        />
      </Card>
    </div>
  );
}
