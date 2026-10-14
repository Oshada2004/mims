import client from '../client';
import { endpoints } from '../endpoints';
import { listParams, toNumber, toPage } from '../../utils/normalize';

const rows = (body) => (Array.isArray(body?.data) ? body.data : []);


export async function getTransactionHistory(accountNo, { limit, offset } = {}, { signal } = {}) {
    const { data } = await client.get(endpoints.reports.transactions(accountNo.trim()), {
        params: listParams({ limit, offset }),
        signal,
    });
    return toPage(data, (row) => ({
        txnId: row.txn_id,
        accountNo: row.sav_acc_no,
        agentPersonId: row.agent_person_id,
        fdId: row.fd_id,
        type: row.txn_type, // e.g. 'DEPOSIT', 'WITHDRAWAL', interest types
        amount: toNumber(row.amount),
        balanceAfter: toNumber(row.balance_after),
        reference: row.ref_text,
        timestamp: row.txn_timestamp,
    }));
}


export async function getActiveFds(dueBy, { signal } = {}) {
    const { data } = await client.get(endpoints.reports.activeFds, {
        params: dueBy ? { due_by: dueBy } : undefined,
        signal,
    });
    return rows(data).map((row) => ({
        fdId: row.fd_id,
        accountNo: row.linked_savings_account,
        termCode: row.term_code,
        principal: toNumber(row.principal_amount),
        interestRate: toNumber(row.contracted_interest_rate),
        openedDate: row.opened_date,
        maturityDate: row.maturity_date,
        nextPayoutDate: row.upcoming_payout_date,
        expectedMonthlyInterest: toNumber(row.expected_30_day_interest),
    }));
}


export async function getAccountSummary({ planCode, status } = {}, { signal } = {}) {
    const params = {};
    if (planCode) params.plan_code = planCode;
    if (status) params.status = status;
    const { data } = await client.get(endpoints.reports.accountSummary, { params, signal });
    return rows(data).map((row) => ({
        accountNo: row.account_no,
        planCode: row.plan_code,
        planName: row.plan_name,
        holderNames: row.holder_names,
        balance: toNumber(row.current_balance),
        totalDeposits: toNumber(row.total_deposits),
        totalWithdrawals: toNumber(row.total_withdrawals),
        totalInterest: toNumber(row.total_interest_credited),
        transactionCount: toNumber(row.transaction_count),
        lastTransactionDate: row.last_transaction_date,
        status: row.account_status,
        openedDate: row.opened_date,
    }));
}


export async function getAgentTransactions({ startDate, endDate }, { signal } = {}) {
    const { data } = await client.get(endpoints.reports.agentTransactions, {
        params: { start_date: startDate, end_date: endDate },
        signal,
    });
    return rows(data).map((row) => ({
        agentId: row.agent_id,
        agentName: row.agent_name,
        branchName: row.branch_name,
        totalTransactions: toNumber(row.total_transactions),
        grossValue: toNumber(row.gross_value_lkr),
        netValue: toNumber(row.net_value_lkr),
    }));
}


export async function getInterestDistribution({ year, month, planCode } = {}, { signal } = {}) {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    if (planCode) params.plan_code = planCode;
    const { data } = await client.get(endpoints.reports.interestDistribution, { params, signal });
    return rows(data).map((row) => ({
        year: toNumber(row.txn_year),
        month: toNumber(row.txn_month),
        label: row.month_year_name ?? row.year_month_label,
        planCode: row.plan_code,
        accountType: row.account_type,
        accountsReceivingInterest: toNumber(row.accounts_receiving_interest),
        payoutCount: toNumber(row.total_interest_payouts),
        savingsInterest: toNumber(row.total_savings_interest),
        fdInterest: toNumber(row.total_fd_interest),
        totalInterest: toNumber(row.total_interest_paid),
    }));
}


export async function getCustomerActivity(customerId, { startDate, endDate } = {}, { signal } = {}) {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const { data } = await client.get(endpoints.reports.customerActivity(customerId), { params, signal });
    const row = data?.data ?? {};
    return {
        customerId: row.customer_id,
        customerName: row.customer_name,
        branchName: row.branch_name,
        agentName: row.agent_name,
        accountCount: toNumber(row.number_of_accounts),
        totalDeposits: toNumber(row.total_deposits),
        totalWithdrawals: toNumber(row.total_withdrawals),
        netBalance: toNumber(row.net_balance),
        hasActiveFd: row.has_active_fd === 'YES',
    };
}