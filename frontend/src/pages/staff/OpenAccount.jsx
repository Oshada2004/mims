import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import '../Pages.css';

const SAVINGS_PLANS = [
  { value: 'CHILD', label: 'Child' },
  { value: 'TEEN', label: 'Teen' },
  { value: 'ADULT', label: 'Adult' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'JOINT', label: 'Joint' },
];

export default function OpenAccount() {
  const { user } = useAuth();

  return (
    <div className="page">
      <PageHeader title="Open account" description="Open a savings account for a registered customer." />
      <Alert>This page will let staff open savings accounts for customers.</Alert>

      <Card>
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <FormField label="Branch ID" hint="Your branch.">
              <Input name="branchId" defaultValue={user.branch_id ?? ''} readOnly />
            </FormField>
            <FormField label="Agent person ID" hint="You, as the opening agent.">
              <Input name="agentPersonId" defaultValue={user.person_id ?? ''} readOnly />
            </FormField>
            <FormField label="Customer ID" required>
              <Input name="customerId" inputMode="numeric" />
            </FormField>
            <FormField label="Savings plan" required>
              <Select name="planCode" options={SAVINGS_PLANS} placeholder="Select a plan" defaultValue="" />
            </FormField>
            <FormField label="Initial deposit (LKR)" required>
              <Input name="initialDeposit" type="number" min="0" step="0.01" />
            </FormField>
          </div>

          <div className="form-actions">
            <Button type="submit" disabled>
              Coming soon
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}