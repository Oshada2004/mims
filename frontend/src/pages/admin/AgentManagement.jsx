import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { useApi, useSubmit } from '../../api/useApi';
import { listBranches } from '../../api/services/bankService';
import { createStaff, listStaff } from '../../api/services/staffService';
import { formatLabel } from '../../utils/format';
import { toAmountString } from '../../utils/normalize';
import { isValidAmount, rules, validate } from '../../utils/validation';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import '../Pages.css';

const PAGE_SIZE = 10;
const FORM_ID = 'add-staff-form';

// Allowed values in staffController.
const STAFF_ROLES = ['AGENT', 'OFFICER', 'CASHIER', 'MANAGER', 'ADMIN'];
const DEPARTMENTS = ['OPERATIONS', 'CUSTOMER_SERVICE', 'CREDIT', 'IT'];
const toOptions = (values) => values.map((value) => ({ value, label: formatLabel(value) }));

const ROLE_BADGE = { ADMIN: 'accent', MANAGER: 'warning', AGENT: 'success' };

const COLUMNS = [
  { key: 'personId', header: 'ID' },
  { key: 'fullName', header: 'Name' },
  { key: 'username', header: 'Username', render: (row) => row.username ?? '—' },
  {
    key: 'staffRole',
    header: 'Role',
    render: (row) => <Badge variant={ROLE_BADGE[row.staffRole] ?? 'neutral'}>{formatLabel(row.staffRole)}</Badge>,
  },
  { key: 'department', header: 'Department', render: (row) => formatLabel(row.department) },
  { key: 'branchName', header: 'Branch' },
];

const EMPTY = {
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
  staff_role: 'AGENT',
  department: 'CUSTOMER_SERVICE',
  branch_id: '',
  salary: '',
};

// Mirrors validateStaffInput in staffController plus the staff age trigger.
const RULES = {
  first_name: [rules.required('First name'), rules.maxLength(100)],
  last_name: [rules.required('Last name'), rules.maxLength(100)],
  dob: [rules.required('Date of birth'), rules.date(), rules.notFuture(), rules.minAge(18, 'Staff must be at least 18 years old.')],
  nic: [rules.required('NIC'), rules.nic()],
  phone_number: [rules.required('Phone'), rules.phone()],
  address: [rules.required('Address'), rules.maxLength(100)],
  postal_code: [rules.required('Postal code'), rules.maxLength(6)],
  email: [
    rules.required('Email'),
    rules.maxLength(50),
    (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Enter a valid email address.'),
  ],
  username: [rules.required('Username'), rules.maxLength(50)],
  password: [
    rules.required('Password'),
    (value) => (value.length >= 8 && value.length <= 128 ? null : 'Password must be 8–128 characters.'),
  ],
  staff_role: [rules.required('Role')],
  department: [rules.required('Department')],
  branch_id: [rules.required('Branch')],
  salary: [
    rules.required('Salary'),
    (value) => (isValidAmount(value, { allowZero: true }) && value.split('.')[0].length <= 10 ? null : 'Enter a salary with at most 2 decimals.'),
  ],
};

function AddStaffModal({ open, onClose, onCreated }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const branches = useApi((signal) => (open ? listBranches({ limit: 100 }, { signal }) : null), [open]);
  const { submit, submitting, error, reset } = useSubmit(createStaff);

  const close = () => {
    if (submitting) return;
    setValues(EMPTY);
    setErrors({});
    reset();
    onClose();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(values, RULES);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const body = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, key === 'password' ? value : value.trim()]));
    body.nic = body.nic.toUpperCase();
    body.branch_id = Number(body.branch_id);
    body.salary = toAmountString(body.salary);

    const result = await submit(body);
    if (result) {
      setValues(EMPTY);
      setErrors({});
      onCreated(result);
    }
  };

  const field = (name, label, props = {}) => (
    <FormField label={label} error={errors[name]} required>
      <Input name={name} value={values[name]} onChange={handleChange} disabled={submitting} {...props} />
    </FormField>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add staff member"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} icon={UserPlus} loading={submitting}>
            Create staff member
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="stack">
        {error && (
          <Alert variant="error" title="Could not create the staff member" onClose={reset}>
            {error}
          </Alert>
        )}
        <div className="form-grid">
          <p className="form-grid__section">Personal details</p>
          {field('first_name', 'First name', { maxLength: 100 })}
          {field('last_name', 'Last name', { maxLength: 100 })}
          {field('dob', 'Date of birth', { type: 'date' })}
          {field('nic', 'NIC number', { maxLength: 12 })}
          {field('phone_number', 'Phone', { type: 'tel', maxLength: 12 })}
          {field('postal_code', 'Postal code', { maxLength: 6 })}
          <div className="form-grid__full">{field('address', 'Address', { maxLength: 100 })}</div>

          <p className="form-grid__section">Job</p>
          <FormField label="Staff role" error={errors.staff_role} required>
            <Select name="staff_role" value={values.staff_role} onChange={handleChange} options={toOptions(STAFF_ROLES)} disabled={submitting} />
          </FormField>
          <FormField label="Department" error={errors.department} required>
            <Select name="department" value={values.department} onChange={handleChange} options={toOptions(DEPARTMENTS)} disabled={submitting} />
          </FormField>
          <FormField label="Branch" error={errors.branch_id ?? branches.error} required>
            <Select
              name="branch_id"
              value={values.branch_id}
              onChange={handleChange}
              placeholder={branches.loading ? 'Loading branches…' : 'Select a branch'}
              options={(branches.data?.items ?? []).map((branch) => ({ value: String(branch.branchId), label: branch.name }))}
              disabled={submitting}
            />
          </FormField>
          {field('salary', 'Monthly salary (LKR)', { inputMode: 'decimal' })}

          <p className="form-grid__section">Login</p>
          {field('email', 'Email', { type: 'email', maxLength: 50, autoComplete: 'off' })}
          {field('username', 'Username', { maxLength: 50, autoComplete: 'off' })}
          {field('password', 'Temporary password', { type: 'password', autoComplete: 'new-password' })}
        </div>
        {values.staff_role === 'ADMIN' && (
          <Alert>Staff with the Admin role can also sign in to these admin pages.</Alert>
        )}
      </form>
    </Modal>
  );
}

export default function AgentManagement() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [created, setCreated] = useState(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const staff = useApi(
    (signal) => listStaff({ search: debouncedSearch, limit: PAGE_SIZE, offset }, { signal }),
    [debouncedSearch, offset],
  );

  return (
    <div className="page">
      <PageHeader
        title="Agents and staff"
        description="Everyone who works at the bank, with their role and branch."
        actions={
          <Button icon={UserPlus} onClick={() => setModalOpen(true)}>
            Add staff
          </Button>
        }
      />

      {created && (
        <Alert variant="success" title="Staff member created" onClose={() => setCreated(null)}>
          {formatLabel(created.staffRole)} <strong>{created.username}</strong> (person ID{' '}
          <span className="result-value">{created.personId}</span>) can now sign in.
        </Alert>
      )}

      <Card description={staff.data ? `${staff.data.total} staff members` : undefined}>
        <div className="stack">
          <SearchBar
            value={search}
            onChange={(next) => {
              setSearch(next);
              setOffset(0);
            }}
            placeholder="Search by name, username, role or branch"
            label="Search staff"
          />
          {staff.error && <Alert variant="error">{staff.error}</Alert>}
          <Table
            columns={COLUMNS}
            rows={staff.data?.items ?? []}
            rowKey={(row) => row.personId}
            loading={staff.loading && !staff.data}
            emptyMessage={debouncedSearch ? 'No staff match your search.' : 'No staff members yet.'}
            caption="Staff"
          />
          <Pagination
            total={staff.data?.total ?? 0}
            limit={PAGE_SIZE}
            offset={offset}
            onChange={setOffset}
            disabled={staff.loading}
          />
        </div>
      </Card>

      <AddStaffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(result) => {
          setModalOpen(false);
          setCreated(result);
          staff.refetch();
        }}
      />
    </div>
  );
}
