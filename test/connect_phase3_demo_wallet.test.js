import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock localStorage in Node environment
const storageMap = new Map();
globalThis.localStorage = {
    getItem(k) {
        return storageMap.has(k) ? storageMap.get(k) : null;
    },
    setItem(k, v) {
        storageMap.set(k, String(v));
    },
    removeItem(k) {
        storageMap.delete(k);
    },
    clear() {
        storageMap.clear();
    }
};

import {
    ensurePublicProfileForUser,
    sendFriendRequest,
    acceptFriendRequest,
    blockUser,
    unblockUser
} from '../src/services/socialService.js';
import { resetRateLimits } from '../src/utils/safetyUtils.js';
import {
    resetMessengerStateForTesting,
    getUserConversations,
    subscribeToConversationMessages
} from '../src/services/messengerService.js';
import {
    DEMO_P2P_WALLET_NAME,
    DEMO_P2P_BANNER_TEXT,
    DEMO_P2P_INITIAL_BALANCE,
    resetDemoWalletStateForTesting,
    ensureDemoWallet,
    getDemoWallet,
    attemptDirectClientBalanceModify,
    topUpDemoWallet,
    sendDemoMoney,
    createDemoPaymentRequest,
    respondToDemoPaymentRequest,
    createDemoSplitBill,
    payDemoSplitBillShare,
    getDemoWalletHistory,
    getUserDemoPaymentRequests,
    getUserDemoSplitBills,
    getDemoTransferByReference
} from '../src/services/demoWalletService.js';
import { validateDemoWalletBackendOperation } from '../functions/src/connect/demoWalletFunction.js';

async function makeFriendsIfNeeded(u1, u2) {
    try {
        await unblockUser(u1.id, u2.id);
        await unblockUser(u2.id, u1.id);
    } catch {
        // ignore
    }
    try {
        resetRateLimits();
        const req = await sendFriendRequest(
            { id: u1.id, name: u1.displayName, handle: u1.handle },
            u2.id
        );
        await acceptFriendRequest(u2.id, req.id);
    } catch {
        // already friends in memory store
    }
}

async function setupThreeTestFriends() {
    globalThis.localStorage.clear();
    resetMessengerStateForTesting();
    resetDemoWalletStateForTesting();
    resetRateLimits();

    const uA = ensurePublicProfileForUser({
        id: 'user_a',
        name: 'Aiman Hakim',
        handle: 'aiman_um',
        university: 'Universiti Malaya (UM)'
    });
    const uB = ensurePublicProfileForUser({
        id: 'user_b',
        name: 'Nurul Izzah',
        handle: 'nurul_upm',
        university: 'Universiti Putra Malaysia (UPM)'
    });
    const uC = ensurePublicProfileForUser({
        id: 'user_c',
        name: 'Danish Irfan',
        handle: 'danish_ukm',
        university: 'Universiti Kebangsaan Malaysia (UKM)'
    });

    await makeFriendsIfNeeded(uA, uB);
    await makeFriendsIfNeeded(uA, uC);
    await makeFriendsIfNeeded(uB, uC);
    resetRateLimits();
}

test('Phase 3 (1): Initial demo balance allocation (one-time RM100.00, no duplicate allocation on re-init)', async () => {
    await setupThreeTestFriends();

    const walletA = ensureDemoWallet('user_a');
    const walletB = ensureDemoWallet('user_b');
    const walletC = ensureDemoWallet('user_c');

    assert.equal(DEMO_P2P_WALLET_NAME, 'KampusKash Demo Wallet');
    assert.equal(walletA.simulationLabel, DEMO_P2P_BANNER_TEXT);
    assert.equal(walletA.balance, DEMO_P2P_INITIAL_BALANCE);
    assert.equal(walletA.currency, 'RM');
    assert.equal(walletA.totalReceived, 0);
    assert.equal(walletA.totalSent, 0);
    assert.equal(walletA.initialAllocationGranted, true);
    assert.equal(walletB.balance, 100);
    assert.equal(walletC.balance, 100);

    // Re-calling ensureDemoWallet must NOT grant additional free RM100
    const walletAAgain = ensureDemoWallet('user_a');
    assert.equal(walletAAgain.balance, 100);
});

test('Phase 3 (2 & 3): Sending and receiving money atomically (User A RM100 -> sends RM25 to User B -> User A RM75, User B RM125 + chat payment card)', async () => {
    await setupThreeTestFriends();

    const result = await sendDemoMoney({
        authenticatedUid: 'user_a',
        senderId: 'user_a',
        recipientId: 'user_b',
        amount: 25,
        note: 'Nasi Kandar Pelita dinner',
        confirmed: true,
        postToChat: true,
        idempotencyKey: 'tx_ab_25_001'
    });

    assert.equal(result.deduplicated, false);
    assert.equal(result.senderWallet.balance, 75);
    assert.equal(result.senderWallet.totalSent, 25);
    assert.equal(result.recipientWallet.balance, 125);
    assert.equal(result.recipientWallet.totalReceived, 25);

    // Verify receipt and reference code format KK-DEMO-XXXXXXXX
    assert.match(result.referenceCode, /^KK-DEMO-[A-Z0-9]{8}$/);
    assert.equal(result.transferReference.amount, 25);
    assert.equal(result.transferReference.recipientName, 'Nurul Izzah');
    assert.equal(result.transferReference.status, 'completed');

    // Verify both users have separated demo ledger entries sharing the same reference code
    const historyA = getDemoWalletHistory('user_a', { filter: 'outgoing' });
    const historyB = getDemoWalletHistory('user_b', { filter: 'incoming' });
    assert.equal(historyA.length, 1);
    assert.equal(historyB.length, 1);
    assert.equal(historyA[0].referenceCode, result.referenceCode);
    assert.equal(historyB[0].referenceCode, result.referenceCode);
    assert.equal(historyA[0].isDemo, true);

    // Verify lookup by reference
    const refRecord = getDemoTransferByReference(result.referenceCode, 'user_a');
    assert.ok(refRecord);
    assert.equal(refRecord.amount, 25);

    // Non-participant cannot inspect private transfer reference
    assert.throws(
        () => getDemoTransferByReference(result.referenceCode, 'user_c'),
        /Access denied/i
    );

    // Verify payment message card was created inside their conversation
    const convs = getUserConversations('user_a');
    const convAB = convs.find((c) => c.otherParticipantId === 'user_b');
    assert.ok(convAB);

    let messages = [];
    const unsub = subscribeToConversationMessages(convAB.id, 'user_a', (page) => {
        messages = page.messages;
    });
    unsub();

    const paymentCardMsg = messages.find((m) => m.type === 'payment');
    assert.ok(paymentCardMsg);
    assert.equal(paymentCardMsg.paymentMetadata.cardTitle, 'Demo Money Sent');
    assert.equal(paymentCardMsg.paymentMetadata.amountRM, 25);
    assert.equal(paymentCardMsg.paymentMetadata.referenceCode, result.referenceCode);
    assert.equal(paymentCardMsg.paymentMetadata.simulationBanner, DEMO_P2P_BANNER_TEXT);
});

test('Phase 3 (4, 5, 6): Rejects insufficient balance, invalid amounts, >2 decimals, self-transfer, blocked users, and unconfirmed transfers', async () => {
    await setupThreeTestFriends();

    // 4. Insufficient balance (User A has RM100, tries to send RM150)
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_b',
                amount: 150,
                confirmed: true
            }),
        /Insufficient demo wallet balance/i
    );
    assert.equal(getDemoWallet('user_a').balance, 100);
    assert.equal(getDemoWallet('user_b').balance, 100);

    // 5. Invalid amounts: zero, negative, NaN, more than 2 decimal places
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_b',
                amount: 0,
                confirmed: true
            }),
        /greater than RM0\.00/i
    );
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_b',
                amount: -10,
                confirmed: true
            }),
        /greater than RM0\.00/i
    );
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_b',
                amount: 'abc',
                confirmed: true
            }),
        /Invalid numerical input/i
    );
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_b',
                amount: 12.345,
                confirmed: true
            }),
        /at most 2 decimal places/i
    );

    // 6. Sending to oneself
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_a',
                amount: 10,
                confirmed: true
            }),
        /cannot send demo money to yourself/i
    );

    // Unconfirmed transfer
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_b',
                amount: 10,
                confirmed: false
            }),
        /Explicit confirmation is required/i
    );

    // Non-existent user
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'ghost_999',
                amount: 10,
                confirmed: true
            }),
        /Recipient user does not exist/i
    );

    // Blocked user rejection
    blockUser('user_a', 'user_c');
    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_c',
                amount: 10,
                confirmed: true
            }),
        /blocked/i
    );
    unblockUser('user_a', 'user_c');
});

test('Phase 3 (7): Duplicate transfer submission protection (idempotency)', async () => {
    await setupThreeTestFriends();

    const first = await sendDemoMoney({
        authenticatedUid: 'user_a',
        senderId: 'user_a',
        recipientId: 'user_b',
        amount: 20,
        note: 'Idempotent transfer test',
        confirmed: true,
        idempotencyKey: 'idem_unique_key_777'
    });

    const second = await sendDemoMoney({
        authenticatedUid: 'user_a',
        senderId: 'user_a',
        recipientId: 'user_b',
        amount: 20,
        note: 'Idempotent transfer test',
        confirmed: true,
        idempotencyKey: 'idem_unique_key_777'
    });

    assert.equal(first.deduplicated, false);
    assert.equal(second.deduplicated, true);
    assert.equal(first.referenceCode, second.referenceCode);

    // Balances must only be adjusted once (RM100 - RM20 = RM80, RM100 + RM20 = RM120)
    assert.equal(getDemoWallet('user_a').balance, 80);
    assert.equal(getDemoWallet('user_b').balance, 120);
});

test('Phase 3 (8 & 9): Payment requests — accept, prevent repeated acceptance, decline, cancel, and expire', async () => {
    await setupThreeTestFriends();

    // User A requests RM30 from User B
    const { request: req1 } = createDemoPaymentRequest({
        authenticatedUid: 'user_a',
        requesterId: 'user_a',
        recipientId: 'user_b',
        amount: 30,
        note: 'Badminton court booking',
        postToChat: true
    });
    assert.equal(req1.status, 'pending');
    assert.match(req1.referenceCode, /^KK-DEMO-[A-Z0-9]{8}$/);

    // User B accepts request -> atomic transfer of RM30 from User B to User A
    const accepted = await respondToDemoPaymentRequest({
        authenticatedUid: 'user_b',
        actorId: 'user_b',
        requestId: req1.id,
        action: 'accept'
    });
    assert.equal(accepted.request.status, 'accepted');
    assert.equal(getDemoWallet('user_a').balance, 130);
    assert.equal(getDemoWallet('user_b').balance, 70);

    // 8. Repeated payment request acceptance MUST be rejected
    await assert.rejects(
        () =>
            respondToDemoPaymentRequest({
                authenticatedUid: 'user_b',
                actorId: 'user_b',
                requestId: req1.id,
                action: 'accept'
            }),
        /already been accepted/i
    );

    // 9a. Declined request
    const { request: reqDecline } = createDemoPaymentRequest({
        authenticatedUid: 'user_a',
        requesterId: 'user_a',
        recipientId: 'user_b',
        amount: 15,
        note: 'Snacks'
    });
    const declined = await respondToDemoPaymentRequest({
        authenticatedUid: 'user_b',
        actorId: 'user_b',
        requestId: reqDecline.id,
        action: 'decline'
    });
    assert.equal(declined.request.status, 'declined');

    // 9b. Cancelled request by requester
    const { request: reqCancel } = createDemoPaymentRequest({
        authenticatedUid: 'user_a',
        requesterId: 'user_a',
        recipientId: 'user_c',
        amount: 12,
        note: 'Printing'
    });
    const cancelled = await respondToDemoPaymentRequest({
        authenticatedUid: 'user_a',
        actorId: 'user_a',
        requestId: reqCancel.id,
        action: 'cancel'
    });
    assert.equal(cancelled.request.status, 'cancelled');

    // 9c. Expired request cannot be accepted
    const { request: reqExpired } = createDemoPaymentRequest({
        authenticatedUid: 'user_a',
        requesterId: 'user_a',
        recipientId: 'user_c',
        amount: 18,
        note: 'Expired test',
        expiresInMs: -5000 // already in the past
    });

    await assert.rejects(
        () =>
            respondToDemoPaymentRequest({
                authenticatedUid: 'user_c',
                actorId: 'user_c',
                requestId: reqExpired.id,
                action: 'accept'
            }),
        /expired/i
    );

    const checkedReqs = getUserDemoPaymentRequests('user_c');
    const foundExpired = checkedReqs.find((r) => r.id === reqExpired.id);
    assert.equal(foundExpired.status, 'expired');
});

test('Phase 3 (10): Equal and custom split bills (3 friends splitting RM90 dinner bill, tracking paid vs pending and outstanding amounts)', async () => {
    await setupThreeTestFriends();

    // Example scenario from spec:
    // Total bill: RM90.00, 3 people (User A creator, User B, User C) -> Each pays RM30.00
    const { splitBill: equalBill } = createDemoSplitBill({
        authenticatedUid: 'user_a',
        creatorId: 'user_a',
        title: 'Dinner at Mamak',
        totalAmount: 90,
        splitMode: 'equal',
        participants: ['user_b', 'user_c'],
        postToChat: true
    });

    assert.equal(equalBill.totalAmount, 90);
    assert.equal(equalBill.participants.length, 3);
    assert.equal(equalBill.status, 'active');
    // Creator's RM30 share is marked paid; User B (RM30) and User C (RM30) are pending -> outstanding = RM60.00
    assert.equal(equalBill.outstandingAmount, 60);

    // User B pays their RM30 share
    const afterBPaid = await payDemoSplitBillShare({
        authenticatedUid: 'user_b',
        payerId: 'user_b',
        splitBillId: equalBill.id
    });
    assert.equal(afterBPaid.splitBill.outstandingAmount, 30);
    assert.equal(afterBPaid.splitBill.status, 'active'); // Still active because User C has not paid yet!
    assert.equal(getDemoWallet('user_a').balance, 130);
    assert.equal(getDemoWallet('user_b').balance, 70);

    // User B cannot pay their share a second time
    await assert.rejects(
        () =>
            payDemoSplitBillShare({
                authenticatedUid: 'user_b',
                payerId: 'user_b',
                splitBillId: equalBill.id
            }),
        /already paid/i
    );

    // User C pays their RM30 share -> Bill becomes settled with RM0.00 outstanding
    const afterCPaid = await payDemoSplitBillShare({
        authenticatedUid: 'user_c',
        payerId: 'user_c',
        splitBillId: equalBill.id
    });
    assert.equal(afterCPaid.splitBill.outstandingAmount, 0);
    assert.equal(afterCPaid.splitBill.status, 'settled');
    assert.equal(getDemoWallet('user_a').balance, 160);
    assert.equal(getDemoWallet('user_c').balance, 70);

    // Custom split bill test (Total RM50: User A RM20, User B RM18, User C RM12)
    const { splitBill: customBill } = createDemoSplitBill({
        authenticatedUid: 'user_a',
        creatorId: 'user_a',
        title: 'Custom Cafe Order',
        totalAmount: 50,
        splitMode: 'custom',
        participants: [
            { userId: 'user_a', amount: 20 },
            { userId: 'user_b', amount: 18 },
            { userId: 'user_c', amount: 12 }
        ]
    });
    assert.equal(customBill.outstandingAmount, 30);
    assert.equal(getUserDemoSplitBills('user_a').length, 2);
});

test('Phase 3 (11): Simultaneous transfers execute atomically with serialized lock and exact final balances', async () => {
    await setupThreeTestFriends();

    // User A (RM100) simultaneously sends RM15 to User B and RM25 to User C, while User B (RM100) sends RM10 to User C
    const [tx1, tx2, tx3] = await Promise.all([
        sendDemoMoney({
            authenticatedUid: 'user_a',
            senderId: 'user_a',
            recipientId: 'user_b',
            amount: 15,
            confirmed: true,
            idempotencyKey: 'sim_1'
        }),
        sendDemoMoney({
            authenticatedUid: 'user_a',
            senderId: 'user_a',
            recipientId: 'user_c',
            amount: 25,
            confirmed: true,
            idempotencyKey: 'sim_2'
        }),
        sendDemoMoney({
            authenticatedUid: 'user_b',
            senderId: 'user_b',
            recipientId: 'user_c',
            amount: 10,
            confirmed: true,
            idempotencyKey: 'sim_3'
        })
    ]);

    assert.ok(tx1.referenceCode);
    assert.ok(tx2.referenceCode);
    assert.ok(tx3.referenceCode);

    // User A: 100 - 15 - 25 = RM60
    // User B: 100 + 15 - 10 = RM105
    // User C: 100 + 25 + 10 = RM135
    assert.equal(getDemoWallet('user_a').balance, 60);
    assert.equal(getDemoWallet('user_b').balance, 105);
    assert.equal(getDemoWallet('user_c').balance, 135);
});

test('Phase 3 (12): Firestore transaction failure rolls back completely without partially changing either wallet', async () => {
    await setupThreeTestFriends();

    await assert.rejects(
        () =>
            sendDemoMoney({
                authenticatedUid: 'user_a',
                senderId: 'user_a',
                recipientId: 'user_b',
                amount: 40,
                confirmed: true,
                simulateTransactionFailure: true
            }),
        /atomic transaction aborted/i
    );

    // Neither wallet nor P2P transfer history may be modified after rollback
    assert.equal(getDemoWallet('user_a').balance, 100);
    assert.equal(getDemoWallet('user_b').balance, 100);
    assert.equal(getDemoWalletHistory('user_a', { filter: 'outgoing' }).length, 0);
    assert.equal(getDemoWalletHistory('user_b', { filter: 'incoming' }).length, 0);
});

test('Phase 3 (13): Unauthorised attempts to modify balances directly are blocked & security rules verified', async () => {
    await setupThreeTestFriends();

    // Direct client modification guard must throw
    assert.throws(
        () => attemptDirectClientBalanceModify({ callerRole: 'client' }),
        /Clients are forbidden from directly modifying demo wallet balances/i
    );
    assert.equal(getDemoWallet('user_a').balance, 100);

    // Cloud Function validator checks
    const unauthCheck = validateDemoWalletBackendOperation({
        actorUid: null,
        action: 'send_demo_money',
        payload: { senderId: 'user_a', recipientId: 'user_b', amount: 10, confirmed: true }
    });
    assert.equal(unauthCheck.valid, false);
    assert.equal(unauthCheck.status, 401);

    const spoofCheck = validateDemoWalletBackendOperation({
        actorUid: 'user_a',
        action: 'send_demo_money',
        payload: { senderId: 'user_b', recipientId: 'user_c', amount: 10, confirmed: true }
    });
    assert.equal(spoofCheck.valid, false);
    assert.equal(spoofCheck.status, 403);

    const directModifyCheck = validateDemoWalletBackendOperation({
        actorUid: 'user_a',
        action: 'direct_balance_write'
    });
    assert.equal(directModifyCheck.valid, false);
    assert.equal(directModifyCheck.status, 403);

    // Verify firestore.rules forbids client writes to /demoWallets and /demoWalletTransactions
    const rulesText = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
    assert.match(rulesText, /match \/demoWallets\/\{userId\}/);
    assert.match(rulesText, /match \/demoWalletTransactions\/\{txId\}/);
    assert.match(rulesText, /allow create, update, delete: if false;/);
});

test('Phase 3 (14): Strict separation between demo P2P transfers and real financial tracker records', async () => {
    await setupThreeTestFriends();

    // Seed real financial tracker accounts & transactions for User A
    const realAccountsKey = 'student_tracker_accounts_user_a';
    const realTransactionsKey = 'student_tracker_transactions_user_a';
    const initialRealAccounts = JSON.stringify([
        { accountId: 'acc_maybank', accountName: 'Maybank Savings', balance: 1500.0 }
    ]);
    const initialRealTransactions = JSON.stringify([
        { id: 'real_tx_1', type: 'expense', amount: 12.5, category: 'Food' }
    ]);
    globalThis.localStorage.setItem(realAccountsKey, initialRealAccounts);
    globalThis.localStorage.setItem(realTransactionsKey, initialRealTransactions);

    // Perform P2P demo top-up, transfer, request, and split bill
    await topUpDemoWallet({
        authenticatedUid: 'user_a',
        userId: 'user_a',
        amount: 50,
        note: 'Simulated Testing Top-Up'
    });
    await sendDemoMoney({
        authenticatedUid: 'user_a',
        senderId: 'user_a',
        recipientId: 'user_b',
        amount: 35,
        note: 'Simulated P2P test',
        confirmed: true
    });

    // Verify real financial tracker accounts and transactions are 100% untouched
    assert.equal(globalThis.localStorage.getItem(realAccountsKey), initialRealAccounts);
    assert.equal(globalThis.localStorage.getItem(realTransactionsKey), initialRealTransactions);
    assert.equal(getDemoWallet('user_a').balance, 115);
});
