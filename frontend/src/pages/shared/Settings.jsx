import { KeyRound, SlidersHorizontal } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import '../Pages.css';

export default function Settings() {
  return (
    <div className="page">
      <PageHeader title="Settings" description="Security and display preferences." />
      <Alert>This page will let you change your password and personalise the app.</Alert>

      <Card title="Change password">
        <EmptyState icon={KeyRound} title="Coming soon" message="You will be able to change your password here." compact />
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