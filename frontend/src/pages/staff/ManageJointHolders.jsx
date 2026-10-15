import { useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import { useSubmit } from '../../api/useApi';
import { addJointHolder, getAccount } from '../../api/services/accountService';
import { ageInYears } from '../../utils/validation';
import CustomerPicker from './CustomerPicker';

export default function ManageJointHolders({ defaultAccountNo = '', plans }) {
  const [accountInput, setAccountInput] = useState(defaultAccountNo);
  const [account, setAccount] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [message, setMessage] = useState('');
  const lookup = useSubmit(getAccount);
  const add = useSubmit(addJointHolder);
  const busy = lookup.submitting || add.submitting;
  const plan = plans.data?.items.find((item) => item.code === account?.planCode);
  const canAdd = account?.status === 'ACTIVE' && plan?.allowsJoint && !plans.loading && !plans.error;
  const isSelectable = (person) => {
    const age = ageInYears(person.dob);
    return age !== null && age >= 18 && !account?.holders.some((holder) => Number(holder.personId) === Number(person.personId));
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    setAccount(null);
    setCustomer(null);
    setMessage('');
    add.reset();
    const result = await lookup.submit(accountInput.trim());
    if (result) setAccount(result);
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!canAdd || !customer || !isSelectable(customer) || busy) return;
    setMessage('');
    const result = await add.submit(account.accountNo, customer.personId);
    if (result) {
      setAccount((current) => ({ ...current, holders: [...current.holders, { ...customer, role: 'JOINT' }] }));
      setMessage(result.message || 'Joint holder added successfully.');
      setCustomer(null);
    }
  };

  return (
    <Card title="Add a joint holder" description="Use this section after opening an account, or look up an existing account.">
      <div className="stack">
        <form onSubmit={handleLookup} className="inline-form">
          <FormField label="Savings account number" required>
            <Input value={accountInput} maxLength={15} required disabled={busy}
              onChange={(event) => {
                setAccountInput(event.target.value);
                setAccount(null);
                setCustomer(null);
                setMessage('');
                lookup.reset();
                add.reset();
              }} />
          </FormField>
          <Button type="submit" loading={lookup.submitting} disabled={add.submitting || !accountInput.trim()}>Look up account</Button>
        </form>
        {lookup.error && <Alert variant="error">{lookup.error}</Alert>}
        {account && (
          <div className="stack">
            <p><strong>{account.accountNo}</strong> · {account.planCode} · {account.status}</p>
            <p>Current holders: {account.holders.map((holder) => holder.fullName).join(', ') || 'None'}</p>
            {account.status !== 'ACTIVE' && <Alert>Only active accounts can accept joint holders.</Alert>}
            {plans.error && <Alert variant="error">Unable to check the savings plan: {plans.error}</Alert>}
            {plans.loading && <p>Checking joint-account eligibility…</p>}
            {!plans.loading && !plans.error && !plan && <Alert>Unable to find this account's savings plan.</Alert>}
            {plan && !plan.allowsJoint && <Alert>This savings plan does not permit joint ownership.</Alert>}
            {canAdd && (
              <form onSubmit={handleAdd} className="stack">
                <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <legend>Select another adult customer</legend>
                  <CustomerPicker value={customer} onChange={(person) => { setCustomer(person); setMessage(''); add.reset(); }}
                    isSelectable={isSelectable} disabledReason="Joint holders must be at least 18 and must not already hold this account." />
                </fieldset>
                <Button type="submit" loading={add.submitting} disabled={busy || !customer || !isSelectable(customer)}>Add joint holder</Button>
              </form>
            )}
          </div>
        )}
        {add.error && <Alert variant="error">{add.error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}
      </div>
    </Card>
  );
}
