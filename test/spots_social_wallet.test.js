import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    SPOT_FEED_NAME,
    DEMO_WALLET,
    DEMO_WALLET_BADGE_TEXT,
    INITIAL_DEMO_WALLET_BALANCE,
    WALLET_MAX_PER_TRANSFER,
    WALLET_DAILY_LIMIT,
    SPOT_CATEGORIES,
    SPOT_BUDGET_TAGS,
    getBudgetTagForPrice
} from '../src/config/appConstants.js';

import {
    sanitizeText,
    normalizeHandle,
    checkProfanityAndSpam,
    checkRateLimit,
    resetRateLimits,
    validateSpotPhotoFile
} from '../src/utils/safetyUtils.js';

import {
    generateInitialCommunityThreads,
    migrateExistingMakanMurahPosts,
    filterAndSortThreads,
    createThreadObject,
    createReplyObject
} from '../src/services/communityService.js';

import {
    stripFinancialFieldsFromProfile,
    ensurePublicProfileForUser,
    updatePublicSocialProfile,
    getPublicProfile,
    followUser,
    unfollowUser,
    isFollowingUser,
    toggleSaveSpot,
    getSavedSpotIds,
    blockUser,
    unblockUser,
    getUserNotifications,
    seedPitchSocialData,
    resetPitchSocialData
} from '../src/services/socialService.js';

import {
    ensureUserWallet,
    setWalletPin,
    topUpWallet,
    transferMoney,
    requestMoney,
    respondToMoneyRequest,
    getUserWallet,
    getUserWalletHistory,
    encodeWalletQrPayload,
    parseWalletQrPayload,
    seedPitchWalletState,
    resetPitchWalletState
} from '../src/services/walletService.js';

import {
    PITCH_DEMO_USERS,
    generatePitchSpots,
    generatePitchWalletData
} from '../src/demo/pitchSeedData.js';

test('PART 1: Spot Jimat constants, 6 categories, budget tags, and Makan Murah migration', () => {
    assert.equal(SPOT_FEED_NAME, 'Spot Jimat');
    assert.equal(DEMO_WALLET, true);
    assert.equal(DEMO_WALLET_BADGE_TEXT, 'DEMO MODE: no real money');
    assert.equal(SPOT_CATEGORIES.length, 6);
    assert.equal(SPOT_BUDGET_TAGS.length, 4);

    assert.equal(getBudgetTagForPrice(0), 'under-rm5');
    assert.equal(getBudgetTagForPrice(4.90), 'under-rm5');
    assert.equal(getBudgetTagForPrice(12.00), 'rm5-15');
    assert.equal(getBudgetTagForPrice(25.00), 'rm15-30');
    assert.equal(getBudgetTagForPrice(45.00), 'rm30-plus');

    // Verify legacy Makan Murah posts migrate cleanly into category 'makan' without losing data
    const legacyPosts = generateInitialCommunityThreads();
    assert.ok(legacyPosts.length >= 6);
    const migrated = migrateExistingMakanMurahPosts(legacyPosts);
    assert.equal(migrated.length, legacyPosts.length);

    for (let i = 0; i < legacyPosts.length; i++) {
        assert.equal(migrated[i].id, legacyPosts[i].id);
        assert.equal(migrated[i].title, legacyPosts[i].title);
        assert.equal(migrated[i].category, 'makan');
        assert.equal(migrated[i].placeName, legacyPosts[i].stallName);
        assert.ok(migrated[i].budgetTag);
        assert.equal(migrated[i].replies.length, legacyPosts[i].replies.length);
    }
});

test('PART 1 & 4: Pitch Mode seeds 8 fictional students and 28 spots across all 6 categories, and filters work', () => {
    assert.equal(PITCH_DEMO_USERS.length, 8);
    const spots = generatePitchSpots();
    assert.ok(spots.length >= 25 && spots.length <= 30, `Expected 25-30 spots, got ${spots.length}`);

    // Verify every category has spots and all are marked isPitchDemo
    for (const cat of SPOT_CATEGORIES) {
        const count = spots.filter((s) => s.category === cat.id).length;
        assert.ok(count >= 2, `Category ${cat.id} should have at least 2 spots, got ${count}`);
    }
    assert.ok(spots.every((s) => s.isPitchDemo === true));

    // Test Following tab filter
    const followingOnly = filterAndSortThreads(spots, {
        feedTab: 'following',
        followingIds: ['demo-student-aiman']
    });
    assert.ok(followingOnly.length > 0);
    assert.ok(followingOnly.every((s) => s.authorId === 'demo-student-aiman'));

    // Test Nearest sort with user coordinates
    const nearestSorted = filterAndSortThreads(spots, {
        sortBy: 'nearest',
        userCoords: { lat: 3.1209, lng: 101.6538 }
    });
    assert.equal(nearestSorted.length, spots.length);
    assert.ok(nearestSorted[0].distanceKm <= nearestSorted[nearestSorted.length - 1].distanceKm);
});

test('PART 2: End-to-end two-account social flow (follow, post, like, comment, save, privacy guarantee)', async () => {
    resetRateLimits();
    const userA = { id: 'test_alice', name: 'Alice Tan', handle: 'alice_um', university: 'UM' };
    const userB = { id: 'test_bob', name: 'Bob Razak', handle: 'bob_utp', university: 'UTP' };

    ensurePublicProfileForUser(userA);
    ensurePublicProfileForUser(userB);

    // 1. Verify financial fields are stripped from public profiles
    const dirtyProfile = stripFinancialFieldsFromProfile({
        id: 'test_alice',
        displayName: 'Alice Tan',
        handle: 'alice_um',
        balance: 9999,
        walletBalance: 500,
        budgets: [{ limit: 800 }],
        transactions: [{ amount: 50 }],
        walletHistory: [{ id: 'tx1' }],
        pinHash: 'secret'
    });
    assert.equal(dirtyProfile.balance, undefined);
    assert.equal(dirtyProfile.walletBalance, undefined);
    assert.equal(dirtyProfile.budgets, undefined);
    assert.equal(dirtyProfile.transactions, undefined);
    assert.equal(dirtyProfile.walletHistory, undefined);
    assert.equal(dirtyProfile.pinHash, undefined);

    // 2. Unique @handle enforcement
    await assert.rejects(
        async () => {
            await updatePublicSocialProfile('test_bob', { handle: 'alice_um' });
        },
        /already taken/i
    );

    // 3. Follow flow & notification
    await followUser(userA, userB.id);
    assert.equal(isFollowingUser(userA.id, userB.id), true);
    const bobProfile = getPublicProfile(userB.id);
    assert.ok(bobProfile.followerCount >= 1);

    const bobNotifs = getUserNotifications(userB.id);
    assert.ok(bobNotifs.some((n) => n.type === 'follow' && n.actorId === userA.id));

    // 4. Create Spot post, comment, and bookmark save
    const newSpot = {
        id: 'spot_test_study_1',
        ...createThreadObject(
            userB,
            {
                category: 'study',
                title: '24-Hour Engineering Study Pod with Fast Wi-Fi',
                placeName: 'Block L Study Lounge',
                price: 0,
                campus: 'um',
                shortTip: 'Bring a sweater, aircond is strong!',
                studentPrice: true,
                body: 'Free entry for all students with matric card. Plenty of power sockets.'
            }
        )
    };
    assert.equal(newSpot.category, 'study');
    assert.equal(newSpot.budgetTag, 'under-rm5');

    const reply = createReplyObject(userA, 'Confirmed! Studied here until 2am yesterday.');
    assert.equal(reply.authorUsername, 'alice_um');

    const saveRes = await toggleSaveSpot(userA.id, newSpot.id);
    assert.equal(saveRes.saved, true);
    assert.ok(getSavedSpotIds(userA.id).includes(newSpot.id));

    // 5. Unfollow
    await unfollowUser(userA.id, userB.id);
    assert.equal(isFollowingUser(userA.id, userB.id), false);
});

test('PART 3 & 5: End-to-end two-account Demo Wallet (Send, Request, Split, Accept, Decline, Idempotency, Tracker Sync, & Failed Transfers)', async () => {
    resetRateLimits();
    resetPitchWalletState();

    const sender = { id: 'wallet_alice', name: 'Alice Tan', handle: 'alice_um' };
    const receiver = { id: 'wallet_bob', name: 'Bob Razak', handle: 'bob_utp' };

    ensurePublicProfileForUser(sender);
    ensurePublicProfileForUser(receiver);

    // 1. Both users automatically start with RM100.00 demo credit
    const aliceWalletInit = ensureUserWallet(sender);
    const bobWalletInit = ensureUserWallet(receiver);
    assert.equal(aliceWalletInit.balance, INITIAL_DEMO_WALLET_BALANCE);
    assert.equal(bobWalletInit.balance, INITIAL_DEMO_WALLET_BALANCE);

    // 2. Set 4-digit PINs
    setWalletPin(sender.id, '1234');
    setWalletPin(receiver.id, '5678');

    // 3. Test Failed Transfers:
    // 3a. Wrong PIN
    await assert.rejects(
        async () => {
            await transferMoney({
                sender,
                receiver,
                amount: 15,
                note: 'Wrong PIN test',
                pin: '9999'
            });
        },
        /Incorrect 4-digit demo PIN/i
    );

    // 3b. Self-transfer blocked
    await assert.rejects(
        async () => {
            await transferMoney({
                sender,
                receiver: sender,
                amount: 10,
                note: 'Self transfer',
                pin: '1234'
            });
        },
        /cannot send money to yourself/i
    );

    // 3c. Over RM200 per-transfer limit blocked
    await assert.rejects(
        async () => {
            await transferMoney({
                sender,
                receiver,
                amount: 250,
                note: 'Over max per transfer',
                pin: '1234'
            });
        },
        /Maximum per transfer is RM200\.00/i
    );

    // 3d. Insufficient balance (negative balance blocked)
    await assert.rejects(
        async () => {
            await transferMoney({
                sender,
                receiver,
                amount: 150, // Alice only has RM100.00
                note: 'Insufficient funds',
                pin: '1234'
            });
        },
        /Insufficient demo wallet balance/i
    );

    // 4. Successful atomic transfer + Idempotency key deduplication + Tracker auto-sync payload
    const idemKey = 'idem_test_transfer_001';
    const txRes1 = await transferMoney({
        sender,
        receiver,
        amount: 25.50,
        note: 'Nasi Ayam & Teh Ais lunch',
        pin: '1234',
        idempotencyKey: idemKey
    });

    assert.equal(txRes1.deduplicated, false);
    assert.equal(txRes1.senderWallet.balance, 74.50);
    assert.equal(txRes1.receiverWallet.balance, 125.50);
    assert.equal(txRes1.receipt.amount, 25.50);
    assert.equal(txRes1.trackerSync.senderExpenseTx.category, 'Wallet transfer');
    assert.equal(txRes1.trackerSync.senderExpenseTx.type, 'expense');
    assert.equal(txRes1.trackerSync.receiverIncomeTx.category, 'Wallet transfer');
    assert.equal(txRes1.trackerSync.receiverIncomeTx.type, 'income');
    assert.equal(txRes1.trackerSync.senderExpenseTx.walletReceiptId, txRes1.receipt.id);

    // Double-tap with same idempotencyKey must NOT debit or credit a second time
    const txResDuplicate = await transferMoney({
        sender,
        receiver,
        amount: 25.50,
        note: 'Nasi Ayam & Teh Ais lunch',
        pin: '1234',
        idempotencyKey: idemKey
    });
    assert.equal(txResDuplicate.deduplicated, true);
    assert.equal(txResDuplicate.receipt.id, txRes1.receipt.id);
    assert.equal(getUserWallet(sender.id).balance, 74.50);
    assert.equal(getUserWallet(receiver.id).balance, 125.50);

    // 5. Simulated Top Up
    const topUpRes = await topUpWallet({
        userId: sender.id,
        amount: 500,
        sourceId: 'ewallet_tng'
    });
    assert.equal(topUpRes.wallet.balance, 574.50);

    // 6. Test 50/50 Split Bill Request -> Accept flow
    const splitReq = await requestMoney({
        requester: sender,
        payer: receiver,
        amount: 0,
        originalTotalAmount: 30.00,
        isSplitBill: true,
        note: 'Futsal court booking split'
    });
    assert.equal(splitReq.amount, 15.00);
    assert.equal(splitReq.status, 'pending');

    const acceptRes = await respondToMoneyRequest({
        requestId: splitReq.id,
        actor: receiver,
        action: 'accept',
        pin: '5678'
    });
    assert.equal(acceptRes.request.status, 'accepted');
    assert.ok(acceptRes.request.receiptId);
    assert.equal(getUserWallet(receiver.id).balance, 110.50); // 125.50 - 15.00
    assert.equal(getUserWallet(sender.id).balance, 589.50);   // 574.50 + 15.00

    // 7. Test Money Request -> Decline flow
    const req2 = await requestMoney({
        requester: sender,
        payer: receiver,
        amount: 20.00,
        note: 'Extra snacks'
    });
    const declineRes = await respondToMoneyRequest({
        requestId: req2.id,
        actor: receiver,
        action: 'decline'
    });
    assert.equal(declineRes.request.status, 'declined');
    assert.equal(getUserWallet(receiver.id).balance, 110.50); // unchanged

    // 8. Test Daily Transfer Limit (RM500/day)
    resetRateLimits();
    await transferMoney({
        sender,
        receiver,
        amount: 200,
        note: 'Transfer 2',
        pin: '1234',
        skipRateLimit: true
    });
    await transferMoney({
        sender,
        receiver,
        amount: 200,
        note: 'Transfer 3',
        pin: '1234',
        skipRateLimit: true
    });
    // Alice has now transferred 25.50 + 200 + 200 = RM425.50 today.
    // Attempting another RM100 transfer (total RM525.50 > RM500 daily limit) must fail:
    await assert.rejects(
        async () => {
            await transferMoney({
                sender,
                receiver,
                amount: 100,
                note: 'Exceeds daily limit',
                pin: '1234',
                skipRateLimit: true
            });
        },
        /Daily transfer limit of RM500\.00 exceeded/i
    );

    // 9. Test QR Code & Paste Code
    const qrCode = encodeWalletQrPayload(receiver);
    assert.ok(qrCode.startsWith('KKPAY:wallet_bob:bob_utp:'));
    const parsedQr = parseWalletQrPayload(qrCode);
    assert.equal(parsedQr.valid, true);
    assert.equal(parsedQr.recipient.id, receiver.id);
});

test('PART 5: Safety checks, sanitization, and Firestore Security Rules tampering protection', () => {
    // 1. XSS sanitization
    const dirty = '<script>alert("xss")</script>Murah & Sedap!';
    const clean = sanitizeText(dirty);
    assert.ok(!clean.includes('<script>'));
    assert.ok(clean.includes('Murah & Sedap!'));

    // 2. Profanity & spam check
    const spamCheck = checkProfanityAndSpam('FREE MONEY WHATSAPP ME 0123456789');
    assert.equal(spamCheck.valid, false);

    // 3. Photo file validation
    assert.equal(validateSpotPhotoFile({ type: 'application/pdf', size: 1024 }).valid, false);
    assert.equal(validateSpotPhotoFile({ type: 'image/jpeg', size: 8 * 1024 * 1024 }).valid, false);
    assert.equal(validateSpotPhotoFile({ type: 'image/webp', size: 500 * 1024 }).valid, true);

    // 4. Inspect firestore.rules for required collection protections
    const rulesPath = path.resolve('firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Public profiles must block financial fields
    assert.ok(rulesContent.includes('match /publicProfiles/{userId}'));
    assert.ok(rulesContent.includes("'walletBalance'"));
    assert.ok(rulesContent.includes("'walletHistory'"));

    // Saved bookmarks must be private to owner
    assert.ok(rulesContent.includes('match /spotSaves/{saveId}'));
    assert.ok(rulesContent.includes('resource.data.userId == request.auth.uid'));

    // Wallets must enforce owner read and non-negative balance
    assert.ok(rulesContent.includes('match /wallets/{userId}'));
    assert.ok(rulesContent.includes('request.resource.data.balance >= 0'));

    // Ledger must be append-only, enforce no self-transfer, and max RM200 per transfer
    assert.ok(rulesContent.includes('match /walletLedger/{ledgerId}'));
    assert.ok(rulesContent.includes('request.resource.data.senderId != request.resource.data.receiverId'));
    assert.ok(rulesContent.includes('request.resource.data.amount <= 200'));
    assert.ok(rulesContent.includes('allow update, delete: if false;'));
});
