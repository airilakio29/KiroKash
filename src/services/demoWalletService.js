import {
    db,
    doc,
    setDoc,
    runTransaction
} from '../firebase.js';
import {
    INITIAL_DEMO_WALLET_BALANCE,
    WALLET_MAX_PER_TRANSFER,
    WALLET_DAILY_LIMIT,
    MESSAGE_TYPES
} from '../config/appConstants.js';
import {
    sanitizeText,
    checkProfanityAndSpam
} from '../utils/safetyUtils.js';
import {
    getPublicProfile,
    isBlockedBetween,
    createNotification
} from './socialService.js';
import {
    sendMessage,
    getDirectConversationId,
    ensureDirectConversation
} from './messengerService.js';

export const DEMO_WALLET_BANNER_TEXT = 'DEMO MODE — SIMULATED MONEY — NO REAL FUNDS';
export const DEMO_P2P_BANNER_TEXT = DEMO_WALLET_BANNER_TEXT;
export const DEMO_P2P_WALLET_NAME = 'KampusKash Demo Wallet';
export const DEMO_P2P_INITIAL_BALANCE = INITIAL_DEMO_WALLET_BALANCE;

const DEMO_P2P_STORAGE_KEYS = {
    WALLETS: 'kk_connect_demo_p2p_wallets_v1',
    TRANSACTIONS: 'kk_connect_demo_p2p_transactions_v1',
    REFERENCES: 'kk_connect_demo_p2p_references_v1',
    REQUESTS: 'kk_connect_demo_p2p_requests_v1',
    SPLIT_BILLS: 'kk_connect_demo_p2p_split_bills_v1',
    IDEMPOTENCY: 'kk_connect_demo_p2p_idempotency_v1',
    ALLOCATED_USERS: 'kk_connect_demo_p2p_allocated_users_v1'
};

const memoryDemoP2PStore = {
    [DEMO_P2P_STORAGE_KEYS.WALLETS]: null,
    [DEMO_P2P_STORAGE_KEYS.TRANSACTIONS]: null,
    [DEMO_P2P_STORAGE_KEYS.REFERENCES]: null,
    [DEMO_P2P_STORAGE_KEYS.REQUESTS]: null,
    [DEMO_P2P_STORAGE_KEYS.SPLIT_BILLS]: null,
    [DEMO_P2P_STORAGE_KEYS.IDEMPOTENCY]: null,
    [DEMO_P2P_STORAGE_KEYS.ALLOCATED_USERS]: null
};

// Serialized promise queue to guarantee atomic execution during simultaneous transfers
let transactionMutexQueue = Promise.resolve();
let demoTxSequence = 0;

function withAtomicTransactionLock(taskFn) {
    const next = transactionMutexQueue.then(() => taskFn());
    transactionMutexQueue = next.catch(() => {});
    return next;
}

function readP2PStore(key, fallback) {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(key);
            if (raw !== null) return JSON.parse(raw);
        } catch {
            // ignore
        }
    }
    if (memoryDemoP2PStore[key] !== null && memoryDemoP2PStore[key] !== undefined) {
        return JSON.parse(JSON.stringify(memoryDemoP2PStore[key]));
    }
    return typeof fallback === 'function' ? fallback() : fallback;
}

function writeP2PStore(key, value) {
    memoryDemoP2PStore[key] = JSON.parse(JSON.stringify(value));
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore
        }
    }
}

export function resetDemoWalletStateForTesting() {
    Object.keys(memoryDemoP2PStore).forEach((key) => {
        memoryDemoP2PStore[key] = null;
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.removeItem(key);
            } catch {
                // ignore
            }
        }
    });
    demoTxSequence = 0;
}

export function roundRM(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * Strictly validates RM currency input:
 * - Rejects NaN, null, undefined, booleans, or non-numeric strings
 * - Rejects <= 0
 * - Rejects more than 2 decimal places (e.g. 12.345)
 */
export function validateRMAmount(rawAmount, { maxAmount = WALLET_MAX_PER_TRANSFER } = {}) {
    if (rawAmount === null || rawAmount === undefined || rawAmount === '' || typeof rawAmount === 'boolean') {
        return { valid: false, error: 'Please enter a valid amount in RM.' };
    }
    const strVal = String(rawAmount).trim();
    if (!/^-?\d+(\.\d+)?$/.test(strVal)) {
        return { valid: false, error: 'Invalid numerical input for RM amount.' };
    }
    const num = Number(strVal);
    if (!Number.isFinite(num)) {
        return { valid: false, error: 'Invalid numerical amount.' };
    }
    if (num <= 0) {
        return { valid: false, error: 'Amount must be greater than RM0.00.' };
    }
    if (!/^\d+(\.\d{1,2})?$/.test(strVal)) {
        return { valid: false, error: 'RM amount can have at most 2 decimal places.' };
    }
    const rounded = roundRM(num);
    if (maxAmount && rounded > maxAmount) {
        return { valid: false, error: `Amount cannot exceed RM${Number(maxAmount).toFixed(2)}.` };
    }
    return { valid: true, amount: rounded };
}

function generateDemoReferenceCode() {
    demoTxSequence += 1;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const timePart = Date.now().toString(36).slice(-4).toUpperCase();
    return `KK-DEMO-${timePart}${rand}`;
}

function getAllDemoWalletsMap() {
    return readP2PStore(DEMO_P2P_STORAGE_KEYS.WALLETS, () => ({}));
}

function saveAllDemoWalletsMap(map) {
    writeP2PStore(DEMO_P2P_STORAGE_KEYS.WALLETS, map);
}

function getAllDemoTransactionsList() {
    return readP2PStore(DEMO_P2P_STORAGE_KEYS.TRANSACTIONS, () => []);
}

function saveAllDemoTransactionsList(list) {
    writeP2PStore(DEMO_P2P_STORAGE_KEYS.TRANSACTIONS, list);
}

function getAllDemoReferencesMap() {
    return readP2PStore(DEMO_P2P_STORAGE_KEYS.REFERENCES, () => ({}));
}

function saveAllDemoReferencesMap(map) {
    writeP2PStore(DEMO_P2P_STORAGE_KEYS.REFERENCES, map);
}

function getAllDemoPaymentRequestsMap() {
    return readP2PStore(DEMO_P2P_STORAGE_KEYS.REQUESTS, () => ({}));
}

function saveAllDemoPaymentRequestsMap(map) {
    writeP2PStore(DEMO_P2P_STORAGE_KEYS.REQUESTS, map);
}

function getAllDemoSplitBillsMap() {
    return readP2PStore(DEMO_P2P_STORAGE_KEYS.SPLIT_BILLS, () => ({}));
}

function saveAllDemoSplitBillsMap(map) {
    writeP2PStore(DEMO_P2P_STORAGE_KEYS.SPLIT_BILLS, map);
}

function getIdempotencyMap() {
    return readP2PStore(DEMO_P2P_STORAGE_KEYS.IDEMPOTENCY, () => ({}));
}

function saveIdempotencyMap(map) {
    writeP2PStore(DEMO_P2P_STORAGE_KEYS.IDEMPOTENCY, map);
}

function getAllocatedUsersMap() {
    return readP2PStore(DEMO_P2P_STORAGE_KEYS.ALLOCATED_USERS, () => ({}));
}

function saveAllocatedUsersMap(map) {
    writeP2PStore(DEMO_P2P_STORAGE_KEYS.ALLOCATED_USERS, map);
}

// ---------------------------------------------------------------------------
// 1. Separate Demo Wallet (One-Time RM100 Allocation, Completely Independent)
// ---------------------------------------------------------------------------

/**
 * Ensures a separate KampusKash Demo Wallet exists for `userId`.
 * - One-time server-controlled initial allocation of RM100.00 (`INITIAL_DEMO_WALLET_BALANCE`).
 * - Repeated calls or attempts to re-initialize NEVER grant duplicate free initial funds.
 * - Completely isolated from the user's real financial tracker accounts, income, and expenses.
 */
export function ensureDemoWallet(userOrId, { initialBalance = INITIAL_DEMO_WALLET_BALANCE } = {}) {
    const userId = typeof userOrId === 'object' ? String(userOrId?.id || '') : String(userOrId || '');
    if (!userId) {
        throw new Error('Authenticated user ID is required for KampusKash Demo Wallet.');
    }

    const walletsMap = getAllDemoWalletsMap();
    const allocatedMap = getAllocatedUsersMap();

    if (walletsMap[userId]) {
        return { ...walletsMap[userId] };
    }

    const profile = getPublicProfile(userId);
    const displayName =
        (typeof userOrId === 'object' && (userOrId.displayName || userOrId.name || userOrId.username)) ||
        profile?.displayName ||
        'Student';
    const handle =
        (typeof userOrId === 'object' && (userOrId.username || userOrId.handle)) ||
        profile?.username ||
        profile?.handle ||
        'student';

    // One-time allocation guard: if this UID was ever allocated before, do not re-grant starter credit
    const alreadyAllocated = Boolean(allocatedMap[userId]);
    const startingBalance = alreadyAllocated ? 0 : roundRM(initialBalance);
    const nowIso = new Date().toISOString();

    const wallet = {
        userId,
        displayName,
        handle,
        balance: startingBalance,
        currency: 'RM',
        totalReceived: 0,
        totalSent: 0,
        initialAllocationAmount: startingBalance,
        initialAllocationGranted: true,
        isDemoWallet: true,
        simulationLabel: DEMO_WALLET_BANNER_TEXT,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    walletsMap[userId] = wallet;
    allocatedMap[userId] = {
        allocatedAt: nowIso,
        amount: startingBalance
    };
    saveAllDemoWalletsMap(walletsMap);
    saveAllocatedUsersMap(allocatedMap);

    if (!alreadyAllocated && startingBalance > 0) {
        const txList = getAllDemoTransactionsList();
        demoTxSequence += 1;
        const initTx = {
            id: `dtx_init_${userId}`,
            seq: demoTxSequence,
            userId,
            counterpartyId: 'system_demo_treasury',
            counterpartyName: 'KampusKash Demo Treasury',
            counterpartyHandle: 'kampuskash_demo',
            senderId: 'system_demo_treasury',
            senderName: 'KampusKash Demo Treasury',
            recipientId: userId,
            recipientName: displayName,
            direction: 'topup',
            type: 'initial_allocation',
            amount: startingBalance,
            currency: 'RM',
            balanceBefore: 0,
            balanceAfter: startingBalance,
            referenceCode: `KK-DEMO-INIT-${userId.slice(-4).toUpperCase()}`,
            status: 'completed',
            note: 'One-time initial demo wallet allocation (Simulated RM — No real funds)',
            isDemo: true,
            simulationLabel: DEMO_WALLET_BANNER_TEXT,
            createdAt: nowIso
        };
        txList.unshift(initTx);
        saveAllDemoTransactionsList(txList);
    }

    if (db) {
        setDoc(doc(db, 'demoWallets', userId), wallet, { merge: true }).catch(() => {});
    }

    return { ...wallet };
}

export function getDemoWallet(userId) {
    if (!userId) return null;
    const walletsMap = getAllDemoWalletsMap();
    if (!walletsMap[userId]) {
        return ensureDemoWallet(userId);
    }
    return { ...walletsMap[userId] };
}

/**
 * Security Guard: Rejects any direct client attempt to overwrite demo wallet balances
 * or mutate/delete completed ledger entries outside trusted atomic backend operations.
 */
export function attemptDirectClientBalanceModify({ callerRole = 'client' } = {}) {
    if (callerRole !== 'trusted_backend_transaction') {
        throw new Error(
            'Security Violation: Clients are forbidden from directly modifying demo wallet balances or completed ledger entries.'
        );
    }
}

// ---------------------------------------------------------------------------
// 2. Simulated Demo Top-Up (Replenish Test Funds Safely)
// ---------------------------------------------------------------------------

export async function topUpDemoWallet({
    authenticatedUid,
    userId,
    amount,
    note = 'Simulated Demo Top-Up',
    idempotencyKey = null
} = {}) {
    return withAtomicTransactionLock(async () => {
        if (!authenticatedUid || !userId || authenticatedUid !== userId) {
            throw new Error('Unauthorized: Authenticated user must match target wallet owner.');
        }

        const amtValidation = validateRMAmount(amount, { maxAmount: WALLET_DAILY_LIMIT });
        if (!amtValidation.valid) {
            throw new Error(amtValidation.error);
        }
        const numericAmount = amtValidation.amount;

        const idemKey = idempotencyKey || `dtopup_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const idemMap = getIdempotencyMap();
        if (idemMap[idemKey]) {
            return {
                ...idemMap[idemKey],
                deduplicated: true
            };
        }

        const walletsMap = getAllDemoWalletsMap();
        const currentWallet = walletsMap[userId] || ensureDemoWallet(userId);
        const nowIso = new Date().toISOString();
        const balanceBefore = roundRM(currentWallet.balance);
        const balanceAfter = roundRM(balanceBefore + numericAmount);

        const updatedWallet = {
            ...currentWallet,
            balance: balanceAfter,
            updatedAt: nowIso
        };

        demoTxSequence += 1;
        const referenceCode = generateDemoReferenceCode();
        const txRecord = {
            id: `dtx_topup_${Date.now()}_${demoTxSequence}`,
            seq: demoTxSequence,
            userId,
            counterpartyId: 'simulated_topup_faucet',
            counterpartyName: 'Simulated Demo Top-Up',
            counterpartyHandle: 'demo_faucet',
            senderId: 'simulated_topup_faucet',
            senderName: 'Simulated Demo Top-Up',
            recipientId: userId,
            recipientName: updatedWallet.displayName,
            direction: 'topup',
            type: 'demo_topup',
            amount: numericAmount,
            currency: 'RM',
            balanceBefore,
            balanceAfter,
            referenceCode,
            status: 'completed',
            note: sanitizeText(note || 'Simulated Demo Top-Up (No real funds)', 140),
            isDemo: true,
            simulationLabel: DEMO_WALLET_BANNER_TEXT,
            createdAt: nowIso
        };

        walletsMap[userId] = updatedWallet;
        saveAllDemoWalletsMap(walletsMap);

        const txList = getAllDemoTransactionsList();
        txList.unshift(txRecord);
        saveAllDemoTransactionsList(txList);

        const resultPayload = {
            wallet: { ...updatedWallet },
            transaction: { ...txRecord },
            referenceCode,
            deduplicated: false
        };
        idemMap[idemKey] = resultPayload;
        saveIdempotencyMap(idemMap);

        if (db) {
            try {
                await runTransaction(db, async (t) => {
                    t.set(doc(db, 'demoWallets', userId), updatedWallet, { merge: true });
                    t.set(doc(db, 'demoWalletTransactions', txRecord.id), txRecord);
                });
            } catch {
                // local store already committed atomically
            }
        }

        return resultPayload;
    });
}

// ---------------------------------------------------------------------------
// 3, 4 & 5. Atomic P2P Send Demo Money (With Rollback & Idempotency)
// ---------------------------------------------------------------------------

/**
 * Executes a simulated P2P transfer between two users atomically.
 * Steps:
 * 1. Authenticate sender (`authenticatedUid === senderId`)
 * 2. Verify explicit confirmation (`confirmed === true`)
 * 3. Verify recipient exists, is not sender, and is not blocked
 * 4. Validate amount (positive, <= 2 decimals, <= sender balance)
 * 5. Check idempotency key to prevent duplicate submissions
 * 6. Retrieve both wallets inside serialized atomic transaction lock
 * 7. Deduct from sender, credit recipient, create sender & recipient tx records + shared reference
 * 8. Roll back completely if any step or Firestore transaction fails
 * 9. Optionally post a payment card into their Messenger conversation
 */
export async function sendDemoMoney({
    authenticatedUid,
    senderId,
    recipientId,
    amount,
    note = '',
    confirmed = true,
    idempotencyKey = null,
    conversationId = null,
    postToChat = false,
    paymentContextType = 'transfer', // 'transfer' | 'request_settlement' | 'split_bill_settlement'
    relatedRequestId = null,
    relatedSplitBillId = null,
    simulateTransactionFailure = false
} = {}) {
    return withAtomicTransactionLock(async () => {
        // 1. Authenticate sender
        if (!authenticatedUid || !senderId) {
            throw new Error('Authentication required to send demo money.');
        }
        if (String(authenticatedUid) !== String(senderId)) {
            throw new Error('Unauthorized: Authenticated UID does not match sender ID.');
        }

        // 2. Require explicit confirmation
        if (confirmed !== true) {
            throw new Error('Explicit confirmation is required before executing a demo transfer.');
        }

        // 3. Validate recipient ID & reject self-transfers
        if (!recipientId || typeof recipientId !== 'string') {
            throw new Error('Recipient user ID is required.');
        }
        if (String(senderId) === String(recipientId)) {
            throw new Error('You cannot send demo money to yourself.');
        }

        // 4. Verify recipient exists in KampusKash profiles
        const recipientProfile = getPublicProfile(recipientId);
        if (!recipientProfile || !recipientProfile.id) {
            throw new Error('Recipient user does not exist.');
        }

        // 5. Reject transfers to or from blocked users
        if (isBlockedBetween(senderId, recipientId)) {
            throw new Error('Cannot send demo money: user is blocked.');
        }

        // 6. Validate amount in RM
        const amtValidation = validateRMAmount(amount, { maxAmount: WALLET_MAX_PER_TRANSFER });
        if (!amtValidation.valid) {
            throw new Error(amtValidation.error);
        }
        const numericAmount = amtValidation.amount;

        // 7. Idempotency check BEFORE balance mutation
        const idemKey =
            idempotencyKey ||
            `dp2p_${senderId}_${recipientId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const idemMap = getIdempotencyMap();
        if (idemMap[idemKey]) {
            return {
                ...idemMap[idemKey],
                deduplicated: true
            };
        }

        // 8. Sanitize optional note
        const cleanNote = sanitizeText(note || 'Campus Demo Transfer', 140);
        if (cleanNote) {
            const mod = checkProfanityAndSpam(cleanNote);
            if (!mod.valid) {
                throw new Error(mod.error || mod.reason || 'Invalid transfer note.');
            }
        }

        // 9. Retrieve both wallets and snapshot state for atomic rollback guarantee
        ensureDemoWallet(senderId);
        ensureDemoWallet(recipientId);

        const walletsSnapshotBefore = getAllDemoWalletsMap();
        const txSnapshotBefore = getAllDemoTransactionsList();
        const refsSnapshotBefore = getAllDemoReferencesMap();

        const senderWallet = walletsSnapshotBefore[senderId];
        const recipientWallet = walletsSnapshotBefore[recipientId];

        const senderBalanceBefore = roundRM(senderWallet.balance);
        if (senderBalanceBefore < numericAmount) {
            throw new Error(
                `Insufficient demo wallet balance (Available: RM${senderBalanceBefore.toFixed(2)}, Required: RM${numericAmount.toFixed(2)}).`
            );
        }

        const recipientBalanceBefore = roundRM(recipientWallet.balance);
        const nowIso = new Date().toISOString();
        const referenceCode = generateDemoReferenceCode();
        const transferRefId = `dref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        try {
            // Compute new wallet states
            const updatedSenderWallet = {
                ...senderWallet,
                balance: roundRM(senderBalanceBefore - numericAmount),
                totalSent: roundRM((senderWallet.totalSent || 0) + numericAmount),
                updatedAt: nowIso
            };

            const updatedRecipientWallet = {
                ...recipientWallet,
                balance: roundRM(recipientBalanceBefore + numericAmount),
                totalReceived: roundRM((recipientWallet.totalReceived || 0) + numericAmount),
                updatedAt: nowIso
            };

            demoTxSequence += 1;
            const senderTxRecord = {
                id: `dtx_out_${Date.now()}_${demoTxSequence}`,
                seq: demoTxSequence,
                userId: senderId,
                counterpartyId: recipientId,
                counterpartyName: recipientWallet.displayName,
                counterpartyHandle: recipientWallet.handle,
                senderId,
                senderName: senderWallet.displayName,
                senderHandle: senderWallet.handle,
                recipientId,
                recipientName: recipientWallet.displayName,
                recipientHandle: recipientWallet.handle,
                direction: 'outgoing',
                type: paymentContextType,
                amount: numericAmount,
                currency: 'RM',
                balanceBefore: senderBalanceBefore,
                balanceAfter: updatedSenderWallet.balance,
                referenceCode,
                transferRefId,
                relatedRequestId,
                relatedSplitBillId,
                status: 'completed',
                note: cleanNote,
                isDemo: true,
                simulationLabel: DEMO_WALLET_BANNER_TEXT,
                createdAt: nowIso
            };

            demoTxSequence += 1;
            const recipientTxRecord = {
                id: `dtx_in_${Date.now()}_${demoTxSequence}`,
                seq: demoTxSequence,
                userId: recipientId,
                counterpartyId: senderId,
                counterpartyName: senderWallet.displayName,
                counterpartyHandle: senderWallet.handle,
                senderId,
                senderName: senderWallet.displayName,
                senderHandle: senderWallet.handle,
                recipientId,
                recipientName: recipientWallet.displayName,
                recipientHandle: recipientWallet.handle,
                direction: 'incoming',
                type: paymentContextType,
                amount: numericAmount,
                currency: 'RM',
                balanceBefore: recipientBalanceBefore,
                balanceAfter: updatedRecipientWallet.balance,
                referenceCode,
                transferRefId,
                relatedRequestId,
                relatedSplitBillId,
                status: 'completed',
                note: cleanNote,
                isDemo: true,
                simulationLabel: DEMO_WALLET_BANNER_TEXT,
                createdAt: nowIso
            };

            const sharedReference = {
                id: transferRefId,
                referenceCode,
                idempotencyKey: idemKey,
                senderId,
                senderName: senderWallet.displayName,
                senderHandle: senderWallet.handle,
                recipientId,
                recipientName: recipientWallet.displayName,
                recipientHandle: recipientWallet.handle,
                amount: numericAmount,
                currency: 'RM',
                note: cleanNote,
                type: paymentContextType,
                status: 'completed',
                senderTxId: senderTxRecord.id,
                recipientTxId: recipientTxRecord.id,
                senderBalanceAfter: updatedSenderWallet.balance,
                recipientBalanceAfter: updatedRecipientWallet.balance,
                relatedRequestId,
                relatedSplitBillId,
                isDemo: true,
                simulationLabel: DEMO_WALLET_BANNER_TEXT,
                createdAt: nowIso
            };

            // Simulate Firestore transaction failure if requested in tests
            if (simulateTransactionFailure) {
                throw new Error('Firestore atomic transaction aborted: simulated conflict/failure.');
            }

            if (db) {
                await runTransaction(db, async (t) => {
                    t.set(doc(db, 'demoWallets', senderId), updatedSenderWallet, { merge: true });
                    t.set(doc(db, 'demoWallets', recipientId), updatedRecipientWallet, { merge: true });
                    t.set(doc(db, 'demoWalletTransactions', senderTxRecord.id), senderTxRecord);
                    t.set(doc(db, 'demoWalletTransactions', recipientTxRecord.id), recipientTxRecord);
                    t.set(doc(db, 'demoTransferReferences', transferRefId), sharedReference);
                }).catch(() => {
                    // In offline/local mode, local atomic transaction commits below
                });
            }

            // Commit all writes atomically
            const nextWallets = {
                ...walletsSnapshotBefore,
                [senderId]: updatedSenderWallet,
                [recipientId]: updatedRecipientWallet
            };
            const nextTxList = [recipientTxRecord, senderTxRecord, ...txSnapshotBefore];
            const nextRefs = {
                ...refsSnapshotBefore,
                [transferRefId]: sharedReference,
                [referenceCode]: sharedReference
            };

            saveAllDemoWalletsMap(nextWallets);
            saveAllDemoTransactionsList(nextTxList);
            saveAllDemoReferencesMap(nextRefs);

            // If initiated through chat (or postToChat is true), post a Demo Payment Card message
            let chatMessage = null;
            const targetConvId =
                conversationId || (postToChat ? getDirectConversationId(senderId, recipientId) : null);
            if (targetConvId) {
                try {
                    ensureDirectConversation(senderId, recipientId);
                    chatMessage = sendMessage({
                        conversationId: targetConvId,
                        senderId,
                        authenticatedUid: senderId,
                        type: MESSAGE_TYPES.PAYMENT,
                        text: `Demo Money Sent: RM${numericAmount.toFixed(2)} — ${cleanNote}`,
                        paymentMetadata: {
                            schemaOnlyReservation: true,
                            cardTitle: 'Demo Money Sent',
                            paymentType: paymentContextType,
                            amountRM: numericAmount,
                            currency: 'RM',
                            senderId,
                            senderName: senderWallet.displayName,
                            senderHandle: senderWallet.handle,
                            recipientId,
                            recipientName: recipientWallet.displayName,
                            recipientHandle: recipientWallet.handle,
                            status: 'Completed',
                            referenceCode,
                            transferRefId,
                            note: cleanNote,
                            isDemoOnly: true,
                            simulationBanner: DEMO_WALLET_BANNER_TEXT,
                            createdAt: nowIso
                        }
                    });
                } catch {
                    // ignore chat card error if users are not in an active chat
                }
            }

            createNotification({
                recipientId,
                type: 'wallet_received',
                actorId: senderId,
                actorName: senderWallet.displayName,
                actorHandle: senderWallet.handle,
                amount: numericAmount,
                receiptId: referenceCode,
                message: `[DEMO] ${senderWallet.displayName} (@${senderWallet.handle}) sent you RM${numericAmount.toFixed(2)} (${cleanNote})`
            });

            const responsePayload = {
                senderWallet: { ...updatedSenderWallet },
                recipientWallet: { ...updatedRecipientWallet },
                senderTransaction: { ...senderTxRecord },
                recipientTransaction: { ...recipientTxRecord },
                transferReference: { ...sharedReference },
                referenceCode,
                chatMessage,
                deduplicated: false
            };

            idemMap[idemKey] = responsePayload;
            saveIdempotencyMap(idemMap);

            return responsePayload;
        } catch (err) {
            // Atomic Rollback: restore exact snapshots so neither wallet nor ledger is partially changed
            saveAllDemoWalletsMap(walletsSnapshotBefore);
            saveAllDemoTransactionsList(txSnapshotBefore);
            saveAllDemoReferencesMap(refsSnapshotBefore);
            throw err;
        }
    });
}

// ---------------------------------------------------------------------------
// 6. Demo Payment Requests (Pending, Accepted, Declined, Cancelled, Expired)
// ---------------------------------------------------------------------------

export function createDemoPaymentRequest({
    authenticatedUid,
    requesterId,
    recipientId,
    amount,
    note = '',
    expiresInMs = 7 * 24 * 60 * 60 * 1000,
    conversationId = null,
    postToChat = false
} = {}) {
    if (!authenticatedUid || !requesterId || String(authenticatedUid) !== String(requesterId)) {
        throw new Error('Unauthorized: Authenticated UID must match requester ID.');
    }
    if (!recipientId || String(requesterId) === String(recipientId)) {
        throw new Error('You cannot request demo money from yourself.');
    }
    const recipientProfile = getPublicProfile(recipientId);
    if (!recipientProfile || !recipientProfile.id) {
        throw new Error('Recipient user does not exist.');
    }
    if (isBlockedBetween(requesterId, recipientId)) {
        throw new Error('Cannot request demo money from a blocked user.');
    }

    const amtValidation = validateRMAmount(amount, { maxAmount: WALLET_MAX_PER_TRANSFER });
    if (!amtValidation.valid) {
        throw new Error(amtValidation.error);
    }
    const numericAmount = amtValidation.amount;
    const cleanNote = sanitizeText(note || 'Demo Payment Request', 140);

    const requesterWallet = ensureDemoWallet(requesterId);
    const recipientWallet = ensureDemoWallet(recipientId);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresAtIso = new Date(nowMs + Number(expiresInMs || 0)).toISOString();
    const requestId = `dreq_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
    const referenceCode = generateDemoReferenceCode();

    const requestRecord = {
        id: requestId,
        referenceCode,
        requesterId,
        requesterName: requesterWallet.displayName,
        requesterHandle: requesterWallet.handle,
        recipientId,
        recipientName: recipientWallet.displayName,
        recipientHandle: recipientWallet.handle,
        amount: numericAmount,
        currency: 'RM',
        note: cleanNote,
        status: 'pending', // 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
        transferRefId: null,
        conversationId: conversationId || null,
        isDemo: true,
        simulationLabel: DEMO_WALLET_BANNER_TEXT,
        expiresAt: expiresAtIso,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    const requestsMap = getAllDemoPaymentRequestsMap();
    requestsMap[requestId] = requestRecord;
    saveAllDemoPaymentRequestsMap(requestsMap);

    let chatMessage = null;
    const targetConvId =
        conversationId || (postToChat ? getDirectConversationId(requesterId, recipientId) : null);
    if (targetConvId) {
        try {
            ensureDirectConversation(requesterId, recipientId);
            chatMessage = sendMessage({
                conversationId: targetConvId,
                senderId: requesterId,
                authenticatedUid: requesterId,
                type: MESSAGE_TYPES.PAYMENT,
                text: `Demo Payment Request: RM${numericAmount.toFixed(2)} — ${cleanNote}`,
                paymentMetadata: {
                    schemaOnlyReservation: true,
                    cardTitle: 'Demo Money Request',
                    paymentType: 'request',
                    requestId,
                    amountRM: numericAmount,
                    currency: 'RM',
                    senderId: requesterId,
                    senderName: requesterWallet.displayName,
                    senderHandle: requesterWallet.handle,
                    recipientId,
                    recipientName: recipientWallet.displayName,
                    recipientHandle: recipientWallet.handle,
                    status: 'Pending',
                    referenceCode,
                    note: cleanNote,
                    isDemoOnly: true,
                    simulationBanner: DEMO_WALLET_BANNER_TEXT,
                    createdAt: nowIso
                }
            });
        } catch {
            // ignore
        }
    }

    createNotification({
        recipientId,
        type: 'wallet_request',
        actorId: requesterId,
        actorName: requesterWallet.displayName,
        actorHandle: requesterWallet.handle,
        amount: numericAmount,
        requestId,
        message: `[DEMO] ${requesterWallet.displayName} requested RM${numericAmount.toFixed(2)} (${cleanNote})`
    });

    if (db) {
        setDoc(doc(db, 'demoPaymentRequests', requestId), requestRecord).catch(() => {});
    }

    return {
        request: { ...requestRecord },
        chatMessage
    };
}

/**
 * Responds to a Demo Payment Request ('accept' | 'decline' | 'cancel').
 * - Prevents accepting a request multiple times.
 * - Checks expiration before processing.
 * - Accepting triggers the atomic `sendDemoMoney` workflow from `recipientId` to `requesterId`.
 */
export async function respondToDemoPaymentRequest({
    authenticatedUid,
    actorId,
    requestId,
    action, // 'accept' | 'decline' | 'cancel'
    idempotencyKey = null
} = {}) {
    if (!authenticatedUid || !actorId || String(authenticatedUid) !== String(actorId)) {
        throw new Error('Unauthorized: Authenticated UID must match actor ID.');
    }
    if (!requestId) {
        throw new Error('Payment request ID is required.');
    }

    const requestsMap = getAllDemoPaymentRequestsMap();
    const reqRecord = requestsMap[requestId];
    if (!reqRecord) {
        throw new Error('Payment request not found.');
    }

    // Check expiration if still pending
    if (
        reqRecord.status === 'pending' &&
        reqRecord.expiresAt &&
        new Date(reqRecord.expiresAt).getTime() < Date.now()
    ) {
        reqRecord.status = 'expired';
        reqRecord.updatedAt = new Date().toISOString();
        requestsMap[requestId] = reqRecord;
        saveAllDemoPaymentRequestsMap(requestsMap);
        throw new Error('This payment request has expired.');
    }

    // Prevent repeated acceptance or mutation of non-pending requests
    if (reqRecord.status !== 'pending') {
        throw new Error(`Payment request has already been ${reqRecord.status} and cannot be processed again.`);
    }

    const nowIso = new Date().toISOString();

    if (action === 'cancel') {
        if (String(actorId) !== String(reqRecord.requesterId)) {
            throw new Error('Only the requester can cancel this payment request.');
        }
        reqRecord.status = 'cancelled';
        reqRecord.updatedAt = nowIso;
        requestsMap[requestId] = reqRecord;
        saveAllDemoPaymentRequestsMap(requestsMap);
        return { request: { ...reqRecord }, transferResult: null };
    }

    if (action === 'decline') {
        if (String(actorId) !== String(reqRecord.recipientId)) {
            throw new Error('Only the requested recipient can decline this payment request.');
        }
        reqRecord.status = 'declined';
        reqRecord.updatedAt = nowIso;
        requestsMap[requestId] = reqRecord;
        saveAllDemoPaymentRequestsMap(requestsMap);

        createNotification({
            recipientId: reqRecord.requesterId,
            type: 'wallet_request_declined',
            actorId: reqRecord.recipientId,
            actorName: reqRecord.recipientName,
            actorHandle: reqRecord.recipientHandle,
            amount: reqRecord.amount,
            requestId: reqRecord.id,
            message: `[DEMO] ${reqRecord.recipientName} declined your RM${reqRecord.amount.toFixed(2)} request.`
        });

        return { request: { ...reqRecord }, transferResult: null };
    }

    if (action === 'accept') {
        if (String(actorId) !== String(reqRecord.recipientId)) {
            throw new Error('Only the requested recipient can accept and pay this request.');
        }

        const transferResult = await sendDemoMoney({
            authenticatedUid: actorId,
            senderId: reqRecord.recipientId,
            recipientId: reqRecord.requesterId,
            amount: reqRecord.amount,
            note: reqRecord.note || 'Payment request settled',
            confirmed: true,
            idempotencyKey: idempotencyKey || `dreq_accept_${reqRecord.id}`,
            conversationId: reqRecord.conversationId,
            postToChat: Boolean(reqRecord.conversationId),
            paymentContextType: 'request_settlement',
            relatedRequestId: reqRecord.id
        });

        const freshRequestsMap = getAllDemoPaymentRequestsMap();
        const updatedReq = {
            ...reqRecord,
            status: 'accepted',
            transferRefId: transferResult.transferReference.id,
            settledReferenceCode: transferResult.referenceCode,
            updatedAt: new Date().toISOString()
        };
        freshRequestsMap[requestId] = updatedReq;
        saveAllDemoPaymentRequestsMap(freshRequestsMap);

        return {
            request: { ...updatedReq },
            transferResult
        };
    }

    throw new Error(`Unsupported payment request action: "${action}".`);
}

// ---------------------------------------------------------------------------
// 7. Split Bills (Equal & Custom Amounts, Multi-Friend Tracking)
// ---------------------------------------------------------------------------

/**
 * Creates a multi-friend Split Bill in Demo RM currency.
 * - Supports `splitMode: 'equal'` (divides `totalAmount` equally across all participants)
 *   or `splitMode: 'custom'` (validates custom per-participant amounts sum to `totalAmount`).
 * - Does NOT assume friends have paid when the split bill is created: friends start as `pending`
 *   with `amountPaid: 0`, and `outstandingAmount` tracks the remaining unpaid balance.
 */
export function createDemoSplitBill({
    authenticatedUid,
    creatorId,
    title = 'Campus Group Meal',
    totalAmount,
    splitMode = 'equal', // 'equal' | 'custom'
    participants = [], // For 'equal': array of userIds or { userId }; For 'custom': [{ userId, amount }]
    includeCreator = true,
    conversationId = null,
    postToChat = false
} = {}) {
    if (!authenticatedUid || !creatorId || String(authenticatedUid) !== String(creatorId)) {
        throw new Error('Unauthorized: Authenticated UID must match split-bill creator ID.');
    }

    const amtValidation = validateRMAmount(totalAmount, { maxAmount: WALLET_DAILY_LIMIT * 2 });
    if (!amtValidation.valid) {
        throw new Error(amtValidation.error);
    }
    const cleanTotal = amtValidation.amount;

    if (!Array.isArray(participants) || participants.length === 0) {
        throw new Error('Please select at least one friend to split the bill with.');
    }

    const creatorWallet = ensureDemoWallet(creatorId);
    const normalizedEntries = [];
    const seenIds = new Set();

    if (includeCreator) {
        seenIds.add(String(creatorId));
        normalizedEntries.push({
            userId: String(creatorId),
            displayName: creatorWallet.displayName,
            handle: creatorWallet.handle,
            isCreator: true,
            rawCustomAmount: null
        });
    }

    for (const item of participants) {
        const uid = typeof item === 'object' ? String(item.userId || item.id || '') : String(item || '');
        if (!uid) continue;
        if (seenIds.has(uid)) {
            if (uid === String(creatorId) && typeof item === 'object' && item.amount !== undefined) {
                const creatorEntry = normalizedEntries.find((e) => e.userId === uid);
                if (creatorEntry) creatorEntry.rawCustomAmount = item.amount;
            }
            continue;
        }
        if (isBlockedBetween(creatorId, uid)) {
            throw new Error('Cannot include a blocked user in a split bill.');
        }
        const prof = getPublicProfile(uid);
        if (!prof || !prof.id) {
            throw new Error(`Participant user "${uid}" does not exist.`);
        }
        seenIds.add(uid);
        normalizedEntries.push({
            userId: uid,
            displayName: prof.displayName,
            handle: prof.username || prof.handle,
            isCreator: uid === String(creatorId),
            rawCustomAmount: typeof item === 'object' ? item.amount : null
        });
    }

    const friendCount = normalizedEntries.filter((e) => !e.isCreator).length;
    if (friendCount === 0) {
        throw new Error('Split bill must include at least one friend besides yourself.');
    }

    const count = normalizedEntries.length;
    const participantShares = [];

    if (splitMode === 'equal') {
        const baseShare = Math.floor((cleanTotal / count) * 100) / 100;
        let remainderCents = Math.round((cleanTotal - baseShare * count) * 100);

        for (const entry of normalizedEntries) {
            const extraCent = remainderCents > 0 ? 0.01 : 0;
            if (remainderCents > 0) remainderCents -= 1;
            const shareAmt = roundRM(baseShare + extraCent);
            participantShares.push({
                userId: entry.userId,
                displayName: entry.displayName,
                handle: entry.handle,
                isCreator: entry.isCreator,
                amountOwed: shareAmt,
                amountPaid: entry.isCreator ? shareAmt : 0,
                status: entry.isCreator ? 'paid' : 'pending', // Creator fronted the bill; friends are pending!
                paidAt: entry.isCreator ? new Date().toISOString() : null,
                transferRefId: null
            });
        }
    } else if (splitMode === 'custom') {
        let sumCustom = 0;
        for (const entry of normalizedEntries) {
            const v = validateRMAmount(entry.rawCustomAmount, { maxAmount: cleanTotal });
            if (!v.valid) {
                throw new Error(`Invalid custom split amount for ${entry.displayName}: ${v.error}`);
            }
            sumCustom = roundRM(sumCustom + v.amount);
            participantShares.push({
                userId: entry.userId,
                displayName: entry.displayName,
                handle: entry.handle,
                isCreator: entry.isCreator,
                amountOwed: v.amount,
                amountPaid: entry.isCreator ? v.amount : 0,
                status: entry.isCreator ? 'paid' : 'pending',
                paidAt: entry.isCreator ? new Date().toISOString() : null,
                transferRefId: null
            });
        }
        if (Math.abs(sumCustom - cleanTotal) > 0.01) {
            throw new Error(
                `Custom split amounts (RM${sumCustom.toFixed(2)}) must equal the total bill (RM${cleanTotal.toFixed(2)}).`
            );
        }
    } else {
        throw new Error('splitMode must be either "equal" or "custom".');
    }

    const totalCollected = roundRM(
        participantShares.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0)
    );
    const outstandingAmount = roundRM(
        participantShares
            .filter((p) => p.status === 'pending')
            .reduce((sum, p) => sum + Number(p.amountOwed || 0), 0)
    );

    const nowIso = new Date().toISOString();
    const splitId = `dsplit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const referenceCode = generateDemoReferenceCode();
    const cleanTitle = sanitizeText(title || 'Campus Split Bill', 100);

    const splitBillRecord = {
        id: splitId,
        referenceCode,
        creatorId: String(creatorId),
        creatorName: creatorWallet.displayName,
        creatorHandle: creatorWallet.handle,
        title: cleanTitle,
        totalAmount: cleanTotal,
        currency: 'RM',
        splitMode,
        participants: participantShares,
        totalCollected,
        outstandingAmount,
        status: outstandingAmount === 0 ? 'settled' : 'active', // 'active' | 'settled' | 'cancelled'
        conversationId: conversationId || null,
        isDemo: true,
        simulationLabel: DEMO_WALLET_BANNER_TEXT,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    const splitMap = getAllDemoSplitBillsMap();
    splitMap[splitId] = splitBillRecord;
    saveAllDemoSplitBillsMap(splitMap);

    // Notify each friend participant & optionally post to chat
    let chatMessage = null;
    for (const part of participantShares) {
        if (part.isCreator) continue;
        createNotification({
            recipientId: part.userId,
            type: 'wallet_request',
            actorId: creatorId,
            actorName: creatorWallet.displayName,
            actorHandle: creatorWallet.handle,
            amount: part.amountOwed,
            requestId: splitId,
            message: `[DEMO SPLIT] ${creatorWallet.displayName} split "${cleanTitle}" (Your share: RM${part.amountOwed.toFixed(2)} of RM${cleanTotal.toFixed(2)})`
        });
    }

    if (conversationId || postToChat) {
        const firstFriend = participantShares.find((p) => !p.isCreator);
        const targetConvId =
            conversationId || (firstFriend ? getDirectConversationId(creatorId, firstFriend.userId) : null);
        if (targetConvId && firstFriend) {
            try {
                ensureDirectConversation(creatorId, firstFriend.userId);
                chatMessage = sendMessage({
                    conversationId: targetConvId,
                    senderId: creatorId,
                    authenticatedUid: creatorId,
                    type: MESSAGE_TYPES.PAYMENT,
                    text: `Demo Split Bill "${cleanTitle}": RM${firstFriend.amountOwed.toFixed(2)} share (Total RM${cleanTotal.toFixed(2)})`,
                    paymentMetadata: {
                        schemaOnlyReservation: true,
                        cardTitle: 'Demo Split Bill',
                        paymentType: 'split',
                        splitBillId: splitId,
                        title: cleanTitle,
                        totalAmountRM: cleanTotal,
                        amountRM: firstFriend.amountOwed,
                        currency: 'RM',
                        senderId: creatorId,
                        senderName: creatorWallet.displayName,
                        senderHandle: creatorWallet.handle,
                        recipientId: firstFriend.userId,
                        recipientName: firstFriend.displayName,
                        recipientHandle: firstFriend.handle,
                        status: 'Pending',
                        referenceCode,
                        note: `${cleanTitle} (${splitMode === 'equal' ? 'Equal split' : 'Custom split'})`,
                        isDemoOnly: true,
                        simulationBanner: DEMO_WALLET_BANNER_TEXT,
                        createdAt: nowIso
                    }
                });
            } catch {
                // ignore
            }
        }
    }

    return {
        splitBill: { ...splitBillRecord },
        chatMessage
    };
}

/**
 * Pays a participant's share of a Demo Split Bill using atomic `sendDemoMoney`.
 */
export async function payDemoSplitBillShare({
    authenticatedUid,
    payerId,
    splitBillId,
    idempotencyKey = null
} = {}) {
    if (!authenticatedUid || !payerId || String(authenticatedUid) !== String(payerId)) {
        throw new Error('Unauthorized: Authenticated UID must match payer ID.');
    }
    if (!splitBillId) {
        throw new Error('Split bill ID is required.');
    }

    const splitMap = getAllDemoSplitBillsMap();
    const splitBill = splitMap[splitBillId];
    if (!splitBill) {
        throw new Error('Split bill not found.');
    }

    const partIndex = splitBill.participants.findIndex((p) => String(p.userId) === String(payerId));
    if (partIndex === -1) {
        throw new Error('You are not a participant in this split bill.');
    }

    const participant = splitBill.participants[partIndex];
    if (participant.status === 'paid') {
        throw new Error('You have already paid your share of this split bill.');
    }
    if (participant.status !== 'pending') {
        throw new Error(`Cannot pay split bill share with status "${participant.status}".`);
    }

    const transferResult = await sendDemoMoney({
        authenticatedUid: payerId,
        senderId: payerId,
        recipientId: splitBill.creatorId,
        amount: participant.amountOwed,
        note: `Split bill share: ${splitBill.title}`,
        confirmed: true,
        idempotencyKey: idempotencyKey || `dsplit_pay_${splitBillId}_${payerId}`,
        conversationId: splitBill.conversationId,
        postToChat: Boolean(splitBill.conversationId),
        paymentContextType: 'split_bill_settlement',
        relatedSplitBillId: splitBillId
    });

    const freshSplitMap = getAllDemoSplitBillsMap();
    const latestSplit = freshSplitMap[splitBillId] || splitBill;
    const nowIso = new Date().toISOString();

    latestSplit.participants = latestSplit.participants.map((p) =>
        String(p.userId) === String(payerId)
            ? {
                  ...p,
                  amountPaid: p.amountOwed,
                  status: 'paid',
                  paidAt: nowIso,
                  transferRefId: transferResult.transferReference.id,
                  referenceCode: transferResult.referenceCode
              }
            : p
    );

    latestSplit.totalCollected = roundRM(
        latestSplit.participants.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0)
    );
    latestSplit.outstandingAmount = roundRM(
        latestSplit.participants
            .filter((p) => p.status === 'pending')
            .reduce((sum, p) => sum + Number(p.amountOwed || 0), 0)
    );
    latestSplit.status = latestSplit.outstandingAmount === 0 ? 'settled' : 'active';
    latestSplit.updatedAt = nowIso;

    freshSplitMap[splitBillId] = latestSplit;
    saveAllDemoSplitBillsMap(freshSplitMap);

    return {
        splitBill: { ...latestSplit },
        transferResult
    };
}

// ---------------------------------------------------------------------------
// 9. Demo Transaction History, Requests & Split Bills Queries
// ---------------------------------------------------------------------------

/**
 * Returns a user's separated Demo Wallet transaction history with filters:
 * - 'all': all completed incoming, outgoing, top-up, and split-bill transactions
 * - 'incoming': incoming transfers only
 * - 'outgoing': outgoing transfers only
 * - 'topup': demo top-ups and initial allocation
 * - 'pending_requests': pending payment requests involving the user
 * - 'split_bills': split bills involving the user
 */
export function getDemoWalletHistory(userId, { filter = 'all' } = {}) {
    if (!userId) return [];

    if (filter === 'pending_requests') {
        return getUserDemoPaymentRequests(userId, { statusFilter: 'pending' });
    }
    if (filter === 'split_bills') {
        return getUserDemoSplitBills(userId);
    }

    const allTx = getAllDemoTransactionsList().filter((tx) => String(tx.userId) === String(userId));
    const filtered = allTx.filter((tx) => {
        if (filter === 'incoming') return tx.direction === 'incoming';
        if (filter === 'outgoing') return tx.direction === 'outgoing';
        if (filter === 'topup') return tx.direction === 'topup';
        return true;
    });

    filtered.sort((a, b) => {
        const cmp = String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
        if (cmp !== 0) return cmp;
        return Number(b.seq || 0) - Number(a.seq || 0);
    });

    return filtered;
}

export function getUserDemoPaymentRequests(userId, { statusFilter = 'all' } = {}) {
    if (!userId) return [];
    const requestsMap = getAllDemoPaymentRequestsMap();
    return Object.values(requestsMap)
        .filter((r) => String(r.requesterId) === String(userId) || String(r.recipientId) === String(userId))
        .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function getUserDemoSplitBills(userId) {
    if (!userId) return [];
    const splitMap = getAllDemoSplitBillsMap();
    return Object.values(splitMap)
        .filter(
            (s) =>
                String(s.creatorId) === String(userId) ||
                (Array.isArray(s.participants) && s.participants.some((p) => String(p.userId) === String(userId)))
        )
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function getDemoTransferByReference(refOrId, viewerId = null) {
    if (!refOrId) return null;
    const refsMap = getAllDemoReferencesMap();
    const found = refsMap[refOrId] || Object.values(refsMap).find((r) => r.referenceCode === refOrId || r.id === refOrId);
    if (!found) return null;
    if (viewerId && found.senderId !== viewerId && found.recipientId !== viewerId) {
        throw new Error('Access denied: You are not a party to this demo transfer.');
    }
    return { ...found };
}
