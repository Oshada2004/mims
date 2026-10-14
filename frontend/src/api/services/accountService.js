import client from '../client';
import { endpoints } from '../endpoints';
import { fullName, toAmountString, toNumber } from '../../utils/normalize';

function toAccount(row) {
  return {
    accountNo: row.account_no,
    branchId: row.branch_id,
    agentPersonId: row.agent_person_id,
    planCode: row.plan_code,
    status: row.status, // 'ACTIVE' | 'DORMANT' | 'CLOSED'
    balance: toNumber(row.balance),
    interestRate: toNumber(row.contracted_interest_rate),
    minBalance: toNumber(row.contracted_min_balance),
    dailyInterest: toNumber(row.daily_interest),
    openedDate: row.opened_date,
    lastTxnDate: row.last_txn_date,
    nextAccrualDate: row.next_accrual_date,
    closedDate: row.closed_date,
    holders: (row.holders ?? []).map((holder) => ({
      personId: holder.person_id,
      firstName: holder.first_name,
      lastName: holder.last_name,
      fullName: fullName(holder.first_name, holder.last_name),
      role: holder.holder_role, // 'PRIMARY' | 'JOINT' | 'GUARDIAN'
    })),
  };
}


export async function openAccount({ customerId, planCode, initialDeposit }) {
  const { data } = await client.post(endpoints.accounts.root, {
    customerId: Number(customerId),
    planCode,
    initialDeposit: toAmountString(initialDeposit),
  });
  return { accountNo: data?.data?.accountNo, message: data?.message };
}


export async function getAccount(accountNo, { signal } = {}) {
  const { data } = await client.get(endpoints.accounts.byNumber(accountNo.trim()), { signal });
  return toAccount(data?.data ?? {});
}

export async function addJointHolder(accountNo, coCustomerId) {
  const { data } = await client.post(endpoints.accounts.jointHolder(accountNo), {
    coCustomerId: Number(coCustomerId),
  });
  return { message: data?.message };
}

export async function reactivate(accountNo) {
  const { data } = await client.post(endpoints.accounts.reactivate(accountNo));
  return { message: data?.message };
}

export async function close(accountNo) {
  const { data } = await client.post(endpoints.accounts.close(accountNo));
  return { message: data?.message };
}