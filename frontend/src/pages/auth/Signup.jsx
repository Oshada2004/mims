import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import { getErrorMessage } from '../../api/client';
import { ROLE_HOME, ROLES } from '../../constants/roles';
import { useAuth } from '../../context/AuthContext';
import { useBank } from '../../context/BankContext';
import './auth.css';

const INITIAL_VALUES = {
  first_name: '',
  last_name: '',
  dob: '',
  nic: '',
  phone_number: '',
  address: '',
  postal_code: '',
  email: '',
  username: '',
  password: '',
  confirm_password: '',
};

const REQUIRED_FIELDS = Object.keys(INITIAL_VALUES);
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values) {
  const errors = {};

  REQUIRED_FIELDS.forEach((field) => {
    if (!values[field].trim()) errors[field] = 'This field is required.';
  });

  if (values.email && !EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (values.password && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (values.confirm_password && values.confirm_password !== values.password) {
    errors.confirm_password = 'Passwords do not match.';
  }

  return errors;
}

/** Customer self registration. Staff and admin accounts are created by an admin. */
export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bank = useBank();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // confirm_password is client-side only.
    const { confirm_password: _confirm, ...payload } = values;
    payload.username = payload.username.trim();

    setSubmitting(true);
    try {
      const user = await signup(payload);
      navigate(ROLE_HOME[user?.role] ?? ROLE_HOME[ROLES.CUSTOMER], { replace: true });
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'We could not create your account. Please try again.'));
      setSubmitting(false);
    }
  };

  const field = (name, label, inputProps = {}, className) => (
    <FormField label={label} error={errors[name]} required className={className}>
      <Input name={name} value={values[name]} onChange={handleChange} {...inputProps} />
    </FormField>
  );

  return (
    <AuthLayout
      wide
      title="Open your customer account"
      description={`Register online to access your ${bank?.bank_name ?? 'bank'} accounts.`}
      footer={
        <>
          Already registered? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {submitError && <Alert variant="error">{submitError}</Alert>}

        <div className="auth-form__grid">
          <p className="auth-form__section-title">Personal details</p>
          {field('first_name', 'First name', { autoComplete: 'given-name' })}
          {field('last_name', 'Last name', { autoComplete: 'family-name' })}
          {field('dob', 'Date of birth', { type: 'date', autoComplete: 'bday' })}
          {field('nic', 'NIC number')}

          <p className="auth-form__section-title">Contact</p>
          {field('phone_number', 'Phone', { type: 'tel', autoComplete: 'tel' })}
          {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {field('address', 'Address', { autoComplete: 'street-address' }, 'auth-form__full')}
          {field('postal_code', 'Postal code', { autoComplete: 'postal-code' })}

          <p className="auth-form__section-title">Login details</p>
          {field('username', 'Username', { autoComplete: 'username' }, 'auth-form__full')}
          {field('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
          {field('confirm_password', 'Confirm password', {
            type: 'password',
            autoComplete: 'new-password',
          })}
        </div>

        <Button type="submit" size="lg" icon={UserPlus} loading={submitting} fullWidth>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}