import EmptyState from './EmptyState';
import Spinner from './Spinner';
import './Table.css';

/**
 * Data table.
 * columns: [{ key, header, render?: (row) => node, align?: 'left' | 'right' | 'center' }]
 * rows: array of objects; `rowKey` picks the React key (defaults to row.id, then index).
 * onRowClick(row): optional; rows become focusable and open with click, Enter or Space.
 * selectedKey: optional key of a row to highlight.
 */
export default function Table({
  columns,
  rows = [],
  emptyMessage = 'No records to show.',
  loading = false,
  rowKey = (row, index) => row.id ?? index,
  caption,
  onRowClick,
  selectedKey,
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
    body = rows.map((row, index) => {
      const key = rowKey(row, index);
      const clickable = Boolean(onRowClick);
      return (
      <tr
        key={key}
        className={[clickable && 'table__row--clickable', key === selectedKey && 'table__row--selected']
          .filter(Boolean)
          .join(' ') || undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-selected={clickable ? key === selectedKey : undefined}
        onClick={clickable ? () => onRowClick(row) : undefined}
        onKeyDown={
          clickable
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(row);
                }
              }
            : undefined
        }
      >
        {columns.map((column) => (
          <td key={column.key} className={column.align ? `table__cell--${column.align}` : undefined}>
            {column.render ? column.render(row) : (row[column.key] ?? '—')}
          </td>
        ))}
      </tr>
      );
    });
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
