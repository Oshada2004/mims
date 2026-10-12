import { PiggyBank, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import '../Pages.css';

export default function CustomerDashboard() {
    const { user } = useAuth();
    const greeting = user?.first_name ? `Welcome, ${user.first_name}` : 'Welcome';


    return (
        <div className="page">
            <PageHeader title={greeting} description="Your accounts and fixed deposits at a glance." />
            <Alert>This page will show your balances, fixed deposits and latest transactions.</Alert>

            <div className="stat-grid">
                <StatCard label="Total balance" icon={Wallet} />
                <StatCard label="Fixed deposits" icon={PiggyBank} />
                <StatCard label="Deposits this month" icon={ArrowDownLeft} />
                <StatCard label="Withdrawals this month" icon={ArrowUpRight} />
            </div>

            <Card title="Recent activity">
                <EmptyState title="No recent activity" message="Your deposits, withdrawals and interest payments will appear here." />
            </Card>
        </div>
    );
}