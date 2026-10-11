import EmptyState from './EmptyState';
import Spinner from './Spinner';
import './Table.css';

/**
 * Data table.
 * columns: [{ key, header, render?: (row) => node, align?: 'left' | 'right' | 'center' }]
 * rows: array of objects; `rowKey` picks the React key (defaults to row.id, then index).
 */
export default function Table({
  columns,
  rows = [],
  emptyMessage = 'No records to show.',
  loading = false,
  rowKey = (row, index) => row.id ?? index,
  caption,
}) {
  const colSpan = columns.length;

  let body;
  if (loading) {
    body = (
      <tr>
        <td className="table__state" colSpan={colSpan}>
          <Spinner label="Loading records" />
        </td>
      </tr>
    );
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td className="table__state" colSpan={colSpan}>
          <EmptyState title="Nothing here yet" message={emptyMessage} compact />
        </td>
      </tr>
    );
  } else {
    body = rows.map((row, index) => (
      <tr key={rowKey(row, index)}>
        {columns.map((column) => (
          <td key={column.key} className={column.align ? `table__cell--${column.align}` : undefined}>
            {column.render ? column.render(row) : (row[column.key] ?? '—')}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className="table-wrapper">
      <table className="table" aria-busy={loading || undefined}>
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align ? `table__cell--${column.align}` : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
