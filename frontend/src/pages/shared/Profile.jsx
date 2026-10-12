import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { ROLE_LABELS } from '../../constants/navigation';
import { useAuth } from '../../context/AuthContext';
import { formatLabel } from '../../utils/format';
import '../Pages.css';

/** Read-only view of the signed-in user, as returned by GET /auth/me (shared by all roles). */
export default function Profile() {
  const { user } = useAuth();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  const details = [
    { label: 'Full name', value: fullName },
    { label: 'Username', value: user.username },
    { label: 'Email', value: user.email },
    { label: 'Role', value: <Badge variant="accent">{ROLE_LABELS[user.role] ?? user.role}</Badge> },
    { label: 'Staff role', value: formatLabel(user.staff_role) },
    { label: 'Branch', value: user.branch_name },
  ].filter((detail) => detail.value !== null && detail.value !== undefined && detail.value !== '');

  return (
    <div className="page">
      <PageHeader title="Profile" description="Your account details." />
      <Alert>These details come from your bank record. Contact your branch to change them.</Alert>

      <Card title="Account details">
        <dl className="detail-list">
          {details.map((detail) => (
            <div key={detail.label} className="detail-list__row">
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
