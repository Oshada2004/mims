import { useState } from 'react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import { getCustomerAccounts, listCustomers } from '../../api/services/customerService';
import { getCustomerActivity } from '../../api/services/reportService';
import { STATUS_BADGE } from '../../constants/status';
import { formatCurrency, formatDate, formatLabel } from '../../utils/format';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { ageInYears } from '../../utils/validation';
import '../Pages.css';

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: 'personId', header: 'ID' },
  { key: 'fullName', header: 'Name' },
  { key: 'idNumber', header: 'NIC / birth cert.', render: (row) => row.idNumber ?? '—' },
  { key: 'phone', header: 'Phone' },
  { key: 'dob', header: 'Date of birth', render: (row) => formatDate(row.dob) },
  {
    key: 'type',
    header: 'Type',
    render: (row) => <Badge variant={row.type === 'MINOR' ? 'accent' : 'neutral'}>{formatLabel(row.type)}</Badge>,
  },
];

const ACCOUNT_COLUMNS = [
  { key: 'accountNo', header: 'Account' },
  { key: 'planCode', header: 'Plan' },
  { key: 'holderRole', header: 'Holder', render: (row) => formatLabel(row.holderRole) },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{row.status}</Badge>,
  },
  { key: 'balance', header: 'Balance', align: 'right', render: (row) => formatCurrency(row.balance) },
];

/** Accounts and activity totals for one customer. */
function CustomerAccountsModal({ customer, onClose }) {
  const personId = customer?.personId ?? null;
  const accounts = useApi((signal) => (personId ? getCustomerAccounts(personId, { signal }) : null), [personId]);
  // 404 here just means the customer has no activity yet.
  const activity = useApi((signal) => (personId ? getCustomerActivity(personId, {}, { signal }) : null), [personId]);

  if (!customer) return null;
  const age = ageInYears(customer.dob);

  return (
    <Modal open onClose={onClose} title={customer.fullName} size="lg">
      <div className="stack">
        <dl className="summary-grid">
          <div>
            <dt>Person ID</dt>
            <dd>{customer.personId}</dd>
          </div>
          <div>
            <dt>{customer.type === 'MINOR' ? 'Birth certificate' : 'NIC'}</dt>
            <dd>{customer.idNumber ?? '—'}</dd>
          </div>
          <div>
            <dt>Age</dt>
            <dd>{age ?? '—'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{customer.phone}</dd>
          </div>
          {customer.guardianPersonId && (
            <div>
              <dt>Guardian ID</dt>
              <dd>{customer.guardianPersonId}</dd>
            </div>
          )}
          {activity.data && (
            <>
              <div>
                <dt>Agent</dt>
                <dd>{activity.data.agentName ?? '—'}</dd>
              </div>
              <div>
                <dt>Total deposits</dt>
                <dd>{formatCurrency(activity.data.totalDeposits)}</dd>
              </div>
              <div>
                <dt>Total withdrawals</dt>
                <dd>{formatCurrency(activity.data.totalWithdrawals)}</dd>
              </div>
              <div>
                <dt>Active FD</dt>
                <dd>{activity.data.hasActiveFd ? 'Yes' : 'No'}</dd>
              </div>
            </>
          )}
        </dl>
        {accounts.error && <Alert variant="error">{accounts.error}</Alert>}
        <Table
          columns={ACCOUNT_COLUMNS}
          rows={accounts.data ?? []}
          rowKey={(row) => row.accountNo}
          loading={accounts.loading && !accounts.data}
          emptyMessage="This customer has no savings accounts."
          caption={`Accounts of ${customer.fullName}`}
        />
      </div>
    </Modal>
  );
}

export default function CustomerManagement() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const customers = useApi(
    (signal) => listCustomers({ search: debouncedSearch, limit: PAGE_SIZE, offset }, { signal }),
    [debouncedSearch, offset],
  );

  return (
    <div className="page">
      <PageHeader title="Customers" description="Every adult and minor customer. Select a customer to see their accounts." />

      <Card description={customers.data ? `${customers.data.total} customers` : undefined}>
        <div className="stack">
          <SearchBar
            value={search}
            onChange={(next) => {
              setSearch(next);
              setOffset(0);
            }}
            placeholder="Search by name, NIC, birth certificate or phone"
            label="Search customers"
          />
          {customers.error && <Alert variant="error">{customers.error}</Alert>}
          <Table
            columns={COLUMNS}
            rows={customers.data?.items ?? []}
            rowKey={(row) => row.personId}
            loading={customers.loading && !customers.data}
            emptyMessage={debouncedSearch ? 'No customers match your search.' : 'No customers registered yet.'}
            caption="Customers"
            onRowClick={setSelected}
            selectedKey={selected?.personId}
          />
          <Pagination
            total={customers.data?.total ?? 0}
            limit={PAGE_SIZE}
            offset={offset}
            onChange={setOffset}
            disabled={customers.loading}
          />
        </div>
      </Card>

      <CustomerAccountsModal customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
