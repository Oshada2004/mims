import { useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import '../Pages.css';

const CUSTOMER_TYPES = [
  { value: 'adult', label: 'Adult' },
  { value: 'minor-new-guardian', label: 'Minor — new guardian' },
  { value: 'minor-existing-guardian', label: 'Minor — existing guardian' },
];

const RELATIONS = [
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'LEGAL_GUARDIAN', label: 'Legal guardian' },
];

export default function RegisterCustomer() {
  const [type, setType] = useState('adult');
  const isAdult = type === 'adult';
  const prefix = isAdult ? '' : 'minor_';

  return (
    <div className="page">
      <PageHeader title="Register customer" description="Create a profile for an adult or minor customer." />
      <Alert>This page will let staff register new customers, including minors and their guardians.</Alert>

      <Card>
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <FormField label="Customer type" className="form-grid__full">
              <Select options={CUSTOMER_TYPES} value={type} onChange={(event) => setType(event.target.value)} />
            </FormField>

            <p className="form-grid__section">{isAdult ? 'Customer details' : 'Minor details'}</p>
            <FormField label="First name" required>
              <Input name={`${prefix}first_name`} />
            </FormField>
            <FormField label="Last name" required>
              <Input name={`${prefix}last_name`} />
            </FormField>
            <FormField label="Date of birth" required>
              <Input name={`${prefix}dob`} type="date" />
            </FormField>
            {isAdult ? (
              <FormField label="NIC number" required>
                <Input name="nic" />
              </FormField>
            ) : (
              <FormField label="Birth certificate number" required>
                <Input name="birth_cert_no" />
              </FormField>
            )}
            <FormField label="Phone">
              <Input name={`${prefix}phone_number`} type="tel" />
            </FormField>
            <FormField label="Postal code">
              <Input name={`${prefix}postal_code`} />
            </FormField>
            <FormField label="Address" className="form-grid__full">
              <Input name={`${prefix}address`} />
            </FormField>

            {isAdult && (
              <>
                <FormField label="Tax ID">
                  <Input name="tax_id" />
                </FormField>
                <FormField label="Occupation">
                  <Input name="occupation" />
                </FormField>
                <FormField label="Monthly income (LKR)">
                  <Input name="monthly_income" type="number" min="0" step="0.01" />
                </FormField>
              </>
            )}

            {type === 'minor-new-guardian' && (
              <>
                <p className="form-grid__section">Guardian details</p>
                <FormField label="Guardian first name" required>
                  <Input name="guardian_first_name" />
                </FormField>
                <FormField label="Guardian last name" required>
                  <Input name="guardian_last_name" />
                </FormField>
                <FormField label="Guardian date of birth" required>
                  <Input name="guardian_dob" type="date" />
                </FormField>
                <FormField label="Guardian NIC" required>
                  <Input name="guardian_nic" />
                </FormField>
                <FormField label="Guardian phone">
                  <Input name="guardian_phone_number" type="tel" />
                </FormField>
                <FormField label="Guardian postal code">
                  <Input name="guardian_postal_code" />
                </FormField>
                <FormField label="Guardian address" className="form-grid__full">
                  <Input name="guardian_address" />
                </FormField>
              </>
            )}

            {type === 'minor-existing-guardian' && (
              <>
                <p className="form-grid__section">Guardian</p>
                <FormField label="Guardian person ID" required>
                  <Input name="guardian_person_id" inputMode="numeric" />
                </FormField>
              </>
            )}

            {!isAdult && (
              <FormField label="Relationship to minor" required>
                <Select name="relation" options={RELATIONS} placeholder="Select relationship" defaultValue="" />
              </FormField>
            )}
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