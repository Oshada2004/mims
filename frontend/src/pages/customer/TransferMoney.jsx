import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import OtpInput from '../../components/ui/OtpInput';
import Select from '../../components/ui/Select';
import { getErrorMessage } from '../../api/client';
import { useSubmit } from '../../api/useApi';
import { confirm, initiate, recipientLookup, resend } from '../../api/services/transferService';
import { formatCurrency } from '../../utils/format';
import { isValidAmount } from '../../utils/validation';
import '../Pages.css';

const CODE_LENGTH = 6;
const RESEND_AFTER_MS = 60 * 1000;
const MINOR_PLANS = ['CHILD', 'TEEN'];
// Savings account numbers are "SA" followed by 10 digits (sp_open_savings_account).
const ACCOUNT_PATTERN = /^SA\d{10}$/;
// Errors after which this code can never work again: the customer has to start over.
const FINAL_ERROR = /expired|start (the transfer )?again|cancelled|no longer active|already been completed/i;

const EMPTY = { sender: '', receiver: '', amount: '', refText: '' };

// Clock read for event handlers and timers (kept out of render).
function currentTime() {
  return Date.now();
}

function formatCountdown(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Send money to another account: details -> emailed code -> done.
 * `accounts` are the customer's own accounts; `onCompleted` runs after a successful transfer.
 */
export default function TransferMoney({ accounts, onCompleted }) {
  const [step, setStep] = useState('form');
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [recipient, setRecipient] = useState(null);
  const [lookup, setLookup] = useState({ accountNo: '', loading: false, error: '' });
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [now, setNow] = useState(currentTime);
  const [result, setResult] = useState(null);

  const sendCode = useSubmit(initiate);
  const sendAgain = useSubmit(resend);
  const confirmCode = useSubmit(confirm);

  const sendable = accounts.filter((account) => account.status === 'ACTIVE' && !MINOR_PLANS.includes(account.planCode));
  const sender = accounts.find((account) => account.accountNo === values.sender) ?? null;
  const busy = sendCode.submitting || sendAgain.submitting || confirmCode.submitting;

  // Tick once a second while a code is waiting, for the expiry countdown and the resend timer.
  useEffect(() => {
    if (step !== 'code') return undefined;
    const timer = setInterval(() => setNow(currentTime()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Count down from the lifetime the server measured, relative to when the code was sent, so a
  // mismatched client clock or server time zone cannot make a fresh code look expired.
  const expiresAtMs = challenge
    ? challenge.expiresInSeconds !== null
      ? challenge.sentAt + challenge.expiresInSeconds * 1000
      : new Date(challenge.expiresAt).getTime()
    : 0;
  const remainingMs = challenge ? expiresAtMs - now : 0;
  const resendInMs = challenge ? challenge.sentAt + RESEND_AFTER_MS - now : 0;
  const expired = step === 'code' && remainingMs <= 0;
  const codeError = confirmCode.error || sendAgain.error;
  const finished = expired || Boolean(codeError && FINAL_ERROR.test(codeError));

  const setField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    if (name === 'receiver') setRecipient(null);
  };

  const lookUpRecipient = async () => {
    const accountNo = values.receiver.trim().toUpperCase();
    if (!accountNo || accountNo === lookup.accountNo) return;
    if (!ACCOUNT_PATTERN.test(accountNo)) {
      setLookup({ accountNo, loading: false, error: 'Enter the full account number, e.g. SA0123456789.' });
      return;
    }
    if (accountNo === values.sender) {
      setLookup({ accountNo, loading: false, error: 'Choose a different account from the one you are sending from.' });
      return;
    }
    setLookup({ accountNo, loading: true, error: '' });
    try {
      const found = await recipientLookup(accountNo);
      setRecipient(found);
      setLookup({ accountNo, loading: false, error: '' });
    } catch (error) {
      setRecipient(null);
      setLookup({ accountNo, loading: false, error: getErrorMessage(error, 'Could not check this account.') });
    }
  };

  const validate = () => {
    const next = {};
    if (!sender) next.sender = 'Choose the account to send from.';
    const receiver = values.receiver.trim().toUpperCase();
    if (!receiver) next.receiver = 'Enter the receiving account number.';
    else if (receiver === values.sender) next.receiver = 'Choose a different account from the one you are sending from.';
    else if (!recipient || recipient.accountNo !== receiver) next.receiver = lookup.error || 'Check the receiving account first.';
    if (!isValidAmount(values.amount)) next.amount = 'Enter a positive amount with at most 2 decimals.';
    else if (sender && Number(values.amount) > sender.balance) {
      next.amount = `Your balance is only ${formatCurrency(sender.balance)}.`;
    }
    if (values.refText.trim().length > 50) next.refText = 'At most 50 characters.';
    return next;
  };

  const handleSendCode = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const sent = await sendCode.submit({
      senderAccountNo: values.sender,
      receiverAccountNo: values.receiver,
      amount: values.amount.trim(),
      refText: values.refText,
    });
    if (sent) {
      setChallenge({ ...sent, sentAt: currentTime() });
      setCode('');
      confirmCode.reset();
      sendAgain.reset();
      setNow(currentTime());
      setStep('code');
    }
  };

  const handleResend = async () => {
    confirmCode.reset();
    const sent = await sendAgain.submit(challenge.challengeId);
    if (sent) {
      setChallenge((current) => ({ ...current, ...sent, sentAt: currentTime() }));
      setCode('');
      setNow(currentTime());
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    if (code.length !== CODE_LENGTH || finished) return;
    const done = await confirmCode.submit(challenge.challengeId, code);
    if (done) {
      setResult({ ...done, amount: Number(values.amount), receiver: values.receiver.trim().toUpperCase(), maskedName: recipient?.maskedName });
      setStep('done');
      onCompleted?.();
    } else {
      setCode('');
    }
  };

  const startOver = ({ keepDetails = true } = {}) => {
    setStep('form');
    setChallenge(null);
    setCode('');
    sendCode.reset();
    sendAgain.reset();
    confirmCode.reset();
    if (!keepDetails) {
      setValues(EMPTY);
      setRecipient(null);
      setLookup({ accountNo: '', loading: false, error: '' });
      setResult(null);
    }
  };

  if (accounts.length > 0 && sendable.length === 0) {
    return (
      <EmptyState
        title="No account can send transfers"
        message="Transfers need an ACTIVE account that is not a child or teen account."
        compact
      />
    );
  }

  if (step === 'done' && result) {
    return (
      <div className="stack">
        <Alert variant="success" title="Transfer completed">
          <p>
            {formatCurrency(result.amount)} sent to {result.maskedName ?? result.receiver} ({result.receiver}).
          </p>
          <p>
            Transaction <span className="result-value">#{result.txnId}</span> · your new balance is{' '}
            <strong>{formatCurrency(result.senderBalanceAfter)}</strong>
          </p>
        </Alert>
        <div className="form-actions form-actions--start">
          <Button icon={Send} onClick={() => startOver({ keepDetails: false })}>
            Make another transfer
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'code' && challenge) {
    return (
      <form className="stack" onSubmit={handleConfirm} noValidate>
        <dl className="summary-grid">
          <div>
            <dt>From</dt>
            <dd>{values.sender}</dd>
          </div>
          <div>
            <dt>To</dt>
            <dd>
              {recipient?.maskedName} · {values.receiver.trim().toUpperCase()}
            </dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatCurrency(values.amount)}</dd>
          </div>
          {values.refText.trim() && (
            <div>
              <dt>Reference</dt>
              <dd>{values.refText.trim()}</dd>
            </div>
          )}
        </dl>

        <Alert variant={expired ? 'error' : 'info'} title={expired ? 'Code expired' : `Code sent to ${challenge.maskedEmail}`}>
          {expired
            ? 'This code is no longer valid. Start again to get a new one.'
            : `Enter the 6-digit code from the email. It expires in ${formatCountdown(remainingMs)}. Never share it with anyone.`}
        </Alert>

        {codeError && !expired && (
          <Alert variant="error" title={finished ? 'Please start again' : 'Code not accepted'}>
            {codeError}
          </Alert>
        )}
        {sendAgain.result && !sendAgain.error && !codeError && (
          <Alert variant="success">A new code has been sent. Earlier codes no longer work.</Alert>
        )}

        <FormField label="Confirmation code">
          <OtpInput value={code} onChange={setCode} length={CODE_LENGTH} disabled={busy || finished} autoFocus label="Confirmation code" />
        </FormField>

        <div className="form-actions form-actions--start">
          {finished ? (
            <Button icon={RefreshCw} onClick={() => startOver()}>
              Start again
            </Button>
          ) : (
            <>
              <Button type="submit" icon={ShieldCheck} loading={confirmCode.submitting} disabled={code.length !== CODE_LENGTH || busy}>
                Confirm transfer
              </Button>
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={handleResend}
                loading={sendAgain.submitting}
                disabled={resendInMs > 0 || busy}
              >
                {resendInMs > 0 ? `Resend in ${Math.ceil(resendInMs / 1000)}s` : 'Resend code'}
              </Button>
            </>
          )}
          <Button variant="ghost" icon={ArrowLeft} onClick={() => startOver()} disabled={busy}>
            Change details
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form className="stack" onSubmit={handleSendCode} noValidate>
      {sendCode.error && (
        <Alert variant="error" title="Transfer not started" onClose={sendCode.reset}>
          {sendCode.error}
        </Alert>
      )}

      <div className="form-grid">
        <FormField label="From account" error={errors.sender} required>
          <Select
            value={values.sender}
            onChange={(event) => setField('sender', event.target.value)}
            placeholder="Choose an account"
            options={accounts
              .filter((account) => account.status === 'ACTIVE')
              .map((account) => ({
                value: account.accountNo,
                label: `${account.accountNo} · ${account.planCode} · ${formatCurrency(account.balance)}`,
                disabled: MINOR_PLANS.includes(account.planCode),
              }))}
            disabled={busy}
          />
        </FormField>

        <FormField
          label="To account"
          error={errors.receiver ?? (lookup.error || undefined)}
          hint={recipient ? `Account holder: ${recipient.maskedName}` : lookup.loading ? 'Checking account…' : 'We will show the holder’s name to check.'}
          required
        >
          <Input
            value={values.receiver}
            onChange={(event) => {
              setField('receiver', event.target.value);
              setLookup((current) => ({ ...current, error: '' }));
            }}
            onBlur={lookUpRecipient}
            maxLength={15}
            placeholder="e.g. SA0123456789"
            autoComplete="off"
            disabled={busy}
          />
        </FormField>

        <FormField
          label="Amount (LKR)"
          error={errors.amount}
          hint={sender ? `Available: ${formatCurrency(sender.balance)}` : undefined}
          required
        >
          <Input
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => setField('amount', event.target.value)}
            disabled={busy}
          />
        </FormField>

        <FormField label="Reference" error={errors.refText} hint="Optional, up to 50 characters.">
          <Input value={values.refText} onChange={(event) => setField('refText', event.target.value)} maxLength={50} disabled={busy} />
        </FormField>
      </div>

      {recipient && (
        <p className="text-muted">
          <CheckCircle2 size={14} aria-hidden="true" className="inline-icon" /> Sending to {recipient.maskedName} ({recipient.accountNo})
        </p>
      )}

      <div className="form-actions">
        <Button type="submit" icon={Send} loading={sendCode.submitting} disabled={busy || lookup.loading}>
          Send code
        </Button>
      </div>
    </form>
  );
}
