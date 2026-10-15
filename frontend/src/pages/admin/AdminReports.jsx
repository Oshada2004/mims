import { useMemo, useState } from 'react';
import { Download, FileBarChart2, RefreshCw } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';
import { useApi } from '../../api/useApi';
import { getAccountSummary, getActiveFds, getAgentTransactions, getInterestDistribution } from '../../api/services/reportService';
import { formatCurrency, formatDate } from '../../utils/format';
import { todayIso } from '../../utils/validation';
import '../Pages.css';
import './AdminReports.css';

const today = todayIso();
const monthStart = `${today.slice(0, 8)}01`;
const currentYear = Number(today.slice(0, 4));
const REPORTS = [
  { value: 'accounts', label: 'Savings accounts' },
  { value: 'agents', label: 'Agent transactions' },
  { value: 'fds', label: 'Active fixed deposits' },
  { value: 'interest', label: 'Interest distribution' },
];
const amount = (value) => formatCurrency(Number(value) || 0);

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
function downloadCsv(filename, columns, rows) {
  const content = [columns.map((column) => csvCell(column.label)).join(','), ...rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(','))].join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const accountColumns = [
  { key: 'accountNo', header: 'Account no.' }, { key: 'holderNames', header: 'Account holder' },
  { key: 'planName', header: 'Savings plan' }, { key: 'status', header: 'Status' },
  { key: 'balance', header: 'Balance', align: 'right', render: (row) => amount(row.balance) },
  { key: 'transactionCount', header: 'Transactions', align: 'right' },
];
const agentColumns = [
  { key: 'agentName', header: 'Agent' }, { key: 'branchName', header: 'Branch' },
  { key: 'totalTransactions', header: 'Transactions', align: 'right' },
  { key: 'grossValue', header: 'Gross value', align: 'right', render: (row) => amount(row.grossValue) },
  { key: 'netValue', header: 'Net value', align: 'right', render: (row) => amount(row.netValue) },
];
const fdColumns = [
  { key: 'fdId', header: 'FD ID' }, { key: 'accountNo', header: 'Savings account' },
  { key: 'termCode', header: 'Term' }, { key: 'principal', header: 'Principal', align: 'right', render: (row) => amount(row.principal) },
  { key: 'maturityDate', header: 'Maturity date', render: (row) => formatDate(row.maturityDate) },
  { key: 'nextPayoutDate', header: 'Next payout', render: (row) => formatDate(row.nextPayoutDate) },
];
const interestColumns = [
  { key: 'label', header: 'Period' }, { key: 'planCode', header: 'Plan' },
  { key: 'accountsReceivingInterest', header: 'Accounts', align: 'right' },
  { key: 'payoutCount', header: 'Payouts', align: 'right' },
  { key: 'savingsInterest', header: 'Savings interest', align: 'right', render: (row) => amount(row.savingsInterest) },
  { key: 'fdInterest', header: 'FD interest', align: 'right', render: (row) => amount(row.fdInterest) },
  { key: 'totalInterest', header: 'Total interest', align: 'right', render: (row) => amount(row.totalInterest) },
];

export default function AdminReports() {
  const [reportType, setReportType] = useState('accounts');
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [status, setStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const accounts = useApi((signal) => getAccountSummary({ planCode, status }, { signal }), [planCode, status, refreshKey]);
  const fds = useApi((signal) => getActiveFds(undefined, { signal }), [refreshKey]);
  const agents = useApi((signal) => getAgentTransactions({ startDate, endDate }, { signal }), [startDate, endDate, refreshKey]);
  const interest = useApi((signal) => getInterestDistribution({ year: Number(year), month: month ? Number(month) : undefined }, { signal }), [year, month, refreshKey]);

  const config = {
    accounts: { title: 'Savings account report', state: accounts, rows: accounts.data ?? [], columns: accountColumns,
      exportColumns: [{ label: 'Account number', value: (r) => r.accountNo }, { label: 'Holder', value: (r) => r.holderNames }, { label: 'Plan', value: (r) => r.planName }, { label: 'Status', value: (r) => r.status }, { label: 'Balance (LKR)', value: (r) => r.balance }, { label: 'Deposits (LKR)', value: (r) => r.totalDeposits }, { label: 'Withdrawals (LKR)', value: (r) => r.totalWithdrawals }, { label: 'Interest (LKR)', value: (r) => r.totalInterest }, { label: 'Transactions', value: (r) => r.transactionCount }] },
    agents: { title: 'Agent transaction report', state: agents, rows: agents.data ?? [], columns: agentColumns,
      exportColumns: [{ label: 'Agent ID', value: (r) => r.agentId }, { label: 'Agent', value: (r) => r.agentName }, { label: 'Branch', value: (r) => r.branchName }, { label: 'Transactions', value: (r) => r.totalTransactions }, { label: 'Gross value (LKR)', value: (r) => r.grossValue }, { label: 'Net value (LKR)', value: (r) => r.netValue }] },
    fds: { title: 'Active fixed deposit report', state: fds, rows: fds.data ?? [], columns: fdColumns,
      exportColumns: [{ label: 'FD ID', value: (r) => r.fdId }, { label: 'Account', value: (r) => r.accountNo }, { label: 'Term', value: (r) => r.termCode }, { label: 'Principal (LKR)', value: (r) => r.principal }, { label: 'Interest rate', value: (r) => r.interestRate }, { label: 'Opened date', value: (r) => r.openedDate }, { label: 'Maturity date', value: (r) => r.maturityDate }, { label: 'Next payout date', value: (r) => r.nextPayoutDate }] },
    interest: { title: 'Interest distribution report', state: interest, rows: interest.data ?? [], columns: interestColumns,
      exportColumns: [{ label: 'Period', value: (r) => r.label }, { label: 'Plan', value: (r) => r.planCode }, { label: 'Accounts receiving interest', value: (r) => r.accountsReceivingInterest }, { label: 'Payout count', value: (r) => r.payoutCount }, { label: 'Savings interest (LKR)', value: (r) => r.savingsInterest }, { label: 'FD interest (LKR)', value: (r) => r.fdInterest }, { label: 'Total interest (LKR)', value: (r) => r.totalInterest }] },
  };
  const selected = config[reportType];
  const totalRecords = selected.rows.length;
  const totalValue = useMemo(() => selected.rows.reduce((sum, row) => sum + (reportType === 'accounts' ? row.balance : reportType === 'agents' ? row.grossValue : reportType === 'fds' ? row.principal : row.totalInterest), 0), [selected.rows, reportType]);
  const exportReport = () => downloadCsv(`mims-${reportType}-report-${today}.csv`, selected.exportColumns, selected.rows);

  return (
    <div className="page">
      <PageHeader title="Reports" description="Generate, review and export bank-wide operational reports." actions={<Button icon={RefreshCw} variant="secondary" onClick={() => setRefreshKey((value) => value + 1)}>Refresh data</Button>} />
      <Card title="Report settings" description="Choose a report and set the filters before exporting.">
        <div className="report-filters">
          <label className="report-field"><span>Report type</span><select value={reportType} onChange={(event) => setReportType(event.target.value)}>{REPORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          {reportType === 'accounts' && <>
            <label className="report-field"><span>Plan code (optional)</span><input value={planCode} onChange={(event) => setPlanCode(event.target.value)} placeholder="All plans" /></label>
            <label className="report-field"><span>Account status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DORMANT">Dormant</option><option value="CLOSED">Closed</option></select></label>
          </>}
          {reportType === 'agents' && <>
            <label className="report-field"><span>Start date</span><input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className="report-field"><span>End date</span><input type="date" value={endDate} min={startDate} max={today} onChange={(event) => setEndDate(event.target.value)} /></label>
          </>}
          {reportType === 'interest' && <>
            <label className="report-field"><span>Year</span><input type="number" min="2000" max={currentYear} value={year} onChange={(event) => setYear(event.target.value)} /></label>
            <label className="report-field"><span>Month</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">All months</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2000, index, 1).toLocaleString('en', { month: 'long' })}</option>)}</select></label>
          </>}
        </div>
      </Card>
      {selected.state.error && <Alert variant="error" title="Could not load report">{selected.state.error}</Alert>}
      <div className="report-summary">
        <div className="report-summary__icon"><FileBarChart2 size={22} /></div>
        <div className="report-summary__details"><span className="report-summary__eyebrow">Selected report</span><strong>{selected.title}</strong><span className="report-summary__muted">{totalRecords} records · Total value: {amount(totalValue)}</span></div>
        <Button icon={Download} onClick={exportReport} disabled={selected.state.loading || totalRecords === 0}>Export CSV</Button>
      </div>
      <Card title={selected.title} description={reportType === 'agents' ? `${formatDate(startDate)} to ${formatDate(endDate)}` : reportType === 'interest' ? `Year ${year}${month ? ` · Month ${month}` : ' · All months'}` : 'Current data returned by the MIMS reporting API'}>
        <Table columns={selected.columns} rows={selected.rows} rowKey={(row, index) => row.accountNo ?? row.agentId ?? row.fdId ?? `${row.year}-${row.month}-${row.planCode}-${index}`} loading={selected.state.loading} emptyMessage="No data matches these filters." caption={selected.title} />
      </Card>
      <p className="report-note">CSV export downloads the rows currently returned by the API. Email delivery and PDF generation require a backend endpoint and are not part of this frontend-only report screen.</p>
    </div>
  );
}
