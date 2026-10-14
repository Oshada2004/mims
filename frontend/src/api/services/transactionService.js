import client from '../client';
import { endpoints } from '../endpoints';
import { toAmountString, toNumber } from '../../utils/normalize';

function toBody({ accountNo, amount, refText }) {
    const reference = refText?.trim();
    return {
        accountNo: String(accountNo).trim(),
        amount: toAmountString(amount),
        ...(reference ? { refText: reference } : {}),
    };
}

function toResult(body) {
    const result = body?.data ?? {};
    return {
        txnId: result.txnId,
        accountNo: result.accountNo,
        amount: toNumber(result.amount),
        balanceAfter: toNumber(result.balanceAfter),
        message: body?.message,
    };
}


export async function deposit(input) {
    const { data } = await client.post(endpoints.transactions.deposit, toBody(input));
    return toResult(data);
}


export async function withdraw(input) {
    const { data } = await client.post(endpoints.transactions.withdraw, toBody(input));
    return toResult(data);
}