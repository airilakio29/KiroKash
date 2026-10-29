import {
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    runTransaction,
    collection,
    getDocs,
    onSnapshot,
    query,
    where
} from '../firebase.js';
import {
    DEMO_WALLET,
    INITIAL_DEMO_WALLET_BALANCE,
    WALLET_MAX_PER_TRANSFER,
    WALLET_DAILY_LIMIT,
    DEMO_TOPUP_SOURCES
} from '../config/appConstants.js';
import {
    sanitizeText,
    normalizeHandle,
    checkProfanityAndSpam,
    checkRateLimit
} from '../utils/safetyUtils.js';
import {
    createNotification,
    getPublicProfile,
    getBlockedUserIds
} from './socialService.js';

const WALLET_STORAGE_KEYS = {
    WALLETS: 'kk_demo_wallets_v1',
    LEDGER: 'kk_demo_wallet_ledger_v1',
    REQUESTS: 'kk_demo_wallet_requests_v1',
    IDEMPOTENCY: 'kk_demo_wallet_idempotency_v1',
    FIRST_USE_NOTICE: 'kk_demo_wallet_notice_seen_v1'
};

const memoryWalletStore = {
    [WALLET_STORAGE_KEYS.WALLETS]: null,
    [WALLET_STORAGE_KEYS.LEDGER]: null,
    [WALLET_STORAGE_KEYS.REQUESTS]: null,
    [WALLET_STORAGE_KEYS.IDEMPOTENCY]: null,
    [WALLET_STORAGE_KEYS.FIRST_USE_NOTICE]: {}
};

function readWalletStore(key, fallback) {
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(key);
            if (raw !== null) return JSON.parse(raw);
        } catch {
            // ignore
        }
    }
    if (memoryWalletStore[key] !== null && memoryWalletStore[key] !== undefined) {
        return JSON.parse(JSON.stringify(memoryWalletStore[key]));
    }
    return typeof fallback === 'function' ? fallback() : fallback;
}

function writeWalletStore(key, value) {
    memoryWalletStore[key] = JSON.parse(JSON.stringify(value));
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore
        }
    }
}

export function isDemoWalletEnabled() {
    return Boolean(DEMO_WALLET);
}

function roundCurrency(amount) {
    return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

export function hashDemoPin(pin) {
    const clean = String(pin || '').trim();
    if (!/^\d{4}$/.test(clean)) {
        throw new Error('PIN must be exactly 4 digits.');
    }
    return `demo_pin_${clean}`;
}

function getTodayDateStr(isoString = new Date().toISOString()) {
    return String(isoString).slice(0, 10);
}

export function getAllWalletsMap() {
    return readWalletStore(WALLET_STORAGE_KEYS.WALLETS, {});
}

export function getAllLedgerEntries() {
    return readWalletStore(WALLET_STORAGE_KEYS.LEDGER, []);
}

export function getAllWalletRequests() {
    return readWalletStore(WALLET_STORAGE_KEYS.REQUESTS, []);
}

/**
 * Ensures the user has a KampusKash Demo Wallet initialized with RM100.00 credit.
 * Totally separate from tutorial mock data and does not disturb the onboarding tutorial.
 */
export function ensureUserWallet(user) {
    if (!DEMO_WALLET) return null;
    if (!user || !user.id) return null;

    const userId = String(user.id);
    const wallets = getAllWalletsMap();

    if (!wallets[userId]) {
        const profile = getPublicProfile(userId);
        const displayName = user.name || user.displayName || profile?.displayName || 'Student';
        const handle = normalizeHandle(user.handle || profile?.handle || displayName);
        const now = new Date().toISOString();

        const initialWallet = {
            userId,
            displayName,
            handle,
            balance: roundCurrency(INITIAL_DEMO_WALLET_BALANCE),
            currency: 'MYR',
            pinSet: Boolean(user.isPitchDemo),
            pinHash: user.isPitchDemo ? 'demo_pin_1234' : null,
            autoSyncTracker: true,
            isDemoWallet: true,
            isPitchDemo: Boolean(user.isPitchDemo),
            createdAt: now,
            updatedAt: now
        };

        wallets[userId] = initialWallet;
        writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, wallets);

        // Append initial welcome credit to the append-only ledger if none exists for this user
        const ledger = getAllLedgerEntries();
        const hasInitialEntry = ledger.some(
            (entry) => entry.receiverId === userId && entry.type === 'initial_credit'
        );
        if (!hasInitialEntry) {
            const initialEntry = {
                id: `tx_init_${userId}`,
                idempotencyKey: `idem_init_${userId}`,
                type: 'topup',
                subType: 'initial_credit',
                senderId: 'system_kampuskash',
                senderName: 'KampusKash Demo Treasury',
                senderHandle: 'kampuskash',
                receiverId: userId,
                receiverName: displayName,
                receiverHandle: handle,
                amount: roundCurrency(INITIAL_DEMO_WALLET_BALANCE),
                note: 'Welcome Demo Credit (No real money)',
                sourceName: 'KampusKash Demo Starter Credit',
                status: 'completed',
                referenceCode: `KK-WELCOME-${userId.slice(-4).toUpperCase()}`,
                isDemoWallet: true,
                isPitchDemo: Boolean(user.isPitchDemo),
                createdAt: now
            };
            ledger.push(initialEntry);
            writeWalletStore(WALLET_STORAGE_KEYS.LEDGER, ledger);
        }

        if (db && !user.isDemo && !user.isPitchDemo) {
            setDoc(doc(db, 'wallets', userId), initialWallet, { merge: true }).catch(() => {});
        }
    }

    return { ...wallets[userId] };
}

export function getUserWallet(userId) {
    if (!userId) return null;
    const wallets = getAllWalletsMap();
    if (!wallets[userId]) {
        return ensureUserWallet({ id: userId });
    }
    return { ...wallets[userId] };
}

/**
 * Subscribes to live wallet updates from Firestore.
 * Allows real users on separate devices to see incoming simulated transfers in real time.
 */
export function subscribeToUserWallet(userId, onUpdate) {
    if (!db || !userId) return () => {};
    const walletRef = doc(db, 'wallets', userId);
    return onSnapshot(
        walletRef,
        (snap) => {
            if (snap.exists()) {
                const liveWallet = snap.data();
                const wallets = getAllWalletsMap();
                wallets[userId] = liveWallet;
                writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, wallets);
                if (onUpdate) onUpdate(liveWallet);
            }
        },
        () => {}
    );
}

/**
 * Subscribes to incoming money requests for a user from Firestore.
 */
export function subscribeToUserWalletRequests(userId, onUpdate) {
    if (!db || !userId) return () => {};
    const q = query(collection(db, 'walletRequests'), where('payerId', '==', userId));
    return onSnapshot(
        q,
        (snap) => {
            const list = [];
            snap.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            if (onUpdate && list.length > 0) onUpdate(list);
        },
        () => {}
    );
}

export function hasSeenWalletFirstUseNotice(userId) {
    if (!userId) return false;
    const map = readWalletStore(WALLET_STORAGE_KEYS.FIRST_USE_NOTICE, {});
    return Boolean(map[userId]);
}

export function markWalletFirstUseNoticeSeen(userId) {
    if (!userId) return;
    const map = readWalletStore(WALLET_STORAGE_KEYS.FIRST_USE_NOTICE, {});
    map[userId] = true;
    writeWalletStore(WALLET_STORAGE_KEYS.FIRST_USE_NOTICE, map);
}

export function setWalletPin(userId, newPin) {
    if (!userId) throw new Error('User ID is required.');
    const pinHash = hashDemoPin(newPin);
    const wallets = getAllWalletsMap();
    const wallet = wallets[userId] || ensureUserWallet({ id: userId });
    wallet.pinSet = true;
    wallet.pinHash = pinHash;
    wallet.updatedAt = new Date().toISOString();
    wallets[userId] = wallet;
    writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, wallets);

    if (db && !wallet.isPitchDemo) {
        updateDoc(doc(db, 'wallets', userId), {
            pinSet: true,
            pinHash,
            updatedAt: wallet.updatedAt
        }).catch(() => {});
    }

    return { ...wallet };
}

export function verifyWalletPin(userId, pin) {
    if (!userId) return false;
    if (!/^\d{4}$/.test(String(pin || '').trim())) return false;
    const wallet = getUserWallet(userId);
    if (!wallet || !wallet.pinSet || !wallet.pinHash) return false;
    return wallet.pinHash === `demo_pin_${String(pin).trim()}`;
}

export function setWalletTrackerAutoSync(userId, enabled) {
    if (!userId) return null;
    const wallets = getAllWalletsMap();
    const wallet = wallets[userId] || ensureUserWallet({ id: userId });
    wallet.autoSyncTracker = Boolean(enabled);
    wallet.updatedAt = new Date().toISOString();
    wallets[userId] = wallet;
    writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, wallets);

    if (db && !wallet.isPitchDemo) {
        updateDoc(doc(db, 'wallets', userId), {
            autoSyncTracker: wallet.autoSyncTracker,
            updatedAt: wallet.updatedAt
        }).catch(() => {});
    }

    return { ...wallet };
}

export function getDailyTransferredTotal(userId, dateStr = getTodayDateStr()) {
    if (!userId) return 0;
    const ledger = getAllLedgerEntries();
    const total = ledger
        .filter(
            (tx) =>
                tx.type === 'transfer' &&
                tx.senderId === userId &&
                tx.status === 'completed' &&
                getTodayDateStr(tx.createdAt) === dateStr
        )
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return roundCurrency(total);
}

/**
 * Simulated Top Up flow: pick an amount, choose a demo bank or e-wallet source,
 * credit the demo wallet, and append an immutable ledger entry.
 */
export async function topUpWallet({
    userId,
    amount,
    sourceId = 'fpx_maybank',
    idempotencyKey = null
}) {
    if (!DEMO_WALLET) {
        throw new Error('Demo wallet is disabled.');
    }
    if (!userId) {
        throw new Error('Sign in required to top up wallet.');
    }

    const numericAmount = roundCurrency(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Top-up amount must be greater than RM0.00.');
    }
    if (numericAmount > WALLET_DAILY_LIMIT) {
        throw new Error(`Maximum single demo top-up is RM${WALLET_DAILY_LIMIT.toFixed(2)}.`);
    }

    const idemKey = idempotencyKey || `topup_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const idempotencyMap = readWalletStore(WALLET_STORAGE_KEYS.IDEMPOTENCY, {});
    if (idempotencyMap[idemKey]) {
        const existingReceipt = getWalletReceipt(idempotencyMap[idemKey], userId);
        if (existingReceipt) {
            return {
                wallet: getUserWallet(userId),
                receipt: existingReceipt,
                deduplicated: true
            };
        }
    }

    const source = DEMO_TOPUP_SOURCES.find((s) => s.id === sourceId) || DEMO_TOPUP_SOURCES[0];
    const wallets = getAllWalletsMap();
    const wallet = wallets[userId] || ensureUserWallet({ id: userId });
    const now = new Date().toISOString();

    wallet.balance = roundCurrency(wallet.balance + numericAmount);
    wallet.updatedAt = now;
    wallets[userId] = wallet;

    const ledgerEntry = {
        id: `tx_topup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        idempotencyKey: idemKey,
        type: 'topup',
        senderId: source.id,
        senderName: source.label,
        senderHandle: source.type,
        receiverId: userId,
        receiverName: wallet.displayName,
        receiverHandle: wallet.handle,
        amount: numericAmount,
        note: `Simulated Top Up via ${source.label}`,
        sourceId: source.id,
        sourceName: source.label,
        status: 'completed',
        referenceCode: `KK-TOP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        isDemoWallet: true,
        isPitchDemo: Boolean(wallet.isPitchDemo),
        createdAt: now
    };

    const ledger = getAllLedgerEntries();
    ledger.unshift(ledgerEntry);
    idempotencyMap[idemKey] = ledgerEntry.id;

    writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, wallets);
    writeWalletStore(WALLET_STORAGE_KEYS.LEDGER, ledger);
    writeWalletStore(WALLET_STORAGE_KEYS.IDEMPOTENCY, idempotencyMap);

    if (db && !wallet.isPitchDemo) {
        try {
            await runTransaction(db, async (transaction) => {
                const walletRef = doc(db, 'wallets', userId);
                const ledgerRef = doc(db, 'walletLedger', ledgerEntry.id);
                transaction.set(walletRef, wallet, { merge: true });
                transaction.set(ledgerRef, ledgerEntry);
            });
        } catch {
            // local state already updated atomically
        }
    }

    return {
        wallet: { ...wallet },
        receipt: ledgerEntry,
        deduplicated: false
    };
}

/**
 * Atomic peer-to-peer transfer between two student wallets.
 * Enforces:
 * - No self-transfer
 * - Rate limit
 * - Valid 4-digit PIN
 * - Max per transfer: RM200.00
 * - Daily limit: RM500.00
 * - Non-negative balance
 * - Idempotency key deduplication
 * - Append-only ledger entry
 * - Optional Finance Tracker auto-sync payload
 */
export async function transferMoney({
    sender,
    receiver,
    amount,
    note = '',
    pin = '',
    idempotencyKey = null,
    skipRateLimit = false
}) {
    if (!DEMO_WALLET) {
        throw new Error('Demo wallet is disabled.');
    }

    const senderId = typeof sender === 'object' ? sender?.id : String(sender || '');
    if (!senderId) {
        throw new Error('Sender authentication required.');
    }

    // Resolve receiver by id or @handle
    let receiverProfile = null;
    if (typeof receiver === 'object' && receiver?.id) {
        receiverProfile = getPublicProfile(receiver.id) || {
            id: receiver.id,
            displayName: receiver.displayName || receiver.name || 'Student',
            handle: normalizeHandle(receiver.handle || receiver.displayName || 'student')
        };
    } else if (typeof receiver === 'string') {
        receiverProfile = getPublicProfile(receiver);
    }

    if (!receiverProfile || !receiverProfile.id) {
        throw new Error('Recipient student account not found.');
    }

    const receiverId = String(receiverProfile.id);

    // 1. Block self-transfers
    if (senderId === receiverId) {
        throw new Error('You cannot send money to yourself.');
    }

    // 2. Check blocks
    const senderBlocks = getBlockedUserIds(senderId);
    const receiverBlocks = getBlockedUserIds(receiverId);
    if (senderBlocks.includes(receiverId) || receiverBlocks.includes(senderId)) {
        throw new Error('Transfer unavailable between blocked accounts.');
    }

    // 3. Check idempotency BEFORE rate-limit or balance deduction so a double-tap returns the exact same receipt
    const idemKey = idempotencyKey || `tx_${senderId}_${receiverId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const idempotencyMap = readWalletStore(WALLET_STORAGE_KEYS.IDEMPOTENCY, {});
    if (idempotencyMap[idemKey]) {
        const existingReceipt = getWalletReceipt(idempotencyMap[idemKey], senderId);
        if (existingReceipt) {
            return {
                senderWallet: getUserWallet(senderId),
                receiverWallet: getUserWallet(receiverId),
                receipt: existingReceipt,
                trackerSync: null,
                deduplicated: true
            };
        }
    }

    // 4. Rate limit check
    if (!skipRateLimit) {
        const rate = checkRateLimit('transfer', senderId);
        if (!rate.allowed) {
            throw new Error(rate.reason);
        }
    }

    // 5. Ensure both wallets exist
    const senderWallet = ensureUserWallet(typeof sender === 'object' ? sender : { id: senderId });
    const receiverWallet = ensureUserWallet({
        id: receiverId,
        name: receiverProfile.displayName,
        handle: receiverProfile.handle,
        isPitchDemo: receiverProfile.isPitchDemo
    });

    // 6. Verify 4-digit PIN
    if (!senderWallet.pinSet || !senderWallet.pinHash) {
        throw new Error('Please set your 4-digit demo PIN before sending money.');
    }
    if (!verifyWalletPin(senderId, pin)) {
        throw new Error('Incorrect 4-digit demo PIN. Please try again.');
    }

    // 7. Validate amount & limits
    const numericAmount = roundCurrency(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Transfer amount must be greater than RM0.00.');
    }
    if (numericAmount > WALLET_MAX_PER_TRANSFER) {
        throw new Error(`Maximum per transfer is RM${WALLET_MAX_PER_TRANSFER.toFixed(2)}.`);
    }

    // 8. Validate sufficient balance (block negative balances)
    if (roundCurrency(senderWallet.balance) < numericAmount) {
        throw new Error(
            `Insufficient demo wallet balance (Available: RM${senderWallet.balance.toFixed(2)}, Required: RM${numericAmount.toFixed(2)}).`
        );
    }

    // 9. Validate daily limit (RM500/day)
    const todaySent = getDailyTransferredTotal(senderId);
    if (roundCurrency(todaySent + numericAmount) > WALLET_DAILY_LIMIT) {
        const remaining = Math.max(0, roundCurrency(WALLET_DAILY_LIMIT - todaySent));
        throw new Error(
            `Daily transfer limit of RM${WALLET_DAILY_LIMIT.toFixed(2)} exceeded. Remaining today: RM${remaining.toFixed(2)}.`
        );
    }

    // 10. Sanitize note & check profanity/spam
    const cleanNote = sanitizeText(note || 'Campus transfer', 140);
    const safety = checkProfanityAndSpam(cleanNote);
    if (!safety.valid) {
        throw new Error(safety.reason);
    }

    const now = new Date().toISOString();
    const senderProfile = getPublicProfile(senderId) || {
        id: senderId,
        displayName: senderWallet.displayName || 'Student',
        handle: senderWallet.handle || 'student'
    };

    const receiptId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const referenceCode = `KK-${Date.now().toString(36).slice(-4).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const updatedSenderWallet = {
        ...senderWallet,
        balance: roundCurrency(senderWallet.balance - numericAmount),
        updatedAt: now
    };
    const updatedReceiverWallet = {
        ...receiverWallet,
        balance: roundCurrency(receiverWallet.balance + numericAmount),
        updatedAt: now
    };

    const ledgerEntry = {
        id: receiptId,
        idempotencyKey: idemKey,
        type: 'transfer',
        senderId,
        senderName: senderProfile.displayName,
        senderHandle: senderProfile.handle,
        receiverId,
        receiverName: receiverProfile.displayName,
        receiverHandle: receiverProfile.handle,
        amount: numericAmount,
        note: cleanNote,
        status: 'completed',
        referenceCode,
        senderBalanceAfter: updatedSenderWallet.balance,
        receiverBalanceAfter: updatedReceiverWallet.balance,
        isDemoWallet: true,
        isPitchDemo: Boolean(senderWallet.isPitchDemo || receiverWallet.isPitchDemo),
        createdAt: now
    };

    // Execute Firestore transaction when Firestore is configured & non-pitch-demo
    if (db && !senderWallet.isPitchDemo && !receiverWallet.isPitchDemo) {
        try {
            await runTransaction(db, async (transaction) => {
                const senderRef = doc(db, 'wallets', senderId);
                const receiverRef = doc(db, 'wallets', receiverId);
                const ledgerRef = doc(db, 'walletLedger', receiptId);

                const senderSnap = await transaction.get(senderRef);
                if (senderSnap.exists()) {
                    const liveBalance = roundCurrency(senderSnap.data().balance ?? senderWallet.balance);
                    if (liveBalance < numericAmount) {
                        throw new Error('Insufficient balance in live wallet transaction.');
                    }
                }
                transaction.set(senderRef, updatedSenderWallet, { merge: true });
                transaction.set(receiverRef, updatedReceiverWallet, { merge: true });
                transaction.set(ledgerRef, ledgerEntry);
            });
        } catch (err) {
            if (String(err?.message || '').includes('Insufficient balance')) {
                throw err;
            }
            // If offline or rules in local test mode, proceed with atomic local store commit
        }
    }

    // Commit atomic update to shared wallet store + append-only ledger + idempotency map
    const allWallets = getAllWalletsMap();
    allWallets[senderId] = updatedSenderWallet;
    allWallets[receiverId] = updatedReceiverWallet;

    const allLedger = getAllLedgerEntries();
    allLedger.unshift(ledgerEntry);
    idempotencyMap[idemKey] = receiptId;

    writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, allWallets);
    writeWalletStore(WALLET_STORAGE_KEYS.LEDGER, allLedger);
    writeWalletStore(WALLET_STORAGE_KEYS.IDEMPOTENCY, idempotencyMap);

    // Notify receiver
    createNotification({
        recipientId: receiverId,
        type: 'wallet_received',
        actorId: senderId,
        actorName: senderProfile.displayName,
        actorHandle: senderProfile.handle,
        amount: numericAmount,
        receiptId,
        message: `@${senderProfile.handle} sent you RM${numericAmount.toFixed(2)} (${cleanNote})`,
        isPitchDemo: ledgerEntry.isPitchDemo
    });

    // Build tracker sync payloads (expense for sender, income for receiver under 'Wallet transfer')
    const dateOnly = now.split('T')[0];
    const trackerSync = {
        senderAutoSync: Boolean(updatedSenderWallet.autoSyncTracker),
        receiverAutoSync: Boolean(updatedReceiverWallet.autoSyncTracker),
        senderExpenseTx: {
            id: `trk_exp_${receiptId}`,
            title: `Wallet transfer to @${receiverProfile.handle}`,
            type: 'expense',
            amount: numericAmount,
            categoryId: 'cat-wallet-transfer',
            category: 'Wallet transfer',
            accountId: null,
            source: 'wallet_transfer',
            note: `Sent to @${receiverProfile.handle}: ${cleanNote}`,
            date: dateOnly,
            paymentMethod: 'KampusKash Demo Wallet',
            walletReceiptId: receiptId,
            walletReferenceCode: referenceCode,
            isDemoWalletSync: true,
            createdAt: now,
            updatedAt: now
        },
        receiverIncomeTx: {
            id: `trk_inc_${receiptId}`,
            title: `Wallet transfer from @${senderProfile.handle}`,
            type: 'income',
            amount: numericAmount,
            categoryId: 'cat-wallet-transfer',
            category: 'Wallet transfer',
            accountId: null,
            source: 'wallet_transfer',
            note: `Received from @${senderProfile.handle}: ${cleanNote}`,
            date: dateOnly,
            paymentMethod: 'KampusKash Demo Wallet',
            walletReceiptId: receiptId,
            walletReferenceCode: referenceCode,
            isDemoWalletSync: true,
            createdAt: now,
            updatedAt: now
        }
    };

    // Persist both sender's and receiver's tracker transactions directly into their localStorage tracker keys
    // so when switching accounts in Pitch Mode, each student's Finance Tracker shows the expense/income!
    if (typeof window !== 'undefined' && window.localStorage) {
        if (trackerSync.senderAutoSync) {
            appendTrackerTransactionToStorage(senderId, trackerSync.senderExpenseTx);
        }
        if (trackerSync.receiverAutoSync) {
            appendTrackerTransactionToStorage(receiverId, trackerSync.receiverIncomeTx);
        }
    }

    return {
        senderWallet: { ...updatedSenderWallet },
        receiverWallet: { ...updatedReceiverWallet },
        receipt: ledgerEntry,
        trackerSync,
        deduplicated: false
    };
}

function appendTrackerTransactionToStorage(userId, txItem) {
    if (!userId || !txItem || typeof window === 'undefined' || !window.localStorage) return;
    try {
        const key = `student_tracker_transactions_${userId}`;
        const raw = window.localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        if (!list.some((t) => t.id === txItem.id || (t.walletReceiptId && t.walletReceiptId === txItem.walletReceiptId && t.type === txItem.type))) {
            list.unshift(txItem);
            window.localStorage.setItem(key, JSON.stringify(list));
        }
    } catch {
        // ignore storage errors
    }
}

/**
 * Creates a money request or 50/50 Split Bill request.
 */
export async function requestMoney({
    requester,
    payer,
    amount,
    note = '',
    isSplitBill = false,
    originalTotalAmount = null
}) {
    if (!DEMO_WALLET) {
        throw new Error('Demo wallet is disabled.');
    }

    const requesterId = typeof requester === 'object' ? requester?.id : String(requester || '');
    if (!requesterId) throw new Error('Sign in required to request money.');

    let payerProfile = null;
    if (typeof payer === 'object' && payer?.id) {
        payerProfile = getPublicProfile(payer.id) || {
            id: payer.id,
            displayName: payer.displayName || payer.name || 'Student',
            handle: normalizeHandle(payer.handle || payer.displayName || 'student')
        };
    } else if (typeof payer === 'string') {
        payerProfile = getPublicProfile(payer);
    }

    if (!payerProfile || !payerProfile.id) {
        throw new Error('Target student not found.');
    }

    const payerId = String(payerProfile.id);
    if (requesterId === payerId) {
        throw new Error('You cannot request money from yourself.');
    }

    const requesterBlocks = getBlockedUserIds(requesterId);
    if (requesterBlocks.includes(payerId)) {
        throw new Error('Cannot request money from a blocked user.');
    }

    const rate = checkRateLimit('request_money', requesterId);
    if (!rate.allowed) throw new Error(rate.reason);

    let requestedAmount = roundCurrency(amount);
    let splitTotal = originalTotalAmount ? roundCurrency(originalTotalAmount) : null;

    if (isSplitBill && splitTotal && splitTotal > 0 && (!amount || Number(amount) === 0)) {
        requestedAmount = roundCurrency(splitTotal / 2);
    } else if (isSplitBill && !splitTotal && requestedAmount > 0) {
        splitTotal = roundCurrency(requestedAmount * 2);
    }

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        throw new Error('Request amount must be greater than RM0.00.');
    }
    if (requestedAmount > WALLET_MAX_PER_TRANSFER) {
        throw new Error(`Maximum request amount is RM${WALLET_MAX_PER_TRANSFER.toFixed(2)}.`);
    }

    const cleanNote = sanitizeText(
        note || (isSplitBill ? `50/50 split (Total RM${(splitTotal || requestedAmount * 2).toFixed(2)})` : 'Campus money request'),
        140
    );
    const safety = checkProfanityAndSpam(cleanNote);
    if (!safety.valid) throw new Error(safety.reason);

    const requesterProfile = getPublicProfile(requesterId) || {
        id: requesterId,
        displayName: typeof requester === 'object' ? (requester.name || requester.displayName || 'Student') : 'Student',
        handle: typeof requester === 'object' ? normalizeHandle(requester.handle || 'student') : 'student'
    };

    const now = new Date().toISOString();
    const requestEntry = {
        id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requesterId,
        requesterName: requesterProfile.displayName,
        requesterHandle: requesterProfile.handle,
        payerId,
        payerName: payerProfile.displayName,
        payerHandle: payerProfile.handle,
        amount: requestedAmount,
        note: cleanNote,
        isSplitBill: Boolean(isSplitBill),
        originalTotalAmount: splitTotal,
        status: 'pending', // 'pending' | 'accepted' | 'declined'
        receiptId: null,
        isDemoWallet: true,
        isPitchDemo: Boolean(requesterProfile.isPitchDemo || payerProfile.isPitchDemo),
        createdAt: now,
        updatedAt: now
    };

    const requests = getAllWalletRequests();
    requests.unshift(requestEntry);
    writeWalletStore(WALLET_STORAGE_KEYS.REQUESTS, requests);

    createNotification({
        recipientId: payerId,
        type: 'wallet_request',
        actorId: requesterId,
        actorName: requesterProfile.displayName,
        actorHandle: requesterProfile.handle,
        amount: requestedAmount,
        requestId: requestEntry.id,
        message: isSplitBill
            ? `@${requesterProfile.handle} sent a 50/50 split request for RM${requestedAmount.toFixed(2)} (${cleanNote})`
            : `@${requesterProfile.handle} requested RM${requestedAmount.toFixed(2)} (${cleanNote})`,
        isPitchDemo: requestEntry.isPitchDemo
    });

    if (db && !requestEntry.isPitchDemo) {
        setDoc(doc(db, 'walletRequests', requestEntry.id), requestEntry).catch(() => {});
    }

    return requestEntry;
}

/**
 * Accepts or declines an incoming money request.
 * Accepting triggers an atomic transferMoney() from payer to requester.
 */
export async function respondToMoneyRequest({
    requestId,
    actor,
    action, // 'accept' | 'decline'
    pin = '',
    idempotencyKey = null
}) {
    const actorId = typeof actor === 'object' ? actor?.id : String(actor || '');
    if (!actorId || !requestId) {
        throw new Error('Invalid money request response.');
    }

    const requests = getAllWalletRequests();
    const idx = requests.findIndex((r) => r.id === requestId);
    if (idx === -1) {
        throw new Error('Money request not found.');
    }

    const reqItem = requests[idx];
    if (reqItem.payerId !== actorId) {
        throw new Error('Only the requested payer can accept or decline this request.');
    }
    if (reqItem.status !== 'pending') {
        throw new Error(`This request has already been ${reqItem.status}.`);
    }

    const now = new Date().toISOString();

    if (action === 'decline') {
        reqItem.status = 'declined';
        reqItem.updatedAt = now;
        requests[idx] = reqItem;
        writeWalletStore(WALLET_STORAGE_KEYS.REQUESTS, requests);

        createNotification({
            recipientId: reqItem.requesterId,
            type: 'wallet_request_declined',
            actorId: reqItem.payerId,
            actorName: reqItem.payerName,
            actorHandle: reqItem.payerHandle,
            amount: reqItem.amount,
            requestId: reqItem.id,
            message: `@${reqItem.payerHandle} declined your request for RM${Number(reqItem.amount).toFixed(2)}`,
            isPitchDemo: reqItem.isPitchDemo
        });

        if (db && !reqItem.isPitchDemo) {
            updateDoc(doc(db, 'walletRequests', reqItem.id), {
                status: 'declined',
                updatedAt: now
            }).catch(() => {});
        }

        return { request: { ...reqItem }, transferResult: null };
    }

    if (action === 'accept') {
        const transferResult = await transferMoney({
            sender: { id: reqItem.payerId, name: reqItem.payerName, handle: reqItem.payerHandle },
            receiver: { id: reqItem.requesterId, displayName: reqItem.requesterName, handle: reqItem.requesterHandle },
            amount: reqItem.amount,
            note: reqItem.note || 'Money request settled',
            pin,
            idempotencyKey: idempotencyKey || `req_accept_${reqItem.id}`
        });

        reqItem.status = 'accepted';
        reqItem.receiptId = transferResult.receipt.id;
        reqItem.updatedAt = now;
        requests[idx] = reqItem;
        writeWalletStore(WALLET_STORAGE_KEYS.REQUESTS, requests);

        if (db && !reqItem.isPitchDemo) {
            updateDoc(doc(db, 'walletRequests', reqItem.id), {
                status: 'accepted',
                receiptId: transferResult.receipt.id,
                updatedAt: now
            }).catch(() => {});
        }

        return {
            request: { ...reqItem },
            transferResult
        };
    }

    throw new Error('Action must be "accept" or "decline".');
}

/**
 * Returns filtered wallet history and requests for a user.
 * Filters: 'all' | 'sent' | 'received' | 'topup' | 'requests'
 */
export function getUserWalletHistory(userId, filter = 'all') {
    if (!userId) return [];
    const ledger = getAllLedgerEntries().filter(
        (tx) => tx.senderId === userId || tx.receiverId === userId
    );
    const requests = getAllWalletRequests().filter(
        (r) => r.requesterId === userId || r.payerId === userId
    );

    if (filter === 'requests') {
        return requests
            .map((r) => ({
                ...r,
                entryKind: 'request',
                direction: r.requesterId === userId ? 'outgoing_request' : 'incoming_request'
            }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const enrichedLedger = ledger
        .map((tx) => {
            let direction = 'received';
            if (tx.type === 'topup') {
                direction = 'topup';
            } else if (tx.senderId === userId) {
                direction = 'sent';
            }
            return {
                ...tx,
                entryKind: 'ledger',
                direction
            };
        })
        .filter((tx) => {
            if (filter === 'sent') return tx.direction === 'sent';
            if (filter === 'received') return tx.direction === 'received';
            if (filter === 'topup') return tx.direction === 'topup';
            return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return enrichedLedger;
}

export function getUserWalletRequests(userId) {
    if (!userId) return [];
    return getAllWalletRequests()
        .filter((r) => r.requesterId === userId || r.payerId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getWalletReceipt(receiptId, userId = null) {
    if (!receiptId) return null;
    const ledger = getAllLedgerEntries();
    const found = ledger.find((tx) => tx.id === receiptId || tx.referenceCode === receiptId);
    if (!found) return null;
    if (userId && found.senderId !== userId && found.receiverId !== userId) {
        return null;
    }
    return { ...found };
}

// ---------------------------------------------------------------------------
// QR Code & Paste Code Helpers
// ---------------------------------------------------------------------------

export function encodeWalletQrPayload(user) {
    if (!user || !user.id) return '';
    const profile = getPublicProfile(user.id);
    const handle = normalizeHandle(user.handle || profile?.handle || user.name || 'student');
    const displayName = sanitizeText(user.name || user.displayName || profile?.displayName || 'Student', 40);
    return `KKPAY:${user.id}:${handle}:${encodeURIComponent(displayName)}`;
}

export function parseWalletQrPayload(rawCode = '') {
    const trimmed = String(rawCode || '').trim();
    if (!trimmed) {
        return { valid: false, error: 'Please paste a KampusKash QR code or @username.' };
    }

    if (trimmed.toUpperCase().startsWith('KKPAY:')) {
        const parts = trimmed.split(':');
        if (parts.length >= 3) {
            const userId = parts[1];
            const handle = normalizeHandle(parts[2]);
            const displayName = parts[3] ? decodeURIComponent(parts.slice(3).join(':')) : handle;
            const profile = getPublicProfile(userId) || getPublicProfile(handle) || {
                id: userId,
                handle,
                displayName
            };
            return {
                valid: true,
                recipient: profile
            };
        }
    }

    // Fallback: treat as @username or userId lookup
    const profile = getPublicProfile(trimmed);
    if (profile) {
        return {
            valid: true,
            recipient: profile
        };
    }

    return {
        valid: false,
        error: 'Invalid KampusKash payment code or student @username not found.'
    };
}

// ---------------------------------------------------------------------------
// Pitch Mode Seeding & Reset for Wallet Data
// ---------------------------------------------------------------------------

export function seedPitchWalletState({ wallets = {}, ledger = [], requests = [] } = {}) {
    const existingWallets = getAllWalletsMap();
    const mergedWallets = { ...existingWallets, ...wallets };
    writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, mergedWallets);

    const nonDemoLedger = getAllLedgerEntries().filter((tx) => !tx.isPitchDemo);
    writeWalletStore(WALLET_STORAGE_KEYS.LEDGER, [...ledger, ...nonDemoLedger]);

    const nonDemoRequests = getAllWalletRequests().filter((r) => !r.isPitchDemo);
    writeWalletStore(WALLET_STORAGE_KEYS.REQUESTS, [...requests, ...nonDemoRequests]);

    // Also seed tracker transactions for the pre-seeded wallet transfers so Aiman & Sarah have them in their trackers
    if (typeof window !== 'undefined' && window.localStorage) {
        for (const tx of ledger) {
            if (tx.type === 'transfer' && tx.isPitchDemo) {
                const txDate = String(tx.createdAt || new Date().toISOString()).split('T')[0];
                appendTrackerTransactionToStorage(tx.senderId, {
                    id: `trk_exp_${tx.id}`,
                    title: `Wallet transfer to @${tx.receiverHandle}`,
                    type: 'expense',
                    amount: tx.amount,
                    categoryId: 'cat-wallet-transfer',
                    category: 'Wallet transfer',
                    accountId: null,
                    source: 'wallet_transfer',
                    note: `Sent to @${tx.receiverHandle}: ${tx.note}`,
                    date: txDate,
                    paymentMethod: 'KampusKash Demo Wallet',
                    walletReceiptId: tx.id,
                    walletReferenceCode: tx.referenceCode,
                    isDemoWalletSync: true,
                    isPitchDemo: true,
                    createdAt: tx.createdAt,
                    updatedAt: tx.createdAt
                });
                appendTrackerTransactionToStorage(tx.receiverId, {
                    id: `trk_inc_${tx.id}`,
                    title: `Wallet transfer from @${tx.senderHandle}`,
                    type: 'income',
                    amount: tx.amount,
                    categoryId: 'cat-wallet-transfer',
                    category: 'Wallet transfer',
                    accountId: null,
                    source: 'wallet_transfer',
                    note: `Received from @${tx.senderHandle}: ${tx.note}`,
                    date: txDate,
                    paymentMethod: 'KampusKash Demo Wallet',
                    walletReceiptId: tx.id,
                    walletReferenceCode: tx.referenceCode,
                    isDemoWalletSync: true,
                    isPitchDemo: true,
                    createdAt: tx.createdAt,
                    updatedAt: tx.createdAt
                });
            }
        }
    }
}

export function resetPitchWalletState() {
    const wallets = getAllWalletsMap();
    for (const [id, w] of Object.entries(wallets)) {
        if (w.isPitchDemo) {
            delete wallets[id];
        }
    }
    const ledger = getAllLedgerEntries().filter((tx) => !tx.isPitchDemo);
    const requests = getAllWalletRequests().filter((r) => !r.isPitchDemo);

    writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, wallets);
    writeWalletStore(WALLET_STORAGE_KEYS.LEDGER, ledger);
    writeWalletStore(WALLET_STORAGE_KEYS.REQUESTS, requests);
    writeWalletStore(WALLET_STORAGE_KEYS.IDEMPOTENCY, {});
}
