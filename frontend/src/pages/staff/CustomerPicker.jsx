import { useState } from 'react';
import { X } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import { listCustomers } from '../../api/services/customerService';
import { formatDate } from '../../utils/format';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { ageInYears } from '../../utils/validation';

const PAGE_SIZE = 5;

/**
 * Search customers (GET /customers) and pick one. Shows the selection with a "Change" button.
 * `isSelectable(customer)` can disable rows (e.g. only adults can be guardians).
 */
export default function CustomerPicker({ value, onChange, isSelectable = () => true, disabledReason = '' }) {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim());

  const { data, loading, error } = useApi(
    (signal) => (value ? null : listCustomers({ search: debouncedSearch, limit: PAGE_SIZE, offset }, { signal })),
    [debouncedSearch, offset, Boolean(value)],
  );

  if (value) {
    const age = ageInYears(value.dob);
    return (
      <div className="picker-selected">
        <span>
          <span className="picker-selected__name">{value.fullName}</span>
          {' · '}ID {value.personId}
          {value.idNumber && <> · {value.idNumber}</>}
          {age !== null && <> · {age} years</>}
        </span>
        <Button variant="ghost" size="sm" icon={X} onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  const columns = [
    { key: 'personId', header: 'ID' },
    { key: 'fullName', header: 'Name' },
    { key: 'idNumber', header: 'NIC / birth cert.' },
    { key: 'dob', header: 'Date of birth', render: (row) => formatDate(row.dob) },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Badge variant={row.type === 'MINOR' ? 'accent' : 'neutral'}>{row.type}</Badge>,
    },
    {
      key: 'select',
      header: '',
      align: 'right',
      render: (row) => {
        const selectable = isSelectable(row);
        return (
          <Button
            size="sm"
            variant="secondary"
            disabled={!selectable}
            title={selectable ? undefined : disabledReason}
            onClick={() => onChange(row)}
          >
            Select
          </Button>
        );
      },
    },
  ];

  return (
    <div className="stack">
      <SearchBar
        value={search}
        onChange={(next) => {
          setSearch(next);
          setOffset(0);
        }}
        placeholder="Search by name, NIC or phone"
        label="Search customers"
      />
      {error && <Alert variant="error">{error}</Alert>}
      <Table
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.personId}
        loading={loading && !data}
        emptyMessage={debouncedSearch ? 'No customers match your search.' : 'No customers registered yet.'}
        caption="Customers"
      />
      <Pagination
        total={data?.total ?? 0}
        limit={PAGE_SIZE}
        offset={offset}
        onChange={setOffset}
        disabled={loading}
      />
    </div>
  );
}
