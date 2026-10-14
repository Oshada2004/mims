import { useState } from 'react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import { getMetadata, listBranches, listFdPlans, listSavingsPlans } from '../../api/services/bankService';
import { formatCurrency, formatPercent } from '../../utils/format';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import '../Pages.css';

const BRANCH_PAGE_SIZE = 10;

const BRANCH_COLUMNS = [
  { key: 'branchId', header: 'ID' },
  { key: 'name', header: 'Branch' },
  { key: 'district', header: 'District' },
];

const SAVINGS_COLUMNS = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Plan' },
  { key: 'interestRate', header: 'Interest', align: 'right', render: (row) => `${formatPercent(row.interestRate)} p.a.` },
  { key: 'minBalance', header: 'Min. balance', align: 'right', render: (row) => formatCurrency(row.minBalance) },
  {
    key: 'ages',
    header: 'Ages',
    render: (row) => (row.maxAge === null ? `${row.minAge}+` : `${row.minAge}–${row.maxAge}`),
  },
  {
    key: 'allowsJoint',
    header: 'Joint',
    render: (row) => <Badge variant={row.allowsJoint ? 'success' : 'neutral'}>{row.allowsJoint ? 'Yes' : 'No'}</Badge>,
  },
];

const FD_COLUMNS = [
  { key: 'termCode', header: 'Code' },
  { key: 'months', header: 'Duration', render: (row) => `${row.months} months` },
  { key: 'interestRate', header: 'Interest', align: 'right', render: (row) => `${formatPercent(row.interestRate)} p.a.` },
];

function formatTime(value) {
  return value ? String(value).slice(0, 5) : '—';
}

export default function BankManagement() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim());

  const branches = useApi(
    (signal) => listBranches({ search: debouncedSearch, limit: BRANCH_PAGE_SIZE, offset }, { signal }),
    [debouncedSearch, offset],
  );
  const savingsPlans = useApi((signal) => listSavingsPlans(undefined, { signal }), []);
  const fdPlans = useApi((signal) => listFdPlans(undefined, { signal }), []);
  const metadata = useApi((signal) => getMetadata({ signal }), []);
  const bank = metadata.data;

  return (
    <div className="page">
      <PageHeader title="Bank management" description="Bank details, branches and the savings and FD plans on offer." />

      <Card title="Bank">
        {metadata.error && <Alert variant="error">{metadata.error}</Alert>}
        {metadata.loading && !bank && <Spinner label="Loading bank details" />}
        {!metadata.loading && !metadata.error && !bank && (
          <p className="text-muted">Bank details have not been configured.</p>
        )}
        {bank && (
          <dl className="summary-grid">
            <div>
              <dt>Name</dt>
              <dd>{bank.name}</dd>
            </div>
            <div>
              <dt>Bank code</dt>
              <dd>{bank.bankId}</dd>
            </div>
            <div>
              <dt>Motto</dt>
              <dd>{bank.motto || '—'}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>{bank.contactEmail || '—'}</dd>
            </div>
            <div>
              <dt>Banking hours</dt>
              <dd>
                {formatTime(bank.openTime)} – {formatTime(bank.closeTime)}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      <Card title="Branches" description={branches.data ? `${branches.data.total} branches` : undefined}>
        <div className="stack">
          <SearchBar
            value={search}
            onChange={(next) => {
              setSearch(next);
              setOffset(0);
            }}
            placeholder="Search by branch or district"
            label="Search branches"
          />
          {branches.error && <Alert variant="error">{branches.error}</Alert>}
          <Table
            columns={BRANCH_COLUMNS}
            rows={branches.data?.items ?? []}
            rowKey={(row) => row.branchId}
            loading={branches.loading && !branches.data}
            emptyMessage={debouncedSearch ? 'No branches match your search.' : 'No branches configured.'}
            caption="Branches"
          />
          <Pagination
            total={branches.data?.total ?? 0}
            limit={BRANCH_PAGE_SIZE}
            offset={offset}
            onChange={setOffset}
            disabled={branches.loading}
          />
        </div>
      </Card>

      <div className="two-column two-column--even">
        <Card title="Savings plans">
          {savingsPlans.error && <Alert variant="error">{savingsPlans.error}</Alert>}
          <Table
            columns={SAVINGS_COLUMNS}
            rows={savingsPlans.data?.items ?? []}
            rowKey={(row) => row.code}
            loading={savingsPlans.loading && !savingsPlans.data}
            emptyMessage="No savings plans configured."
            caption="Savings plans"
          />
        </Card>
        <Card title="FD plans">
          {fdPlans.error && <Alert variant="error">{fdPlans.error}</Alert>}
          <Table
            columns={FD_COLUMNS}
            rows={fdPlans.data?.items ?? []}
            rowKey={(row) => row.termCode}
            loading={fdPlans.loading && !fdPlans.data}
            emptyMessage="No FD plans configured."
            caption="FD plans"
          />
        </Card>
      </div>
    </div>
  );
}