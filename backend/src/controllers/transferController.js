const db = require('../config/db');
const { sendMail, describeMailError } = require('../config/mailer');
const { transferCodeEmail } = require('../emails/transferCodeEmail');
const { generateCode, hashCode } = require('../utils/otp');

// Matches DECIMAL(14,2): up to 12 digits before the point, up to 2 after.
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const ACCOUNT_PATTERN = /^[A-Za-z0-9]{1,15}$/;
const CHALLENGE_ID_PATTERN = /^[0-9a-f]{64}$/;
const CODE_PATTERN = /^\d{6}$/;

// Recipient lookups: 20 per customer per 10 minutes, counted in memory (resets when the API restarts).
const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW_MS = 10 * 60 * 1000;
const lookupLog = new Map();

function takeLookupSlot(personId, now = Date.now()) {
    const recent = (lookupLog.get(personId) || []).filter((time) => now - time < LOOKUP_WINDOW_MS);
    if (recent.length >= LOOKUP_LIMIT) {
        lookupLog.set(personId, recent);
        return Math.ceil((LOOKUP_WINDOW_MS - (now - recent[0])) / 1000);
    }
    recent.push(now);
    lookupLog.set(personId, recent);
    return 0;
}

// "Malini Perera" -> "M****i P****a"
function maskWord(word) {
    if (word.length <= 2) return `${word[0]}*`;
    return `${word[0]}${'*'.repeat(word.length - 2)}${word[word.length - 1]}`;
}

function maskName(firstName, lastName) {
    return [firstName, lastName]
        .filter(Boolean)
        .join(' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(maskWord)
        .join(' ');
}

// "malini.perera@gmail.com" -> "m****@gmail.com"
function maskEmail(email) {
    const [local, domain] = String(email || '').split('@');
    if (!local || !domain) return '';
    return `${local[0]}****@${domain}`;
}

function readText(value) {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
}

// Procedure errors: 45000 = business rule (422), 45429 = rate limit (429). Everything else -> next(err).
function handleProcedureError(err, res, next) {
    if (err.sqlState === '45000') {
        return res.status(422).json({
            success: false,
            error: 'BusinessRuleViolation',
            message: err.sqlMessage || err.message
        });
    }
    if (err.sqlState === '45429') {
        return res.status(429).json({
            success: false,
            error: 'TooManyRequests',
            message: err.sqlMessage || err.message
        });
    }
    return next(err);
}

async function sendCodeEmail({ to, code, amount, senderAccountNo, receiverAccountNo }) {
    const [[bank]] = await db.query('SELECT bank_name FROM BANK_META_DATA ORDER BY bank_id LIMIT 1');
    const mail = transferCodeEmail({
        code,
        amount,
        senderAccountNo,
        receiverAccountNo,
        bankName: bank?.bank_name || 'MIMS'
    });
    await sendMail({ to, ...mail });
}

async function cancelChallenge(challengeId, personId) {
    try {
        await db.query('CALL sp_cancel_transfer_challenge(?, ?)', [challengeId, personId]);
    } catch (cancelError) {
        console.error('Could not cancel transfer challenge after an email failure:', cancelError.message);
    }
}

async function readChallenge(challengeId, personId) {
    const [rows] = await db.query(
        `SELECT expires_at,
                -- Remaining lifetime computed by MySQL, so clients never depend on clock or time zone settings.
                GREATEST(TIMESTAMPDIFF(SECOND, NOW(), expires_at), 0) AS expires_in_seconds,
                JSON_VALUE(payload, '$.sender') AS sender,
                JSON_VALUE(payload, '$.receiver') AS receiver,
                JSON_VALUE(payload, '$.amount') AS amount
           FROM OTP_CHALLENGE
          WHERE challenge_id = ? AND person_id = ?`,
        [challengeId, personId]
    );
    return rows[0];
}

// GET /api/transfers/recipient/:accountNo
// Masked owner name of an ACTIVE account, so the customer can check who they are paying.
exports.lookupRecipient = async (req, res, next) => {
    const accountNo = readText(req.params.accountNo).toUpperCase();

    const waitSeconds = takeLookupSlot(req.user.personId);
    if (waitSeconds > 0) {
        return res.status(429).json({
            success: false,
            error: 'TooManyRequests',
            message: `Too many account lookups. Please try again in ${Math.ceil(waitSeconds / 60)} minute(s).`
        });
    }

    if (!ACCOUNT_PATTERN.test(accountNo)) {
        return res.status(400).json({ success: false, message: 'Enter a valid account number.' });
    }

    try {
        // Primary holder first, then joint holders, so the name shown is stable.
        const [rows] = await db.query(
            `SELECT sa.account_no, p.first_name, p.last_name
               FROM SAVINGS_ACCOUNT sa
               JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
               JOIN PERSON p ON p.person_id = ah.customer_person_id
              WHERE sa.account_no = ?
                AND sa.status = 'ACTIVE'
              ORDER BY FIELD(ah.holder_role, 'PRIMARY', 'JOINT', 'GUARDIAN'), ah.customer_person_id
              LIMIT 1`,
            [accountNo]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active account found with that number.'
            });
        }

        return res.json({
            success: true,
            data: {
                accountNo: rows[0].account_no,
                maskedName: maskName(rows[0].first_name, rows[0].last_name)
            }
        });
    } catch (err) {
        return next(err);
    }
};

// POST /api/transfers/initiate { senderAccountNo, receiverAccountNo, amount, refText }
// The initiating customer is always req.user; the procedure checks they hold senderAccountNo.
exports.initiate = async (req, res, next) => {
    const personId = req.user.personId;
    const body = req.body || {};
    const senderAccountNo = readText(body.senderAccountNo).toUpperCase();
    const receiverAccountNo = readText(body.receiverAccountNo).toUpperCase();
    const amount = readText(body.amount);
    const refText = readText(body.refText);

    if (!ACCOUNT_PATTERN.test(senderAccountNo) || !ACCOUNT_PATTERN.test(receiverAccountNo)) {
        return res.status(400).json({
            success: false,
            message: 'Sender and receiver account numbers of up to 15 letters or digits are required.'
        });
    }
    if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number with at most two decimal places.'
        });
    }
    if (refText.length > 50) {
        return res.status(400).json({ success: false, message: 'Reference must be at most 50 characters.' });
    }
    if (!req.user.email) {
        return res.status(422).json({ success: false, message: 'Your login has no email address for the code.' });
    }

    let challengeId;
    try {
        // The id is generated in MySQL, then bound into the code hash.
        const [[idRow]] = await db.query('SELECT LOWER(HEX(RANDOM_BYTES(32))) AS id');
        challengeId = idRow.id;
        const code = generateCode();

        await db.query('CALL sp_create_transfer_challenge(?, ?, ?, ?, ?, ?, ?)', [
            challengeId,
            personId,
            senderAccountNo,
            receiverAccountNo,
            amount,
            refText || null,
            hashCode(challengeId, code)
        ]);

        try {
            await sendCodeEmail({ to: req.user.email, code, amount, senderAccountNo, receiverAccountNo });
        } catch (mailError) {
            console.error(`Transfer code email failed for person ${personId}: ${describeMailError(mailError)}`);
            await cancelChallenge(challengeId, personId);
            return res.status(503).json({
                success: false,
                error: 'EmailUnavailable',
                message: 'We could not send your confirmation code. Please try again shortly.'
            });
        }

        const challenge = await readChallenge(challengeId, personId);
        return res.status(201).json({
            success: true,
            message: 'A confirmation code has been sent to your email.',
            data: {
                challengeId,
                maskedEmail: maskEmail(req.user.email),
                expiresAt: challenge.expires_at,
                expiresInSeconds: challenge.expires_in_seconds
            }
        });
    } catch (err) {
        return handleProcedureError(err, res, next);
    }
};

// POST /api/transfers/resend { challengeId }
exports.resend = async (req, res, next) => {
    const personId = req.user.personId;
    const challengeId = readText(req.body?.challengeId).toLowerCase();

    if (!CHALLENGE_ID_PATTERN.test(challengeId)) {
        return res.status(400).json({ success: false, message: 'A valid challengeId is required.' });
    }

    try {
        const code = generateCode();
        await db.query('CALL sp_resend_transfer_challenge(?, ?, ?)', [
            challengeId,
            personId,
            hashCode(challengeId, code)
        ]);

        const challenge = await readChallenge(challengeId, personId);
        try {
            await sendCodeEmail({
                to: req.user.email,
                code,
                amount: challenge.amount,
                senderAccountNo: challenge.sender,
                receiverAccountNo: challenge.receiver
            });
        } catch (mailError) {
            console.error(`Transfer code email failed for person ${personId}: ${describeMailError(mailError)}`);
            await cancelChallenge(challengeId, personId);
            return res.status(503).json({
                success: false,
                error: 'EmailUnavailable',
                message: 'We could not send your new code, so this transfer was cancelled. Please start again.'
            });
        }

        return res.json({
            success: true,
            message: 'A new confirmation code has been sent to your email.',
            data: {
                challengeId,
                maskedEmail: maskEmail(req.user.email),
                expiresAt: challenge.expires_at,
                expiresInSeconds: challenge.expires_in_seconds
            }
        });
    } catch (err) {
        return handleProcedureError(err, res, next);
    }
};

// POST /api/transfers/confirm { challengeId, code }
// Runs the transfer stored in the challenge; the request body only identifies the challenge.
exports.confirm = async (req, res, next) => {
    const personId = req.user.personId;
    const challengeId = readText(req.body?.challengeId).toLowerCase();
    const code = readText(req.body?.code);

    if (!CHALLENGE_ID_PATTERN.test(challengeId)) {
        return res.status(400).json({ success: false, message: 'A valid challengeId is required.' });
    }
    if (!CODE_PATTERN.test(code)) {
        return res.status(400).json({ success: false, message: 'The code must be 6 digits.' });
    }

    let connection;
    try {
        // One connection, because the OUT values live in session variables.
        connection = await db.getConnection();
        await connection.query('SET @p_txn_id = NULL, @p_sender_balance_after = NULL');
        await connection.query(
            'CALL sp_confirm_transfer_challenge(?, ?, ?, @p_txn_id, @p_sender_balance_after)',
            [challengeId, personId, hashCode(challengeId, code)]
        );
        const [[result]] = await connection.query(
            'SELECT @p_txn_id AS txnId, @p_sender_balance_after AS senderBalanceAfter'
        );

        return res.json({
            success: true,
            message: 'Transfer completed.',
            data: {
                txnId: result.txnId,
                senderBalanceAfter: result.senderBalanceAfter
            }
        });
    } catch (err) {
        return handleProcedureError(err, res, next);
    } finally {
        if (connection) connection.release();
    }
};
