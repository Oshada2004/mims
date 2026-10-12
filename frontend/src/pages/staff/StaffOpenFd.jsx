import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PiggyBank, Search } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import { useApi, useSubmit } from '../../api/useApi';
import { getAccount } from '../../api/services/accountService';
import { listFdPlans } from '../../api/services/bankService';
import { openFd } from '../../api/services/fdService';
import { STATUS_BADGE } from '../../constants/status';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, formatPercent } from '../../utils/format';
import { isValidAmount } from '../../utils/validation';
import '../Pages.css';

function termLabel(plan) {
  return plan.months % 12 === 0 ? `${plan.months / 12} year${plan.months === 12 ? '' : 's'}` : `${plan.months} months`;
}

export default function StaffOpenFd() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountNo = searchParams.get('account')?.trim() ?? '';
  const [accountInput, setAccountInput] = useState(accountNo);
  const [termCode, setTermCode] = useState('');
  const [principal, setPrincipal] = useState('');
  const [errors, setErrors] = useState({});
  const [opened, setOpened] = useState(null);

  const account = useApi((signal) => (accountNo ? getAccount(accountNo, { signal }) : null), [accountNo]);
  const plans = useApi((signal) => listFdPlans(undefined, { signal }), []);
  const { submit, submitting, error, reset } = useSubmit(openFd);

  const acc = account.data && account.data.accountNo === accountNo ? account.data : null;
  const plan = plans.data?.items.find((item) => item.termCode === termCode) ?? null;
  const notMine = acc && acc.agentPersonId !== user.person_id;
  const notActive = acc && acc.status !== 'ACTIVE';
  const monthlyInterest = plan && isValidAmount(principal) ? (Number(principal) * plan.interestRate) / 100 / 12 : null;

  const lookUp = (event) => {
    event.preventDefault();
    const next = accountInput.trim();
    setOpened(null);
    reset();
    setSearchParams(next ? { account: next } : {});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setOpened(null);
    const nextErrors = {};
    if (!plan) nextErrors.termCode = 'Choose a term.';
    if (!isValidAmount(principal)) nextErrors.principal = 'Enter a positive amount with at most 2 decimals.';
    else if (acc && Number(principal) > acc.balance) {
      nextErrors.principal = `The account balance is only ${formatCurrency(acc.balance)}.`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = await submit({ savingsAccountNo: acc.accountNo, termCode, principal: principal.trim() });
    if (result) {
      setOpened({ ...result, term: termLabel(plan), rate: plan.interestRate });
      setTermCode('');
      setPrincipal('');
      account.refetch();
    }
  };

  return (
    <div className="page">
      <PageHeader title="Open fixed deposit" description="Open an FD funded from a customer's savings account." />

      {opened && (
        <Alert variant="success" title="Fixed deposit opened" onClose={() => setOpened(null)}>
          FD <span className="result-value">{opened.fdId}</span> — {formatCurrency(opened.principal)} for{' '}
          {opened.term} at {formatPercent(opened.rate)}, linked to {opened.accountNo}.
        </Alert>
      )}
      {error && (
        <Alert variant="error" title="Could not open the fixed deposit" onClose={reset}>
          {error}
        </Alert>
      )}

      <Card title="1. Savings account">
        <form className="inline-form" onSubmit={lookUp} noValidate>
          <FormField label="Account number">
            <Input
              name="accountNo"
              value={accountInput}
              onChange={(event) => setAccountInput(event.target.value)}
              placeholder="e.g. SA0123456789"
              maxLength={15}
            />
          </FormField>
          <Button type="submit" variant="secondary" icon={Search} loading={account.loading && Boolean(accountNo)}>
            Look up
          </Button>
        </form>

        {accountNo && account.loading && !acc && <Spinner label="Loading account" />}
        {accountNo && account.error && (
          <Alert variant="error" title="Account not found">
            {account.error}
          </Alert>
        )}
        {acc && (
          <div className="stack section-gap">
            <dl className="summary-grid">
              <div>
                <dt>Account</dt>
                <dd>{acc.accountNo}</dd>
              </div>
              <div>
                <dt>Holders</dt>
                <dd>{acc.holders.map((holder) => holder.fullName).join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{acc.planCode}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge variant={STATUS_BADGE[acc.status] ?? 'neutral'}>{acc.status}</Badge>
                </dd>
              </div>
              <div>
                <dt>Balance</dt>
                <dd>{formatCurrency(acc.balance)}</dd>
              </div>
              <div>
                <dt>Opened</dt>
                <dd>{formatDate(acc.openedDate)}</dd>
              </div>
            </dl>
            {notActive && <Alert variant="error">Only an ACTIVE account can fund a fixed deposit.</Alert>}
            {notMine && (
              <Alert variant="error">
                This account is managed by another agent. Only the account&apos;s own agent can open an FD on it.
              </Alert>
            )}
          </div>
        )}
      </Card>

      {acc && !notActive && !notMine && (
        <form onSubmit={handleSubmit} noValidate className="stack">
          <Card title="2. Term and principal">
            {plans.error && <Alert variant="error">{plans.error}</Alert>}
            {plans.loading && !plans.data && <Spinner label="Loading FD plans" />}
            {plans.data && (
              <div className="stack">
                <div className="choice-list" role="radiogroup" aria-label="FD term">
                  {plans.data.items.map((item) => (
                    <button
                      key={item.termCode}
                      type="button"
                      role="radio"
                      aria-checked={item.termCode === termCode}
                      className={['choice', item.termCode === termCode && 'choice--selected'].filter(Boolean).join(' ')}
                      disabled={submitting}
                      onClick={() => {
                        setTermCode(item.termCode);
                        setErrors((current) => ({ ...current, termCode: undefined }));
                      }}
                    >
                      <span className="choice__title">{termLabel(item)}</span>
                      <span className="choice__meta">{formatPercent(item.interestRate)} p.a.</span>
                    </button>
                  ))}
                </div>
                {errors.termCode && (
                  <p className="form-field__error" role="alert">
                    {errors.termCode}
                  </p>
                )}
                <div className="form-grid">
                  <FormField
                    label="Principal (LKR)"
                    error={errors.principal}
                    hint={`Available balance: ${formatCurrency(acc.balance)}`}
                    required
                  >
                    <Input
                      name="principal"
                      inputMode="decimal"
                      value={principal}
                      onChange={(event) => {
                        setPrincipal(event.target.value);
                        setErrors((current) => ({ ...current, principal: undefined }));
                      }}
                      disabled={submitting}
                    />
                  </FormField>
                </div>
                {monthlyInterest !== null && (
                  <p className="text-muted">
                    Estimated interest: about {formatCurrency(monthlyInterest)} per month, paid into {acc.accountNo}.
                  </p>
                )}
              </div>
            )}
          </Card>

          <div className="form-actions">
            <Button type="submit" icon={PiggyBank} loading={submitting}>
              Open fixed deposit
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
