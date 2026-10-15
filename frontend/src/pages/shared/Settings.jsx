import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import ChangePasswordForm from './ChangePasswordForm';
import PreferencesForm from './PreferencesForm';
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

      <Card title="Preferences" description="Saved to your login, so they follow you to other browsers.">
        <PreferencesForm />
      </Card>
    </div>
  );
}