import { useState } from 'react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import { getTransactionHistory } from '../../api/services/reportService';
import { DEBIT_TYPES, TXN_BADGE } from '../../constants/status';
import { formatCurrency, formatDateTime, formatLabel } from '../../utils/format';
import '../Pages.css';

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: 'timestamp', header: 'Date', render: (row) => formatDateTime(row.timestamp) },
  { key: 'txnId', header: 'Txn ID' },
  {
    key: 'type',
    header: 'Type',
    render: (row) => <Badge variant={TXN_BADGE[row.type] ?? 'neutral'}>{formatLabel(row.type)}</Badge>,
  },
  { key: 'reference', header: 'Reference', render: (row) => row.reference || '—' },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (row) => {
      const debit = DEBIT_TYPES.includes(row.type);
      return (
        <span className={debit ? 'amount--debit' : 'amount--credit'}>
          {debit ? '−' : '+'}
          {formatCurrency(row.amount)}
        </span>
      );
    },
  },
  { key: 'balanceAfter', header: 'Balance', align: 'right', render: (row) => formatCurrency(row.balanceAfter) },
];

/**
 * Paged transaction history for one account (GET /reports/transactions/:accountNo), newest first.
 * Change `refreshKey` to reload (e.g. after a new transaction). Resets to page 1 when the account changes.
 */
export default function TransactionHistory({ accountNo, refreshKey = 0 }) {
  const [paging, setPaging] = useState({ accountNo, offset: 0 });
  // Start from the first page whenever the account changes.
  const offset = paging.accountNo === accountNo ? paging.offset : 0;

  const { data, loading, error } = useApi(
    (signal) => (accountNo ? getTransactionHistory(accountNo, { limit: PAGE_SIZE, offset }, { signal }) : null),
    [accountNo, offset, refreshKey],
  );

  if (!accountNo) return null;

  return (
    <div className="stack">
      {error && <Alert variant="error">{error}</Alert>}
      <Table
        columns={COLUMNS}
        rows={error ? [] : (data?.items ?? [])}
        rowKey={(row) => row.txnId}
        loading={loading && !data}
        emptyMessage="No transactions on this account yet."
        caption={`Transaction history for ${accountNo}`}
      />
      <Pagination
        total={error ? 0 : (data?.total ?? 0)}
        limit={PAGE_SIZE}
        offset={offset}
        onChange={(next) => setPaging({ accountNo, offset: next })}
        disabled={loading}
      />
    </div>
  );
}
