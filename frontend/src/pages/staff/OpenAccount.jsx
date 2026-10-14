import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CirclePlus } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import { useApi, useSubmit } from '../../api/useApi';
import { openAccount } from '../../api/services/accountService';
import { listSavingsPlans } from '../../api/services/bankService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPercent } from '../../utils/format';
import { ageInYears, isValidAmount } from '../../utils/validation';
import CustomerPicker from './CustomerPicker';
import '../Pages.css';

function ageRange(plan) {
  if (plan.maxAge === null) return `${plan.minAge}+ years`;
  return `${plan.minAge}–${plan.maxAge} years`;
}


function eligibilityProblem(plan, customer) {
  if (!plan || !customer) return null;
  const age = ageInYears(customer.dob);
  if (age === null) return null;
  if (age < plan.minAge || (plan.maxAge !== null && age > plan.maxAge)) {
    return `${customer.fullName} is ${age}; the ${plan.name} plan is for ${ageRange(plan)}.`;
  }
  return null;
}

export default function OpenAccount() {
  const { user } = useAuth();
  const location = useLocation();
  const [customer, setCustomer] = useState(() => location.state?.customer ?? null);
  const [planCode, setPlanCode] = useState('');
  const [deposit, setDeposit] = useState('');
  const [errors, setErrors] = useState({});
  const [opened, setOpened] = useState(null);

  const plans = useApi((signal) => listSavingsPlans(undefined, { signal }), []);
  const { submit, submitting, error, reset } = useSubmit(openAccount);

  const plan = plans.data?.items.find((item) => item.code === planCode) ?? null;
  const planProblem = eligibilityProblem(plan, customer);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setOpened(null);

    const nextErrors = {};
    if (!customer) nextErrors.customer = 'Select a customer.';
    if (!plan) nextErrors.planCode = 'Select a savings plan.';
    else if (planProblem) nextErrors.planCode = planProblem;
    if (!isValidAmount(deposit, { allowZero: true })) {
      nextErrors.deposit = 'Enter an amount with at most 2 decimals.';
    } else if (plan && Number(deposit) < plan.minBalance) {
      nextErrors.deposit = `The ${plan.name} plan needs at least ${formatCurrency(plan.minBalance)}.`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = await submit({ customerId: customer.personId, planCode, initialDeposit: deposit.trim() });
    if (result) {
      setOpened({ ...result, customerName: customer.fullName, planName: plan.name, deposit: Number(deposit) });
      setCustomer(null);
      setPlanCode('');
      setDeposit('');
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Open account"
        description={`Open a savings account at ${user.branch_name ?? 'your branch'}.`}
      />

      {opened && (
        <Alert variant="success" title="Account opened" onClose={() => setOpened(null)}>
          <p>
            Account <span className="result-value">{opened.accountNo}</span> ({opened.planName}) for{' '}
            {opened.customerName} with an initial deposit of {formatCurrency(opened.deposit)}.
          </p>
          <p>
            <Link to={`/staff/open-fd?account=${encodeURIComponent(opened.accountNo)}`}>Open a fixed deposit</Link>
            {' · '}
            <Link to={`/staff/transactions?account=${encodeURIComponent(opened.accountNo)}`}>View transactions</Link>
          </p>
        </Alert>
      )}
      {error && (
        <Alert variant="error" title="Could not open the account" onClose={reset}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="stack">
        <Card title="1. Customer">
          <CustomerPicker
            value={customer}
            onChange={(next) => {
              setCustomer(next);
              setErrors((current) => ({ ...current, customer: undefined, planCode: undefined }));
            }}
          />
          {errors.customer && (
            <p className="form-field__error picker-error" role="alert">
              {errors.customer}
            </p>
          )}
        </Card>

        <Card title="2. Savings plan">
          {plans.loading && !plans.data && <Spinner label="Loading plans" />}
          {plans.error && <Alert variant="error">{plans.error}</Alert>}
          {plans.data && (
            <div className="stack">
              <div className="choice-list" role="radiogroup" aria-label="Savings plan">
                {plans.data.items.map((item) => {
                  const problem = eligibilityProblem(item, customer);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      role="radio"
                      aria-checked={item.code === planCode}
                      className={['choice', item.code === planCode && 'choice--selected'].filter(Boolean).join(' ')}
                      disabled={submitting || Boolean(problem)}
                      title={problem ?? undefined}
                      onClick={() => {
                        setPlanCode(item.code);
                        setErrors((current) => ({ ...current, planCode: undefined, deposit: undefined }));
                      }}
                    >
                      <span className="choice__title">{item.name}</span>
                      <span className="choice__meta">{formatPercent(item.interestRate)} p.a.</span>
                      <span className="choice__meta">Ages {ageRange(item)}</span>
                      <span className="choice__meta">Min. {formatCurrency(item.minBalance)}</span>
                    </button>
                  );
                })}
              </div>
              {errors.planCode && (
                <p className="form-field__error" role="alert">
                  {errors.planCode}
                </p>
              )}
              {plan?.allowsJoint && (
                <Alert>Joint holders are added to the account after it is opened.</Alert>
              )}
              {plan && ['CHILD', 'TEEN'].includes(plan.code) && (
                <Alert>Child and teen accounts require the customer to have a linked guardian.</Alert>
              )}
            </div>
          )}
        </Card>

        <Card title="3. Initial deposit">
          <div className="form-grid">
            <FormField
              label="Initial deposit (LKR)"
              error={errors.deposit}
              hint={plan ? `Minimum for ${plan.name}: ${formatCurrency(plan.minBalance)}` : undefined}
              required
            >
              <Input
                name="initialDeposit"
                inputMode="decimal"
                value={deposit}
                onChange={(event) => {
                  setDeposit(event.target.value);
                  setErrors((current) => ({ ...current, deposit: undefined }));
                }}
                disabled={submitting}
              />
            </FormField>
          </div>
        </Card>

        <div className="form-actions">
          <Button type="submit" icon={CirclePlus} loading={submitting}>
            Open account
          </Button>
        </div>
      </form>
    </div>
  );
}