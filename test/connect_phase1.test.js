import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    CONNECT_SECTION_NAME,
    CONNECT_ROUTES,
    PROFILE_ACHIEVEMENTS
} from '../src/config/appConstants.js';

import {
    validateUsernameFormat,
    isLooksLikeUidOrHash,
    resetRateLimits
} from '../src/utils/safetyUtils.js';

import {
    stripFinancialFieldsFromProfile,
    ensurePublicProfileForUser,
    updatePublicSocialProfile,
    changeUsername,
    updateProfilePrivacySettings,
    isHandleAvailable,
    getPublicProfile,
    getPublicProfileForViewer,
    searchPublicProfiles,
    getFriendSuggestions,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    areFriends,
    getFriendsList,
    getMutualFriends,
    getIncomingFriendRequests,
    getOutgoingFriendRequests,
    getFriendshipStatus,
    blockUser,
    unblockUser,
    isBlockedBetween,
    getUserNotifications
} from '../src/services/socialService.js';

import { validateConnectOperation } from '../functions/src/connect/connectFunction.js';

test('KampusKash Connect Phase 1 — Profile schema, case-insensitive username uniqueness & UID protection', async () => {
    resetRateLimits();

    // 1. Verify Firebase UIDs or hex hashes are detected and rejected as usernames
    const fakeFirebaseUid = 'k9XzP3mQ7vR2wL8nJ4bF1cT6yH5d';
    assert.equal(isLooksLikeUidOrHash(fakeFirebaseUid), true);
    const uidAsHandleCheck = validateUsernameFormat(fakeFirebaseUid, fakeFirebaseUid);
    assert.equal(uidAsHandleCheck.valid, false);

    // Ensure profile initialization never exposes UID as handle even if user.handle was set to UID
    const rawUserWithUidName = {
        id: fakeFirebaseUid,
        name: fakeFirebaseUid,
        handle: fakeFirebaseUid,
        email: 'danish.hakim@um.edu.my',
        university: 'Universiti Malaya (UM)',
        course: 'Bachelor of Computer Science (Hons)',
        achievements: ['smart_saver', 'early_adopter'],
        balance: 4500.00,
        walletBalance: 100.00,
        monthlyBudget: 800,
        transactions: [{ id: 'tx_1', amount: 25 }]
    };

    const cleanProfile = ensurePublicProfileForUser(rawUserWithUidName);
    assert.notEqual(cleanProfile.handle, fakeFirebaseUid.toLowerCase());
    assert.notEqual(cleanProfile.displayName, fakeFirebaseUid);
    assert.equal(cleanProfile.course, 'Bachelor of Computer Science (Hons)');
    assert.ok(cleanProfile.joinedAt);
    assert.equal(typeof cleanProfile.friendsCount, 'number');
    assert.deepEqual(cleanProfile.achievements, ['smart_saver', 'early_adopter']);

    // 2. Verify private financial fields and email are strictly stripped
    assert.equal(cleanProfile.email, undefined);
    assert.equal(cleanProfile.balance, undefined);
    assert.equal(cleanProfile.walletBalance, undefined);
    assert.equal(cleanProfile.monthlyBudget, undefined);
    assert.equal(cleanProfile.transactions, undefined);

    // 3. Case-insensitive username uniqueness & username change validation
    const userA = {
        id: 'connect_user_a',
        name: 'Farah Nadia',
        handle: 'farah_nadia',
        email: 'farah@um.edu.my',
        university: 'Universiti Malaya (UM)',
        course: 'BSc Data Science'
    };
    const userB = {
        id: 'connect_user_b',
        name: 'Haziq Imran',
        handle: 'haziq_imran',
        email: 'haziq@utp.edu.my',
        university: 'Universiti Teknologi PETRONAS (UTP)',
        course: 'BEng Software Engineering'
    };

    ensurePublicProfileForUser(userA);
    ensurePublicProfileForUser(userB);

    // Case-insensitive collision check: 'FARAH_NADIA' must be unavailable to User B
    assert.equal(isHandleAvailable('FARAH_NADIA', userB.id), false);
    assert.equal(isHandleAvailable('Farah_Nadia', userB.id), false);
    assert.equal(isHandleAvailable('FARAH_NADIA', userA.id), true);

    await assert.rejects(
        async () => {
            await changeUsername(userB.id, 'Farah_Nadia');
        },
        /already taken/i
    );

    // User A can change their username to a new valid handle, releasing the old one
    const updatedA = await changeUsername(userA.id, 'farah_ds_um');
    assert.equal(updatedA.handle, 'farah_ds_um');
    assert.equal(isHandleAvailable('farah_nadia', userB.id), true);

    // Restore User A handle to farah_nadia
    await changeUsername(userA.id, 'farah_nadia');
    assert.equal(getPublicProfile(userA.id).handle, 'farah_nadia');
});

test('KampusKash Connect Phase 1 — Scenarios 1 to 7: Discovery, Send Request, Receive, Accept, Mutual Friends, Duplicate Rejection & Remove Friend', async () => {
    resetRateLimits();

    const userA = {
        id: 'acct_test_user_a',
        name: 'Nurul Izzah',
        handle: 'izzah_um',
        email: 'izzah.private@um.edu.my',
        university: 'Universiti Malaya (UM)',
        course: 'Bachelor of Accounting',
        balance: 3200,
        budgets: [{ id: 'b1', amount: 600 }]
    };

    const userB = {
        id: 'acct_test_user_b',
        name: 'Syafiq Azman',
        handle: 'syafiq_um',
        email: 'syafiq.private@um.edu.my',
        university: 'Universiti Malaya (UM)',
        course: 'Bachelor of Finance',
        balance: 1850,
        transactions: [{ id: 't1', amount: 15 }]
    };

    const userC = {
        id: 'acct_test_user_c',
        name: 'Kelvin Tan',
        handle: 'kelvin_um',
        email: 'kelvin.private@um.edu.my',
        university: 'Universiti Malaya (UM)',
        course: 'Bachelor of Computer Science'
    };

    ensurePublicProfileForUser(userA);
    ensurePublicProfileForUser(userB);
    ensurePublicProfileForUser(userC);

    // Clean any pre-existing relationship between A, B, C
    await removeFriend(userA.id, userB.id);
    await removeFriend(userA.id, userC.id);
    await removeFriend(userB.id, userC.id);

    // SCENARIO 1: User A can search and discover User B (by username and by display name)
    const searchByHandle = searchPublicProfiles('@syafiq_um', {
        viewerId: userA.id,
        excludeUserId: userA.id,
        includePagination: true
    });
    assert.ok(searchByHandle.results.some((p) => p.id === userB.id));

    const searchByName = searchPublicProfiles('Syafiq Azman', {
        viewerId: userA.id,
        excludeUserId: userA.id
    });
    const foundB = searchByName.find((p) => p.id === userB.id);
    assert.ok(foundB, 'User A should find User B by display name');
    assert.equal(foundB.handle, 'syafiq_um');
    // Verify no email or financial data is exposed in search results
    assert.equal(foundB.email, undefined);
    assert.equal(foundB.balance, undefined);
    assert.equal(foundB.transactions, undefined);

    // Self-request must be rejected
    await assert.rejects(
        async () => {
            await sendFriendRequest(userA, userA.id);
        },
        /cannot send a friend request to yourself/i
    );

    // SCENARIO 2: User A sends a friend request to User B
    const reqAB = await sendFriendRequest(userA, userB.id, {
        note: 'Hi Syafiq! Let us connect on KampusKash.'
    });
    assert.equal(reqAB.senderId, userA.id);
    assert.equal(reqAB.receiverId, userB.id);
    assert.equal(reqAB.status, 'pending');

    // Outgoing requests for User A should include reqAB
    const outgoingA = getOutgoingFriendRequests(userA.id);
    assert.ok(outgoingA.some((r) => r.id === reqAB.id && r.receiverId === userB.id));
    assert.equal(getFriendshipStatus(userA.id, userB.id).status, 'outgoing_pending');

    // SCENARIO 3: User B receives the pending request & notification
    const incomingB = getIncomingFriendRequests(userB.id);
    assert.ok(incomingB.some((r) => r.id === reqAB.id && r.senderId === userA.id));
    assert.equal(getFriendshipStatus(userB.id, userA.id).status, 'incoming_pending');

    const notifsB = getUserNotifications(userB.id);
    assert.ok(notifsB.some((n) => n.type === 'friend_request' && n.actorId === userA.id));

    // SCENARIO 6 (Part A): Duplicate friend requests while pending are rejected
    await assert.rejects(
        async () => {
            await sendFriendRequest(userA, userB.id);
        },
        /already pending/i
    );
    await assert.rejects(
        async () => {
            await sendFriendRequest(userB, userA.id);
        },
        /already sent you a friend request/i
    );

    // Non-recipient (User A) cannot accept their own outgoing request
    await assert.rejects(
        async () => {
            await acceptFriendRequest(userA.id, reqAB.id);
        },
        /only the recipient can accept/i
    );

    // SCENARIO 4: User B accepts the request
    const acceptRes = await acceptFriendRequest(userB.id, reqAB.id);
    assert.equal(acceptRes.accepted, true);
    assert.ok(acceptRes.friendship.conversationId.startsWith('conv_'));

    // SCENARIO 6 (Part B): Accepting an already-processed request is rejected, and requests to existing friends are rejected
    await assert.rejects(
        async () => {
            await acceptFriendRequest(userB.id, reqAB.id);
        },
        /already been accepted/i
    );
    await assert.rejects(
        async () => {
            await sendFriendRequest(userA, userB.id);
        },
        /already friends/i
    );

    // SCENARIO 5: Both users appear in each other's friends list & counts update
    assert.equal(areFriends(userA.id, userB.id), true);
    assert.equal(areFriends(userB.id, userA.id), true);
    assert.equal(getFriendshipStatus(userA.id, userB.id).status, 'friends');
    assert.equal(getFriendshipStatus(userB.id, userA.id).status, 'friends');

    const friendsOfA = getFriendsList(userA.id);
    const friendsOfB = getFriendsList(userB.id);
    assert.ok(friendsOfA.some((f) => f.id === userB.id));
    assert.ok(friendsOfB.some((f) => f.id === userA.id));
    assert.ok(getPublicProfile(userA.id).friendsCount >= 1);
    assert.ok(getPublicProfile(userB.id).friendsCount >= 1);

    // Connect User C with both User A and User B to verify Mutual Friends calculation
    const reqCA = await sendFriendRequest(userC, userA.id);
    await acceptFriendRequest(userA.id, reqCA.id);
    const reqCB = await sendFriendRequest(userC, userB.id);
    await acceptFriendRequest(userB.id, reqCB.id);

    const mutualsAB = getMutualFriends(userA.id, userB.id);
    assert.ok(mutualsAB.some((m) => m.id === userC.id), 'User C should appear as a mutual friend of User A and User B');

    // SCENARIO 7: Removing a friend updates both users
    const removeRes = await removeFriend(userA.id, userB.id);
    assert.equal(removeRes.removed, true);
    assert.equal(areFriends(userA.id, userB.id), false);
    assert.equal(areFriends(userB.id, userA.id), false);
    assert.ok(!getFriendsList(userA.id).some((f) => f.id === userB.id));
    assert.ok(!getFriendsList(userB.id).some((f) => f.id === userA.id));

    // Also test cancel outgoing request & reject incoming request lifecycle
    const req2 = await sendFriendRequest(userA, userB.id);
    const cancelRes = await cancelFriendRequest(userA.id, req2.id);
    assert.equal(cancelRes.cancelled, true);
    assert.equal(getOutgoingFriendRequests(userA.id).some((r) => r.id === req2.id), false);

    const req3 = await sendFriendRequest(userA, userB.id);
    const rejectRes = await rejectFriendRequest(userB.id, req3.id);
    assert.equal(rejectRes.rejected, true);
    assert.equal(getIncomingFriendRequests(userB.id).some((r) => r.id === req3.id), false);
});

test('KampusKash Connect Phase 1 — Scenario 8 & 9: Blocking prevents interaction & Privacy settings work', async () => {
    resetRateLimits();

    const userX = {
        id: 'privacy_user_x',
        name: 'Nadia Karim',
        handle: 'nadia_ukm',
        university: 'UKM',
        course: 'Law',
        bio: 'Private bio for friends only'
    };
    const userY = {
        id: 'privacy_user_y',
        name: 'Zul Ariffin',
        handle: 'zul_ukm',
        university: 'UKM',
        course: 'Engineering'
    };

    ensurePublicProfileForUser(userX);
    ensurePublicProfileForUser(userY);
    await unblockUser(userX.id, userY.id);
    await unblockUser(userY.id, userX.id);

    // First make X and Y friends
    const req = await sendFriendRequest(userX, userY.id);
    await acceptFriendRequest(userY.id, req.id);
    assert.equal(areFriends(userX.id, userY.id), true);

    // SCENARIO 8: User X blocks User Y -> friendship is immediately removed and neither can send requests or discover each other
    await blockUser(userX.id, userY.id);
    assert.equal(isBlockedBetween(userX.id, userY.id), true);
    assert.equal(areFriends(userX.id, userY.id), false);
    assert.ok(!getFriendsList(userX.id).some((f) => f.id === userY.id));
    assert.ok(!getFriendsList(userY.id).some((f) => f.id === userX.id));

    // Blocked user Y cannot send a friend request to X
    await assert.rejects(
        async () => {
            await sendFriendRequest(userY, userX.id);
        },
        /cannot send a friend request/i
    );

    // Blocked user Y cannot discover X in search
    const searchY = searchPublicProfiles('nadia_ukm', { viewerId: userY.id });
    assert.ok(!searchY.some((p) => p.id === userX.id));

    // Viewing profile while blocked returns restricted blocked view
    const blockedView = getPublicProfileForViewer(userX.id, userY.id);
    assert.equal(blockedView.isBlockedView, true);

    // Unblock restores normal non-friend state
    await unblockUser(userX.id, userY.id);
    assert.equal(isBlockedBetween(userX.id, userY.id), false);

    // Test Privacy Settings: Friends-Only visibility, disallow discovery, disallow friend requests
    await updateProfilePrivacySettings(userX.id, {
        profileVisibility: 'friends',
        allowFriendRequests: false,
        allowDiscovery: false
    });

    // Non-friend Y viewing X gets restricted friends-only view (bio & course hidden)
    const restrictedView = getPublicProfileForViewer(userX.id, userY.id);
    assert.equal(restrictedView.isRestrictedView, true);
    assert.equal(restrictedView.bio, '');
    assert.equal(restrictedView.course, '');

    // Non-friend Y cannot discover X in search when allowDiscovery is false
    const searchWhenHidden = searchPublicProfiles('nadia_ukm', { viewerId: userY.id });
    assert.ok(!searchWhenHidden.some((p) => p.id === userX.id));

    // Non-friend Y cannot send friend request when allowFriendRequests is false
    await assert.rejects(
        async () => {
            await sendFriendRequest(userY, userX.id);
        },
        /restricted incoming friend requests/i
    );
});

test('KampusKash Connect Phase 1 — Scenario 10: Cloud Function validation, Firestore rules & UI routes', () => {
    // 1. Server-side Cloud Function validation checks
    const selfCheck = validateConnectOperation({
        actorUid: 'u1',
        action: 'send_request',
        payload: { receiverId: 'u1' }
    });
    assert.equal(selfCheck.valid, false);
    assert.equal(selfCheck.status, 400);

    const validSend = validateConnectOperation({
        actorUid: 'u1',
        action: 'send_request',
        payload: { receiverId: 'u2' }
    });
    assert.equal(validSend.valid, true);
    assert.equal(validSend.requestId, 'u1_u2');

    const acceptCheck = validateConnectOperation({
        actorUid: 'u2',
        action: 'accept_request',
        existingRequest: { id: 'u1_u2', senderId: 'u1', receiverId: 'u2', status: 'pending' }
    });
    assert.equal(acceptCheck.valid, true);
    assert.equal(acceptCheck.friendshipId, 'u1_u2');

    // 2. Constants & Firestore rules verification
    assert.equal(CONNECT_SECTION_NAME, 'Connect');
    assert.ok(CONNECT_ROUTES.includes('/connect'));
    assert.ok(PROFILE_ACHIEVEMENTS.length >= 5);

    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    assert.ok(rulesContent.includes('match /userHandles/{handle}'));
    assert.ok(rulesContent.includes('match /friendRequests/{requestId}'));
    assert.ok(rulesContent.includes('match /friendships/{friendshipId}'));
    assert.ok(rulesContent.includes("'email'"));
    assert.ok(rulesContent.includes("'monthlyBudget'"));
});

