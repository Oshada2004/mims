import { Building2, PiggyBank, UserCog, Users } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import '../Pages.css';

export default function AdminDashboard() {
  return (
    <div className="page">
      <PageHeader title="Admin dashboard" description="Bank-wide overview of branches, agents and customers." />
      <Alert>This page will summarise activity across every Arunodaya Bank branch.</Alert>

      <div className="stat-grid">
        <StatCard label="Branches" icon={Building2} />
        <StatCard label="Agents" icon={UserCog} />
        <StatCard label="Customers" icon={Users} />
        <StatCard label="Active fixed deposits" icon={PiggyBank} />
      </div>

      <Card title="Recent activity">
        <EmptyState title="No recent activity" message="New accounts, deposits and staff changes will appear here." />
      </Card>
    </div>
  );
}