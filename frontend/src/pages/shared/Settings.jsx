import { SlidersHorizontal } from 'lucide-react';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import ChangePasswordForm from './ChangePasswordForm';
import '../Pages.css';

export default function Settings() {
  return (
    <div className="page">
      <PageHeader title="Settings" description="Security and display preferences." />
      <Card
        title="Change password"
        description="You stay signed in here; your other devices are signed out and you get an email."
      >
        <ChangePasswordForm />
      </Card>

      <Card title="Preferences">
        <EmptyState
          icon={SlidersHorizontal}
          title="Coming soon"
          message="Notification and display preferences will live here."
          compact
        />
      </Card>
    </div>
  );
}