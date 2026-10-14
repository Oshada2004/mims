import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CirclePlus, UserPlus } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs';
import { useSubmit } from '../../api/useApi';
import {
  createAdult,
  createMinorExistingGuardian,
  createMinorNewGuardian,
} from '../../api/services/customerService';
import { toAmountString } from '../../utils/normalize';
import { ageInYears, rules, validate } from '../../utils/validation';
import CustomerPicker from './CustomerPicker';
import '../Pages.css';

const TYPES = [
  { value: 'adult', label: 'Adult' },
  { value: 'minor-new', label: 'Minor — new guardian' },
  { value: 'minor-existing', label: 'Minor — existing guardian' },
];

const RELATIONS = [
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'LEGAL_GUARDIAN', label: 'Legal guardian' },
];

function personRules(prefix, { label, minAge, maxAge, withNic }) {
  const r = rules;
  const out = {
    [`${prefix}first_name`]: [r.required('First name'), r.maxLength(100)],
    [`${prefix}last_name`]: [r.required('Last name'), r.maxLength(100)],
    [`${prefix}dob`]: [
      r.required('Date of birth'),
      r.date(),
      r.notFuture(),
      ...(minAge !== undefined ? [r.minAge(minAge, `${label} must be at least ${minAge} years old.`)] : []),
      ...(maxAge !== undefined ? [r.maxAge(maxAge, `${label} must be under ${maxAge + 1} years old.`)] : []),
    ],
    [`${prefix}phone_number`]: [r.required('Phone'), r.phone()],
    [`${prefix}address`]: [r.required('Address'), r.maxLength(100)],
    [`${prefix}postal_code`]: [r.required('Postal code'), r.maxLength(6)],
  };
  if (withNic) out[`${prefix}nic`] = [r.required('NIC'), r.nic()];
  return out;
}

const RULES = {
  adult: {
    ...personRules('', { label: 'An adult customer', minAge: 18, withNic: true }),
    tax_id: [rules.maxLength(20)],
    occupation: [rules.maxLength(50)],
    monthly_income: [rules.amount({ allowZero: true })],
  },
  'minor-new': {
    ...personRules('minor_', { label: 'A minor', maxAge: 17 }),
    birth_cert_no: [rules.required('Birth certificate number'), rules.maxLength(12)],
    ...personRules('guardian_', { label: 'The guardian', minAge: 18, withNic: true }),
    relation: [rules.required('Relationship')],
  },
  'minor-existing': {
    ...personRules('minor_', { label: 'A minor', maxAge: 17 }),
    birth_cert_no: [rules.required('Birth certificate number'), rules.maxLength(12)],
    guardian_person_id: [rules.required('Guardian'), rules.positiveInteger('Guardian ID')],
    relation: [rules.required('Relationship')],
  },
};

const OPTIONAL_FIELDS = ['tax_id', 'occupation', 'monthly_income'];

function emptyValues(type) {
  return Object.fromEntries(Object.keys(RULES[type]).map((field) => [field, '']));
}

/** Request body: every procedure parameter, trimmed; empty optional fields are sent as null. */
function toPayload(type, values) {
  const body = {};
  for (const field of Object.keys(RULES[type])) {
    const value = String(values[field] ?? '').trim();
    body[field] = value === '' && OPTIONAL_FIELDS.includes(field) ? null : value;
  }
  if (body.monthly_income) body.monthly_income = toAmountString(body.monthly_income);
  if (body.nic) body.nic = body.nic.toUpperCase();
  if (body.guardian_nic) body.guardian_nic = body.guardian_nic.toUpperCase();
  if (type === 'minor-existing') body.guardian_person_id = Number(body.guardian_person_id);
  return body;
}

const CREATE = {
  adult: createAdult,
  'minor-new': createMinorNewGuardian,
  'minor-existing': createMinorExistingGuardian,
};

export default function RegisterCustomer() {
  const navigate = useNavigate();
  const [type, setType] = useState('adult');
  const [values, setValues] = useState(() => emptyValues('adult'));
  const [errors, setErrors] = useState({});
  const [guardian, setGuardian] = useState(null);
  const [created, setCreated] = useState(null);
  const { submit, submitting, error, reset } = useSubmit((kind, body) => CREATE[kind](body));

  const prefix = type === 'adult' ? '' : 'minor_';

  const changeType = (next) => {
    setType(next);
    setValues(emptyValues(next));
    setErrors({});
    setGuardian(null);
    setCreated(null);
    reset();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const pickGuardian = (customer) => {
    setGuardian(customer);
    setValues((current) => ({ ...current, guardian_person_id: customer ? String(customer.personId) : '' }));
    setErrors((current) => ({ ...current, guardian_person_id: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCreated(null);
    const validationErrors = validate(values, RULES[type]);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const result = await submit(type, toPayload(type, values));
    if (result) {
      const firstName = values[`${prefix}first_name`].trim();
      const lastName = values[`${prefix}last_name`].trim();
      setCreated({
        ...result,
        fullName: `${firstName} ${lastName}`,
        customer: {
          personId: result.personId,
          fullName: `${firstName} ${lastName}`,
          dob: values[`${prefix}dob`],
          idNumber: type === 'adult' ? values.nic.trim().toUpperCase() : values.birth_cert_no.trim(),
          type: type === 'adult' ? 'ADULT' : 'MINOR',
        },
      });
      setValues(emptyValues(type));
      setGuardian(null);
    }
  };

  const field = (name, label, props = {}, className) => (
    <FormField label={label} error={errors[name]} required={!OPTIONAL_FIELDS.includes(name)} className={className}>
      <Input name={name} value={values[name] ?? ''} onChange={handleChange} disabled={submitting} {...props} />
    </FormField>
  );

  const personFields = (p) => (
    <>
      {field(`${p}first_name`, 'First name', { autoComplete: 'off', maxLength: 100 })}
      {field(`${p}last_name`, 'Last name', { autoComplete: 'off', maxLength: 100 })}
      {field(`${p}dob`, 'Date of birth', { type: 'date' })}
      {p !== 'minor_' && field(`${p}nic`, 'NIC number', { maxLength: 12 })}
      {p === 'minor_' && field('birth_cert_no', 'Birth certificate number', { maxLength: 12 })}
      {field(`${p}phone_number`, 'Phone', { type: 'tel', maxLength: 12 })}
      {field(`${p}postal_code`, 'Postal code', { maxLength: 6 })}
      {field(`${p}address`, 'Address', { maxLength: 100 }, 'form-grid__full')}
    </>
  );

  return (
    <div className="page">
      <PageHeader title="Register customer" description="Create a profile for an adult or a minor customer." />

      <Tabs tabs={TYPES} value={type} onChange={changeType} label="Customer type" />

      {created && (
        <Alert variant="success" title="Customer registered" onClose={() => setCreated(null)}>
          <p>
            {created.fullName} — person ID <span className="result-value">{created.personId}</span>
            {created.guardianPersonId && (
              <>
                {' '}· guardian ID <span className="result-value">{created.guardianPersonId}</span>
              </>
            )}
          </p>
          <div className="form-actions form-actions--start">
            <Button
              size="sm"
              icon={CirclePlus}
              onClick={() => navigate('/staff/open-account', { state: { customer: created.customer } })}
            >
              Open an account for this customer
            </Button>
          </div>
        </Alert>
      )}
      {error && (
        <Alert variant="error" title="Registration failed" onClose={reset}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="stack">
        <Card title={type === 'adult' ? 'Customer details' : 'Minor details'}>
          <div className="form-grid">{personFields(prefix)}</div>
        </Card>

        {type === 'adult' && (
          <Card title="Employment (optional)">
            <div className="form-grid">
              {field('occupation', 'Occupation', { maxLength: 50 })}
              {field('monthly_income', 'Monthly income (LKR)', { inputMode: 'decimal' })}
              {field('tax_id', 'Tax ID', { maxLength: 20 })}
            </div>
          </Card>
        )}

        {type === 'minor-new' && (
          <Card title="Guardian details" description="The guardian is registered as a new person.">
            <div className="form-grid">{personFields('guardian_')}</div>
          </Card>
        )}

        {type === 'minor-existing' && (
          <Card title="Guardian" description="Pick an existing adult customer as the guardian.">
            <CustomerPicker
              value={guardian}
              onChange={pickGuardian}
              isSelectable={(customer) => customer.type === 'ADULT' && (ageInYears(customer.dob) ?? 0) >= 18}
              disabledReason="Only adult customers can be guardians."
            />
            {errors.guardian_person_id && (
              <p className="form-field__error picker-error" role="alert">
                {errors.guardian_person_id}
              </p>
            )}
          </Card>
        )}

        {type !== 'adult' && (
          <Card title="Relationship">
            <div className="form-grid">
              <FormField label="Guardian's relationship to the minor" error={errors.relation} required>
                <Select
                  name="relation"
                  options={RELATIONS}
                  placeholder="Select relationship"
                  value={values.relation}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </FormField>
            </div>
          </Card>
        )}

        <div className="form-actions">
          <Button type="submit" icon={UserPlus} loading={submitting}>
            Register customer
          </Button>
        </div>
      </form>
    </div>
  );
}