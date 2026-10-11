import { ArrowLeftRight, PiggyBank, UserPlus, Wallet } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import '../Pages.css';

export default function StaffDashboard() {
  return (
    <div className="page">
      <PageHeader title="Staff dashboard" description="Your branch's day at a glance." />
      <Alert>This page will summarise the customers and transactions you handle.</Alert>

      <div className="stat-grid">
        <StatCard label="Customers registered" icon={UserPlus} />
        <StatCard label="Accounts opened" icon={Wallet} />
        <StatCard label="Fixed deposits" icon={PiggyBank} />
        <StatCard label="Today's transactions" icon={ArrowLeftRight} />
      </div>

      <Card title="Recent activity">
        <EmptyState title="No recent activity" message="Registrations, deposits and withdrawals you process will appear here." />
      </Card>
    </div>
  );
}
