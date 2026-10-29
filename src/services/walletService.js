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
    KAMPUSKASH_ACCOUNT_ID,
    KAMPUSKASH_ACCOUNT_TYPE,
    ensureKampusKashAccount
} from './accountService.js';
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

/**
 * Deterministic salted one-way hash for the 4-digit demo PIN.
 * Never stores the plain-text digits inside the hash string.
 */
export function hashDemoPin(pin) {
    const clean = String(pin || '').trim();
    if (!/^\d{4}$/.test(clean)) {
        throw new Error('PIN must be exactly 4 digits.');
    }
    const salted = `kk_pay_salt_v2:${clean}:kirokash_demo_pin`;
    let h1 = 0xdeadbeef ^ salted.length;
    let h2 = 0x41c6ce57 ^ salted.length;
    for (let i = 0; i < salted.length; i++) {
        const ch = salted.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return `kk_pin_h2_${hex1}${hex2}`;
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
 * Synchronizes the user's pre-loaded "KampusKash" account inside their My Accounts storage
 * (`student_tracker_accounts_${userId}`) so one balance list drives My Accounts, Tracker, and Totals.
 */
export function syncKampusKashAccountInStorage(userId, newKampusKashBalance, otherAccountUpdate = null) {
    if (!userId) return [];
    const storageKey = `student_tracker_accounts_${userId}`;
    let currentAccounts = [];
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) currentAccounts = JSON.parse(raw);
        } catch {
            currentAccounts = [];
        }
    }

    let updated = ensureKampusKashAccount(currentAccounts, newKampusKashBalance);
    if (otherAccountUpdate && otherAccountUpdate.accountId) {
        updated = updated.map((acc) =>
            acc.accountId === otherAccountUpdate.accountId
                ? {
                      ...acc,
                      balance: roundCurrency(otherAccountUpdate.balance),
                      updatedAt: new Date().toISOString()
                  }
                : acc
        );
    }

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
            // ignore
        }
    }
    return updated;
}

/**
 * Ensures the user has a KampusKash Demo Account & Wallet initialized with RM100.00 credit
 * (or migrates their existing wallet balance into their KampusKash account in My Accounts).
 */
export function ensureUserWallet(user) {
    if (!DEMO_WALLET) return null;
    if (!user || !user.id) return null;

    const userId = String(user.id);
    const wallets = getAllWalletsMap();

    if (!wallets[userId]) {
        const profile = getPublicProfile(userId);
        const displayName = user.name || user.displayName || user.username || profile?.displayName || 'Student';
        const handle = normalizeHandle(user.handle || profile?.handle || displayName);
        const now = new Date().toISOString();

        // Check if user already has a KampusKash account in My Accounts storage to migrate from
        let initialBal = roundCurrency(INITIAL_DEMO_WALLET_BALANCE);
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const rawAcc = window.localStorage.getItem(`student_tracker_accounts_${userId}`);
                if (rawAcc) {
                    const parsedAcc = JSON.parse(rawAcc);
                    const existingKK = Array.isArray(parsedAcc)
                        ? parsedAcc.find(
                              (a) =>
                                  a.accountId === KAMPUSKASH_ACCOUNT_ID ||
                                  a.accountType === KAMPUSKASH_ACCOUNT_TYPE
                          )
                        : null;
                    if (existingKK && Number.isFinite(Number(existingKK.balance))) {
                        initialBal = roundCurrency(existingKK.balance);
                    }
                }
            } catch {
                // ignore
            }
        }

        const initialWallet = {
            userId,
            accountId: KAMPUSKASH_ACCOUNT_ID,
            accountType: KAMPUSKASH_ACCOUNT_TYPE,
            displayName,
            handle,
            balance: initialBal,
            currency: 'MYR',
            pinSet: Boolean(user.isPitchDemo),
            pinHash: user.isPitchDemo ? hashDemoPin('1234') : null,
            autoSyncTracker: true,
            isDemoWallet: true,
            isPitchDemo: Boolean(user.isPitchDemo),
            createdAt: now,
            updatedAt: now
        };

        wallets[userId] = initialWallet;
        writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, wallets);

        // Ensure the pre-loaded KampusKash account is also stored in My Accounts
        syncKampusKashAccountInStorage(userId, initialBal);

        // Append initial welcome credit to the append-only ledger if none exists for this user
        const ledger = getAllLedgerEntries();
        const hasInitialEntry = ledger.some(
            (entry) => entry.receiverId === userId && entry.subType === 'initial_credit'
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
                amount: initialBal,
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
    } else {
        // Migrate legacy plain-prefix PIN hash if present
        const w = wallets[userId];
        if (w.pinHash && String(w.pinHash).startsWith('demo_pin_')) {
            const legacyDigits = String(w.pinHash).replace('demo_pin_', '');
            if (/^\d{4}$/.test(legacyDigits)) {
                w.pinHash = hashDemoPin(legacyDigits);
                wallets[userId] = w;
                writeWalletStore(WALLET_STORAGE_KEYS.WALLETS, wallets);
            }
        }
        syncKampusKashAccountInStorage(userId, w.balance);
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
                syncKampusKashAccountInStorage(userId, liveWallet.balance);
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
    const clean = String(pin || '').trim();
    if (!/^\d{4}$/.test(clean)) return false;
    const wallet = getUserWallet(userId);
    if (!wallet || !wallet.pinSet || !wallet.pinHash) return false;
    const expectedHash = hashDemoPin(clean);
    return wallet.pinHash === expectedHash || wallet.pinHash === `demo_pin_${clean}`;
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
 * Simulated "Add Money" action on the KampusKash card in My Accounts:
 * Moves demo money from one of the user's other accounts into their KampusKash account
 * (a demo transfer between their own accounts, updating both balances atomically).
 */
export async function addMoneyFromOwnAccount({
    userId,
    fromAccount: fromAccountProp,
    sourceAccount,
    amount,
    idempotencyKey = null
}) {
    const fromAccount = fromAccountProp || sourceAccount;
    if (!DEMO_WALLET) {
        throw new Error('Demo wallet is disabled.');
    }
    if (!userId) {
        throw new Error('Sign in required to add money.');
    }
    if (!fromAccount || !fromAccount.accountId) {
        throw new Error('Please select a source account to move money from.');
    }
    if (fromAccount.accountId === KAMPUSKASH_ACCOUNT_ID || fromAccount.accountType === KAMPUSKASH_ACCOUNT_TYPE) {
        throw new Error('Please choose one of your other accounts to move money into KampusKash.');
    }

    const numericAmount = roundCurrency(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Amount must be greater than RM0.00.');
    }
    if (numericAmount > WALLET_DAILY_LIMIT) {
        throw new Error(`Maximum single add-money transfer is RM${WALLET_DAILY_LIMIT.toFixed(2)}.`);
    }

    const sourceBalance = roundCurrency(fromAccount.balance ?? 0);
    if (sourceBalance < numericAmount) {
        throw new Error(
            `Insufficient balance in ${fromAccount.accountName || 'selected account'} (Available: RM${sourceBalance.toFixed(2)}, Required: RM${numericAmount.toFixed(2)}).`
        );
    }

    const idemKey =
        idempotencyKey ||
        `addmoney_${userId}_${fromAccount.accountId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const idempotencyMap = readWalletStore(WALLET_STORAGE_KEYS.IDEMPOTENCY, {});
    if (idempotencyMap[idemKey]) {
        const existingReceipt = getWalletReceipt(idempotencyMap[idemKey], userId);
        if (existingReceipt) {
            return {
                wallet: getUserWallet(userId),
                sourceAccountBalanceAfter: roundCurrency(sourceBalance),
                kampusKashBalanceAfter: getUserWallet(userId)?.balance ?? 0,
                receipt: existingReceipt,
                deduplicated: true
            };
        }
    }

    const wallets = getAllWalletsMap();
    const wallet = wallets[userId] || ensureUserWallet({ id: userId });
    const now = new Date().toISOString();

    const newKampusKashBalance = roundCurrency(wallet.balance + numericAmount);
    const newSourceBalance = roundCurrency(sourceBalance - numericAmount);

    wallet.balance = newKampusKashBalance;
    wallet.updatedAt = now;
    wallets[userId] = wallet;

    const sourceLabel = `${fromAccount.accountName}${fromAccount.institution ? ` (${fromAccount.institution})` : ''}`;
    const ledgerEntry = {
        id: `tx_add_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        idempotencyKey: idemKey,
        type: 'topup',
        subType: 'own_account_transfer',
        senderId: fromAccount.accountId,
        senderName: sourceLabel,
        senderHandle: fromAccount.accountType || 'account',
        receiverId: userId,
        receiverName: wallet.displayName,
        receiverHandle: wallet.handle,
        amount: numericAmount,
        note: `Added money from ${sourceLabel}`,
        sourceId: fromAccount.accountId,
        sourceName: sourceLabel,
        sourceBalanceAfter: newSourceBalance,
        kampusKashBalanceAfter: newKampusKashBalance,
        status: 'completed',
        referenceCode: `KK-ADD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
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

    const updatedAccounts = syncKampusKashAccountInStorage(userId, newKampusKashBalance, {
        accountId: fromAccount.accountId,
        balance: newSourceBalance
    });

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
        updatedAccounts,
        newSourceBalance,
        sourceAccountBalanceAfter: newSourceBalance,
        kampusKashBalanceAfter: newKampusKashBalance,
        receipt: ledgerEntry,
        deduplicated: false
    };
}

/**
 * Simulated Top Up flow: pick an amount, choose a demo bank or e-wallet source
 * (or move from own account), credit the KampusKash account, and append an immutable ledger entry.
 */
export async function topUpWallet({
    userId,
    amount,
    sourceId = 'fpx_maybank',
    fromAccount = null,
    idempotencyKey = null
}) {
    if (fromAccount && fromAccount.accountId) {
        return addMoneyFromOwnAccount({
            userId,
            fromAccount,
            amount,
            idempotencyKey
        });
    }

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
    syncKampusKashAccountInStorage(userId, wallet.balance);

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
 * Atomic peer-to-peer transfer or QR payment between two students.
 * Supports paying from the default KampusKash account ('acc-kampuskash') OR any of the user's other accounts in My Accounts.
 * Enforces:
 * - No self-transfer
 * - Rate limit
 * - Valid 4-digit PIN (hashed)
 * - Max per transfer: RM200.00
 * - Daily limit: RM500.00
 * - Non-negative balance on the chosen source account
 * - Idempotency key deduplication
 * - Append-only ledger entry
 * - Optional Finance Tracker auto-sync payload under "Transfer" category
 */
export async function transferMoney({
    sender,
    receiver,
    amount,
    note = '',
    pin = '',
    sourceAccount = null,
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

    // 8. Determine source account (defaults to KampusKash account, or user's chosen bank/e-wallet account)
    const isCustomSourceAccount =
        sourceAccount &&
        sourceAccount.accountId &&
        sourceAccount.accountId !== KAMPUSKASH_ACCOUNT_ID &&
        sourceAccount.accountType !== KAMPUSKASH_ACCOUNT_TYPE;

    const resolvedSourceAccountId = isCustomSourceAccount
        ? sourceAccount.accountId
        : KAMPUSKASH_ACCOUNT_ID;
    const resolvedSourceAccountName = isCustomSourceAccount
        ? sourceAccount.accountName || 'Linked Account'
        : 'KampusKash';

    const availableBalance = isCustomSourceAccount
        ? roundCurrency(sourceAccount.balance ?? 0)
        : roundCurrency(senderWallet.balance);

    if (availableBalance < numericAmount) {
        throw new Error(
            `Insufficient demo wallet balance in ${resolvedSourceAccountName} (Available: RM${availableBalance.toFixed(2)}, Required: RM${numericAmount.toFixed(2)}).`
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
        balance: isCustomSourceAccount
            ? roundCurrency(senderWallet.balance)
            : roundCurrency(senderWallet.balance - numericAmount),
        updatedAt: now
    };
    const updatedSourceBalanceAfter = roundCurrency(availableBalance - numericAmount);

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
        sourceAccountId: resolvedSourceAccountId,
        sourceAccountName: resolvedSourceAccountName,
        receiverId,
        receiverName: receiverProfile.displayName,
        receiverHandle: receiverProfile.handle,
        amount: numericAmount,
        note: cleanNote,
        status: 'completed',
        referenceCode,
        senderBalanceAfter: updatedSourceBalanceAfter,
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
                if (!isCustomSourceAccount && senderSnap.exists()) {
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

    // Synchronize both sender and receiver accounts in My Accounts storage
    syncKampusKashAccountInStorage(
        senderId,
        updatedSenderWallet.balance,
        isCustomSourceAccount
            ? { accountId: resolvedSourceAccountId, balance: updatedSourceBalanceAfter }
            : null
    );
    syncKampusKashAccountInStorage(receiverId, updatedReceiverWallet.balance);

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

    // Build tracker sync payloads (expense for sender, income for receiver under 'Transfer' category)
    const dateOnly = now.split('T')[0];
    const trackerSync = {
        senderAutoSync: Boolean(updatedSenderWallet.autoSyncTracker),
        receiverAutoSync: Boolean(updatedReceiverWallet.autoSyncTracker),
        sourceAccountId: resolvedSourceAccountId,
        sourceAccountBalanceAfter: updatedSourceBalanceAfter,
        senderExpenseTx: {
            id: `trk_exp_${receiptId}`,
            title: `Transfer to @${receiverProfile.handle}`,
            type: 'expense',
            amount: numericAmount,
            categoryId: 'cat-wallet-transfer',
            category: 'Transfer',
            accountId: resolvedSourceAccountId,
            source: 'wallet_transfer',
            note: `Sent to @${receiverProfile.handle} via ${resolvedSourceAccountName}: ${cleanNote}`,
            date: dateOnly,
            paymentMethod: resolvedSourceAccountName,
            walletReceiptId: receiptId,
            walletReferenceCode: referenceCode,
            isDemoWalletSync: true,
            createdAt: now,
            updatedAt: now
        },
        receiverIncomeTx: {
            id: `trk_inc_${receiptId}`,
            title: `Transfer from @${senderProfile.handle}`,
            type: 'income',
            amount: numericAmount,
            categoryId: 'cat-wallet-transfer',
            category: 'Transfer',
            accountId: KAMPUSKASH_ACCOUNT_ID,
            source: 'wallet_transfer',
            note: `Received from @${senderProfile.handle}: ${cleanNote}`,
            date: dateOnly,
            paymentMethod: 'KampusKash',
            walletReceiptId: receiptId,
            walletReferenceCode: referenceCode,
            isDemoWalletSync: true,
            createdAt: now,
            updatedAt: now
        }
    };

    // Persist both sender's and receiver's tracker transactions directly into their localStorage tracker keys
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
        sourceAccountId: resolvedSourceAccountId,
        sourceAccountBalanceAfter: updatedSourceBalanceAfter,
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
        if (
            !list.some(
                (t) =>
                    t.id === txItem.id ||
                    (t.walletReceiptId && t.walletReceiptId === txItem.walletReceiptId && t.type === txItem.type)
            )
        ) {
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
    sourceAccount = null,
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
            sourceAccount,
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

/**
 * Returns recent unique recipients the user has sent money to.
 */
export function getRecentRecipients(userId, limitCount = 5) {
    if (!userId) return [];
    const ledger = getAllLedgerEntries();
    const seen = new Set();
    const recipients = [];
    for (const tx of ledger) {
        if (tx.type === 'transfer' && tx.senderId === userId && tx.receiverId && !seen.has(tx.receiverId)) {
            seen.add(tx.receiverId);
            const prof = getPublicProfile(tx.receiverId) || {
                id: tx.receiverId,
                displayName: tx.receiverName || 'Student',
                handle: tx.receiverHandle || 'student'
            };
            recipients.push(prof);
            if (recipients.length >= limitCount) break;
        }
    }
    return recipients;
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
// QR Code & Paste Code Helpers (Supports optional baked-in amount for requests)
// ---------------------------------------------------------------------------

export function encodeWalletQrPayload(user, optionalAmount = null, optionalNote = '') {
    if (!user || !user.id) return '';
    const profile = getPublicProfile(user.id);
    const handle = normalizeHandle(user.handle || profile?.handle || user.name || 'student');
    const displayName = sanitizeText(user.name || user.displayName || profile?.displayName || 'Student', 40);
    const basePayload = `KKPAY:${user.id}:${handle}:${encodeURIComponent(displayName)}`;

    const numericAmt = Number(optionalAmount);
    if (optionalAmount !== null && optionalAmount !== '' && Number.isFinite(numericAmt) && numericAmt > 0) {
        const cleanNote = optionalNote ? sanitizeText(optionalNote, 60) : '';
        return cleanNote
            ? `${basePayload}:${roundCurrency(numericAmt).toFixed(2)}:${encodeURIComponent(cleanNote)}`
            : `${basePayload}:${roundCurrency(numericAmt).toFixed(2)}`;
    }

    return basePayload;
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
            const displayName = parts[3] ? decodeURIComponent(parts[3]) : handle;
            let requestedAmount = null;
            let requestedNote = '';

            if (parts.length >= 5) {
                const parsedAmt = Number(parts[4]);
                if (Number.isFinite(parsedAmt) && parsedAmt > 0) {
                    requestedAmount = roundCurrency(parsedAmt);
                }
                if (parts[5]) {
                    requestedNote = decodeURIComponent(parts.slice(5).join(':'));
                }
            }

            const profile = getPublicProfile(userId) || getPublicProfile(handle) || {
                id: userId,
                handle,
                displayName
            };
            return {
                valid: true,
                recipient: profile,
                amount: requestedAmount,
                note: requestedNote
            };
        }
    }

    // Fallback: treat as @username or userId lookup
    const profile = getPublicProfile(trimmed);
    if (profile) {
        return {
            valid: true,
            recipient: profile,
            amount: null,
            note: ''
        };
    }

    return {
        valid: false,
        error: 'Invalid KampusKash payment code or student @username not found.'
    };
}

// ---------------------------------------------------------------------------
// Pitch Mode Seeding & Reset for Wallet & KampusKash Account Data
// ---------------------------------------------------------------------------

export function seedPitchWalletState({ wallets = {}, ledger = [], requests = [] } = {}) {
    const existingWallets = getAllWalletsMap();
    const mergedWallets = { ...existingWallets };

    for (const [uid, w] of Object.entries(wallets)) {
        const pinHash =
            w.pinHash && String(w.pinHash).startsWith('demo_pin_')
                ? hashDemoPin(String(w.pinHash).replace('demo_pin_', ''))
                : w.pinHash || hashDemoPin('1234');
        mergedWallets[uid] = {
            ...w,
            accountId: KAMPUSKASH_ACCOUNT_ID,
            accountType: KAMPUSKASH_ACCOUNT_TYPE,
            pinHash
        };
        syncKampusKashAccountInStorage(uid, w.balance);
    }

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
                    title: `Transfer to @${tx.receiverHandle}`,
                    type: 'expense',
                    amount: tx.amount,
                    categoryId: 'cat-wallet-transfer',
                    category: 'Transfer',
                    accountId: KAMPUSKASH_ACCOUNT_ID,
                    source: 'wallet_transfer',
                    note: `Sent to @${tx.receiverHandle}: ${tx.note}`,
                    date: txDate,
                    paymentMethod: 'KampusKash',
                    walletReceiptId: tx.id,
                    walletReferenceCode: tx.referenceCode,
                    isDemoWalletSync: true,
                    isPitchDemo: true,
                    createdAt: tx.createdAt,
                    updatedAt: tx.createdAt
                });
                appendTrackerTransactionToStorage(tx.receiverId, {
                    id: `trk_inc_${tx.id}`,
                    title: `Transfer from @${tx.senderHandle}`,
                    type: 'income',
                    amount: tx.amount,
                    categoryId: 'cat-wallet-transfer',
                    category: 'Transfer',
                    accountId: KAMPUSKASH_ACCOUNT_ID,
                    source: 'wallet_transfer',
                    note: `Received from @${tx.senderHandle}: ${tx.note}`,
                    date: txDate,
                    paymentMethod: 'KampusKash',
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
