import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import '../Pages.css';

const FD_TERMS = [
  { value: '6M', label: '6 months' },
  { value: '1Y', label: '1 year' },
  { value: '3Y', label: '3 years' },
];

// Body: { savingsAccountNo, termCode, principal } (fdService.openFd).
export default function StaffOpenFd() {
  return (
    <div className="page">
      <PageHeader title="Open fixed deposit" description="Open an FD linked to a customer's savings account." />
      <Alert>This page will let staff open fixed deposits for customers.</Alert>

      <Card>
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <FormField label="Savings account number" required className="form-grid__full">
              <Input name="savingsAccountNo" />
            </FormField>
            <FormField label="Term" required>
              <Select name="termCode" options={FD_TERMS} placeholder="Select a term" defaultValue="" />
            </FormField>
            <FormField label="Principal (LKR)" required>
              <Input name="principal" type="number" min="0" step="0.01" />
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
