import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import { useSubmit } from '../../api/useApi';
import { deposit, withdraw } from '../../api/services/transactionService';
import { formatCurrency } from '../../utils/format';
import { isValidAmount, rules, validate } from '../../utils/validation';
import TransactionHistory from '../shared/TransactionHistory';
import '../Pages.css';

const TYPES = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdraw' },
];

const RULES = {
  accountNo: [rules.required('Account number'), rules.maxLength(15)],
  amount: [rules.required('Amount'), (value) => (isValidAmount(value) ? null : 'Enter a positive amount with at most 2 decimals.')],
  refText: [rules.maxLength(50)],
};

const EMPTY = { accountNo: '', amount: '', refText: '' };

export default function StaffTransactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const historyAccount = searchParams.get('account')?.trim() ?? '';
  const [type, setType] = useState('deposit');
  const [values, setValues] = useState(() => ({ ...EMPTY, accountNo: historyAccount }));
  const [errors, setErrors] = useState({});
  const [lookup, setLookup] = useState(historyAccount);
  const [receipt, setReceipt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { submit, submitting, error, reset } = useSubmit((kind, input) => (kind === 'deposit' ? deposit(input) : withdraw(input)));

  const showHistory = (accountNo) => setSearchParams(accountNo ? { account: accountNo } : {});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setReceipt(null);
    const validationErrors = validate(values, RULES);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const accountNo = values.accountNo.trim();
    const result = await submit(type, { accountNo, amount: values.amount.trim(), refText: values.refText });
    if (result) {
      setReceipt({ ...result, type });
      setValues({ ...EMPTY, accountNo });
      setLookup(accountNo);
      showHistory(accountNo);
      setRefreshKey((key) => key + 1);
    }
  };

  return (
    <div className="page">
      <PageHeader title="Transactions" description="Record deposits and withdrawals, and review an account's history." />

      <div className="two-column">
        <Card title="New transaction">
          <form onSubmit={handleSubmit} noValidate className="stack">
            <Tabs
              tabs={TYPES}
              value={type}
              onChange={(next) => {
                setType(next);
                reset();
                setReceipt(null);
              }}
              label="Transaction type"
            />

            {receipt && (
              <Alert variant="success" title={receipt.type === 'deposit' ? 'Deposit recorded' : 'Withdrawal recorded'}>
                Txn <span className="result-value">#{receipt.txnId}</span> · {formatCurrency(receipt.amount)} on{' '}
                {receipt.accountNo}. New balance: <strong>{formatCurrency(receipt.balanceAfter)}</strong>
              </Alert>
            )}
            {error && (
              <Alert variant="error" title="Transaction refused" onClose={reset}>
                {error}
              </Alert>
            )}

            <FormField label="Account number" error={errors.accountNo} required>
              <Input name="accountNo" value={values.accountNo} onChange={handleChange} maxLength={15} disabled={submitting} />
            </FormField>
            <FormField label="Amount (LKR)" error={errors.amount} required>
              <Input name="amount" inputMode="decimal" value={values.amount} onChange={handleChange} disabled={submitting} />
            </FormField>
            <FormField label="Reference" error={errors.refText} hint="Optional, up to 50 characters.">
              <Input name="refText" value={values.refText} onChange={handleChange} maxLength={50} disabled={submitting} />
            </FormField>

            <div className="form-actions">
              <Button
                type="submit"
                icon={type === 'deposit' ? ArrowDownLeft : ArrowUpRight}
                variant={type === 'deposit' ? 'primary' : 'danger'}
                loading={submitting}
              >
                {type === 'deposit' ? 'Record deposit' : 'Record withdrawal'}
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Transaction history" description={historyAccount ? `Account ${historyAccount}, newest first.` : undefined}>
          <div className="stack">
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                showHistory(lookup.trim());
              }}
            >
              <FormField label="Account number">
                <Input value={lookup} onChange={(event) => setLookup(event.target.value)} maxLength={15} />
              </FormField>
              <Button type="submit" variant="secondary" icon={Search}>
                Show history
              </Button>
            </form>
            {historyAccount ? (
              <TransactionHistory accountNo={historyAccount} refreshKey={refreshKey} />
            ) : (
              <EmptyState
                title="No account selected"
                message="Enter an account number, or record a transaction, to see its history."
                compact
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}