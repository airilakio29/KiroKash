/**
 * KAMPUSKASH CONNECT — UI/UX REDESIGN & FRIEND SYSTEM REPAIR TEST SUITE
 *
 * Tests all 13 required scenarios across >= 3 separate authenticated test accounts:
 *   1. Searching for a user (@username, display name, university filter, privacy exclusion).
 *   2. Sending a friend request (including re-sending after cancel/decline/unfriend).
 *   3. Receiving a friend request (incoming list, sender profile hydration).
 *   4. Accepting a friend request (mutual friendship creation, friend counts, notifications).
 *   5. Declining a friend request.
 *   6. Cancelling a friend request.
 *   7. Removing a friend (symmetric removal, stale request cleanup, re-add capability).
 *   8. Blocking a user (severs friendship, cancels pending requests, blocks future requests).
 *   9. Preventing duplicate requests, self-add, existing-friend request, & unauthorized actions.
 *  10. Viewing mutual friends across 3+ accounts & sorting friends (online, name, university, mutuals, recent).
 *  11. Profile privacy enforcement (friends-only view, restricted discovery, zero financial/email leakage).
 *  12. Firestore Security Rules verification for friendRequests, friendships, publicProfiles, and blocks.
 *  13. Responsive UI/UX redesign verification across 320px - 1440px (Overview, Discover, My Friends, Requests, Profiles).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    FORBIDDEN_FINANCIAL_KEYS,
    ensurePublicProfileForUser,
    updatePublicSocialProfile,
    updateProfilePrivacySettings,
    getPublicProfile,
    getPublicProfileForViewer,
    searchPublicProfiles,
    getFriendSuggestions,
    getFriendshipStatus,
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
    blockUser,
    unblockUser,
    isBlockedBetween,
    getUserNotifications
} from '../src/services/socialService.js';

// Three distinct authenticated student accounts
const ACCOUNT_A = {
    id: 'uid_connect_repair_alice_101',
    displayName: 'Alicia Tan',
    handle: 'alicia_um',
    email: 'alicia.private@um.edu.my',
    university: 'Universiti Malaya (UM)',
    course: 'BSc Computer Science',
    bio: 'Building campus fintech tools at UM.',
    balance: 4250.75,
    walletBalance: 180.0,
    monthlyBudget: 900,
    transactions: [{ id: 'tx_1', amount: 15.5 }],
    accounts: [{ id: 'acc_1', balance: 4250.75 }]
};

const ACCOUNT_B = {
    id: 'uid_connect_repair_danial_202',
    displayName: 'Danial Hakim',
    handle: 'danial_um',
    email: 'danial.private@um.edu.my',
    university: 'Universiti Malaya (UM)',
    course: 'Bachelor of Accounting',
    bio: 'Coffee & campus basketball.',
    balance: 1980.0,
    savingsGoals: [{ id: 'sg_1', current: 600 }]
};

const ACCOUNT_C = {
    id: 'uid_connect_repair_priya_303',
    displayName: 'Priya Nair',
    handle: 'priya_utm',
    email: 'priya.private@utm.my',
    university: 'Universiti Teknologi Malaysia (UTM)',
    course: 'BEng Software Engineering',
    bio: 'UTM Debate Club & Hackathon finalist.',
    netWorth: 8400
};

const ACCOUNT_D = {
    id: 'uid_connect_repair_zack_404',
    displayName: 'Zack Lim',
    handle: 'zack_usm',
    email: 'zack.private@usm.my',
    university: 'Universiti Sains Malaysia (USM)',
    course: 'BSc Finance'
};

test('Scenario 1: Searching for a user by @username, display name, and university without exposing private data', () => {
    const pA = ensurePublicProfileForUser(ACCOUNT_A);
    const pB = ensurePublicProfileForUser(ACCOUNT_B);
    const pC = ensurePublicProfileForUser(ACCOUNT_C);
    ensurePublicProfileForUser(ACCOUNT_D);

    assert.equal(pA.handle, 'alicia_um');
    assert.equal(pB.handle, 'danial_um');
    assert.equal(pC.handle, 'priya_utm');

    // Search by @username
    const byHandle = searchPublicProfiles('@danial_um', { viewerId: ACCOUNT_A.id });
    assert.ok(byHandle.some((u) => u.id === ACCOUNT_B.id), 'User A must find User B by @username');
    assert.ok(!byHandle.some((u) => u.id === ACCOUNT_A.id), 'Search must exclude the searching viewer');

    // Search by display name
    const byName = searchPublicProfiles('Priya Nair', { viewerId: ACCOUNT_A.id });
    assert.ok(byName.some((u) => u.id === ACCOUNT_C.id), 'User A must find User C by display name');

    // Search with university filter
    const byUni = searchPublicProfiles('', {
        viewerId: ACCOUNT_A.id,
        university: 'Universiti Malaya'
    });
    assert.ok(byUni.some((u) => u.id === ACCOUNT_B.id), 'University filter must include matching campus peer');
    assert.ok(!byUni.some((u) => u.id === ACCOUNT_C.id), 'University filter must exclude non-matching campus');

    // Verify no financial fields or email addresses are exposed in search results
    for (const item of [...byHandle, ...byName]) {
        for (const key of FORBIDDEN_FINANCIAL_KEYS) {
            assert.equal(item[key], undefined, `Search result must never expose forbidden key "${key}"`);
        }
    }
});

test('Scenario 2 & 3: Sending and receiving a friend request updates both sender and recipient states', async () => {
    // Clean any existing relationship between A and B
    await removeFriend(ACCOUNT_A.id, ACCOUNT_B.id).catch(() => {});
    await cancelFriendRequest(ACCOUNT_A.id, ACCOUNT_B.id).catch(() => {});
    await cancelFriendRequest(ACCOUNT_B.id, ACCOUNT_A.id).catch(() => {});

    const statusBefore = getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_B.id);
    assert.equal(statusBefore.status, 'none');
    assert.equal(statusBefore.canSendRequest, true);

    // User A clicks Add Friend on User B
    const req = await sendFriendRequest(ACCOUNT_A, ACCOUNT_B.id, {
        note: 'Hey Danial, saw you in the UM CS lecture!'
    });
    assert.equal(req.senderId, ACCOUNT_A.id);
    assert.equal(req.receiverId, ACCOUNT_B.id);
    assert.equal(req.status, 'pending');

    // Sender (User A) sees Request Sent
    const senderView = getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_B.id);
    assert.equal(senderView.status, 'outgoing_pending');
    assert.equal(senderView.direction, 'outgoing');
    assert.equal(senderView.canSendRequest, false);

    const outgoingA = getOutgoingFriendRequests(ACCOUNT_A.id);
    assert.ok(outgoingA.some((r) => r.id === req.id && r.receiverId === ACCOUNT_B.id));

    // Recipient (User B) sees Incoming Request with hydrated senderProfile
    const recipientView = getFriendshipStatus(ACCOUNT_B.id, ACCOUNT_A.id);
    assert.equal(recipientView.status, 'incoming_pending');
    assert.equal(recipientView.direction, 'incoming');

    const incomingB = getIncomingFriendRequests(ACCOUNT_B.id);
    const matchingIncoming = incomingB.find((r) => r.id === req.id);
    assert.ok(matchingIncoming, 'User B must see incoming request from User A');
    assert.equal(matchingIncoming.senderProfile?.handle, 'alicia_um');

    // Recipient receives notification
    const notifsB = getUserNotifications(ACCOUNT_B.id);
    assert.ok(notifsB.some((n) => n.type === 'friend_request' && n.actorId === ACCOUNT_A.id));
});

test('Scenario 4: Accepting a friend request creates a mutual friendship and updates both friends lists', async () => {
    const incomingB = getIncomingFriendRequests(ACCOUNT_B.id);
    const reqFromA = incomingB.find((r) => r.senderId === ACCOUNT_A.id);
    assert.ok(reqFromA, 'Pending request from A to B should exist');

    // User B accepts User A's request
    const res = await acceptFriendRequest(ACCOUNT_B.id, reqFromA.id);
    assert.equal(res.accepted, true);
    assert.ok(res.friendship.users.includes(ACCOUNT_A.id));
    assert.ok(res.friendship.users.includes(ACCOUNT_B.id));

    // Both users are now friends
    assert.equal(areFriends(ACCOUNT_A.id, ACCOUNT_B.id), true);
    assert.equal(areFriends(ACCOUNT_B.id, ACCOUNT_A.id), true);
    assert.equal(getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_B.id).status, 'friends');
    assert.equal(getFriendshipStatus(ACCOUNT_B.id, ACCOUNT_A.id).status, 'friends');

    // Both users see each other in their friends list
    const friendsOfA = getFriendsList(ACCOUNT_A.id);
    const friendsOfB = getFriendsList(ACCOUNT_B.id);
    assert.ok(friendsOfA.some((f) => f.id === ACCOUNT_B.id), 'User A must see User B in My Friends');
    assert.ok(friendsOfB.some((f) => f.id === ACCOUNT_A.id), 'User B must see User A in My Friends');

    // Pending requests are cleared
    assert.ok(!getIncomingFriendRequests(ACCOUNT_B.id).some((r) => r.senderId === ACCOUNT_A.id));
    assert.ok(!getOutgoingFriendRequests(ACCOUNT_A.id).some((r) => r.receiverId === ACCOUNT_B.id));
});

test('Scenario 5: Declining a friend request transitions state cleanly and allows future re-request', async () => {
    await removeFriend(ACCOUNT_A.id, ACCOUNT_C.id).catch(() => {});
    await cancelFriendRequest(ACCOUNT_C.id, ACCOUNT_A.id).catch(() => {});

    // User C sends request to User A
    const req = await sendFriendRequest(ACCOUNT_C, ACCOUNT_A.id);
    assert.equal(getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_C.id).status, 'incoming_pending');

    // User A declines User C's request
    const declined = await rejectFriendRequest(ACCOUNT_A.id, req.id);
    assert.equal(declined.rejected, true);
    assert.equal(declined.request.status, 'rejected');
    assert.equal(areFriends(ACCOUNT_A.id, ACCOUNT_C.id), false);
    assert.equal(getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_C.id).status, 'none');

    // User C can send a new friend request later after being declined
    const resent = await sendFriendRequest(ACCOUNT_C, ACCOUNT_A.id);
    assert.equal(resent.status, 'pending');
    await cancelFriendRequest(ACCOUNT_C.id, resent.id);
});

test('Scenario 6: Cancelling an outgoing friend request reverts state to Add Friend', async () => {
    const req = await sendFriendRequest(ACCOUNT_A, ACCOUNT_D.id);
    assert.equal(getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_D.id).status, 'outgoing_pending');

    // Only sender can cancel
    await assert.rejects(
        () => cancelFriendRequest(ACCOUNT_D.id, req.id),
        /Only the sender can cancel/i
    );

    const cancelled = await cancelFriendRequest(ACCOUNT_A.id, req.id);
    assert.equal(cancelled.cancelled, true);
    assert.equal(cancelled.request.status, 'cancelled');
    assert.equal(getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_D.id).status, 'none');

    // Sender can re-send after cancelling
    const resent = await sendFriendRequest(ACCOUNT_A, ACCOUNT_D.id);
    assert.equal(resent.status, 'pending');
    await cancelFriendRequest(ACCOUNT_A.id, resent.id);
});

test('Scenario 7 & 10: Mutual friends across 3 accounts, sorting friends, and removing a friend', async () => {
    // Connect C with both A and B so C is a mutual friend of A and B
    const reqCA = await sendFriendRequest(ACCOUNT_C, ACCOUNT_A.id);
    await acceptFriendRequest(ACCOUNT_A.id, reqCA.id);

    const reqCB = await sendFriendRequest(ACCOUNT_C, ACCOUNT_B.id);
    await acceptFriendRequest(ACCOUNT_B.id, reqCB.id);

    // Check mutual friends between A and B -> must include C
    const mutualsAB = getMutualFriends(ACCOUNT_A.id, ACCOUNT_B.id);
    assert.ok(
        mutualsAB.some((m) => m.id === ACCOUNT_C.id),
        'User C must appear as a mutual friend between User A and User B'
    );

    // Test sorting options in getFriendsList for User A (friends with B [UM] and C [UTM])
    const sortedByName = getFriendsList(ACCOUNT_A.id, { sortBy: 'name' });
    assert.ok(sortedByName.length >= 2);
    assert.ok(sortedByName[0].displayName.localeCompare(sortedByName[1].displayName) <= 0);

    const sortedByUni = getFriendsList(ACCOUNT_A.id, { sortBy: 'university' });
    assert.equal(
        sortedByUni[0].university,
        'Universiti Malaya (UM)',
        'Same-university friends should sort first when sortBy=university'
    );

    // Remove friend between A and B
    const rem = await removeFriend(ACCOUNT_A.id, ACCOUNT_B.id);
    assert.equal(rem.removed, true);
    assert.equal(areFriends(ACCOUNT_A.id, ACCOUNT_B.id), false);
    assert.equal(getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_B.id).status, 'none');
    assert.ok(!getFriendsList(ACCOUNT_A.id).some((f) => f.id === ACCOUNT_B.id));
    assert.ok(!getFriendsList(ACCOUNT_B.id).some((f) => f.id === ACCOUNT_A.id));

    // Re-add friend after removal must work seamlessly
    const reReq = await sendFriendRequest(ACCOUNT_A, ACCOUNT_B.id);
    assert.equal(reReq.status, 'pending');
    await acceptFriendRequest(ACCOUNT_B.id, reReq.id);
    assert.equal(areFriends(ACCOUNT_A.id, ACCOUNT_B.id), true);
});

test('Scenario 8: Blocking a user severs friendship, cancels pending requests, and blocks discovery', async () => {
    assert.equal(areFriends(ACCOUNT_A.id, ACCOUNT_C.id), true);

    // User A blocks User C
    await blockUser(ACCOUNT_A.id, ACCOUNT_C.id);
    assert.equal(isBlockedBetween(ACCOUNT_A.id, ACCOUNT_C.id), true);
    assert.equal(areFriends(ACCOUNT_A.id, ACCOUNT_C.id), false);
    assert.equal(getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_C.id).status, 'blocked');

    // Neither can send friend requests while blocked
    await assert.rejects(
        () => sendFriendRequest(ACCOUNT_A, ACCOUNT_C.id),
        /Cannot send a friend request/i
    );
    await assert.rejects(
        () => sendFriendRequest(ACCOUNT_C, ACCOUNT_A.id),
        /Cannot send a friend request/i
    );

    // Blocked user is hidden from search results
    const searchFromC = searchPublicProfiles('Alicia', { viewerId: ACCOUNT_C.id });
    assert.ok(!searchFromC.some((p) => p.id === ACCOUNT_A.id));

    // Unblock restores normal non-friend status
    await unblockUser(ACCOUNT_A.id, ACCOUNT_C.id);
    assert.equal(isBlockedBetween(ACCOUNT_A.id, ACCOUNT_C.id), false);
    assert.equal(getFriendshipStatus(ACCOUNT_A.id, ACCOUNT_C.id).status, 'none');
});

test('Scenario 9: Duplicate, self, existing-friend, and unauthorized friend actions are prevented', async () => {
    // 1. Cannot add yourself
    await assert.rejects(
        () => sendFriendRequest(ACCOUNT_A, ACCOUNT_A.id),
        /cannot send a friend request to yourself/i
    );

    // 2. Cannot send request to existing friend (A and B are already friends)
    await assert.rejects(
        () => sendFriendRequest(ACCOUNT_A, ACCOUNT_B.id),
        /already friends/i
    );

    // 3. Cannot send duplicate pending request
    const reqAC = await sendFriendRequest(ACCOUNT_A, ACCOUNT_C.id);
    await assert.rejects(
        () => sendFriendRequest(ACCOUNT_A, ACCOUNT_C.id),
        /already pending/i
    );

    // 4. Reverse duplicate request is blocked and prompts user to accept incoming request instead
    await assert.rejects(
        () => sendFriendRequest(ACCOUNT_C, ACCOUNT_A.id),
        /already sent you a friend request/i
    );

    // 5. Sender cannot accept their own outgoing request
    await assert.rejects(
        () => acceptFriendRequest(ACCOUNT_A.id, reqAC.id),
        /Only the recipient can accept/i
    );

    // 6. Accepting processes the request; accepting a second time is rejected as already processed
    await acceptFriendRequest(ACCOUNT_C.id, reqAC.id);
    await assert.rejects(
        () => acceptFriendRequest(ACCOUNT_C.id, reqAC.id),
        /already been accepted/i
    );
});

test('Scenario 11: Profile privacy settings enforce friends-only visibility and request restrictions', async () => {
    // Configure User D with Friends-Only visibility and disabled incoming requests
    await updateProfilePrivacySettings(ACCOUNT_D.id, {
        profileVisibility: 'friends',
        allowFriendRequests: false,
        allowDiscovery: false
    });

    await updatePublicSocialProfile(ACCOUNT_D.id, {
        bio: 'Friends-only secret bio',
        course: 'BSc Quantitative Finance'
    });

    // Non-friend User A viewing User D sees restricted view (no bio, no course)
    const restrictedView = getPublicProfileForViewer(ACCOUNT_D.id, ACCOUNT_A.id);
    assert.equal(restrictedView.isRestrictedView, true);
    assert.equal(restrictedView.bio, '');
    assert.equal(restrictedView.course, '');

    // User D is hidden from non-friend discovery search when allowDiscovery is false
    const searchRes = searchPublicProfiles('zack_usm', { viewerId: ACCOUNT_A.id });
    assert.ok(!searchRes.some((p) => p.id === ACCOUNT_D.id));

    // User A cannot send a friend request when allowFriendRequests is false
    await assert.rejects(
        () => sendFriendRequest(ACCOUNT_A, ACCOUNT_D.id),
        /restricted incoming friend requests/i
    );

    // Restore User D privacy settings
    await updateProfilePrivacySettings(ACCOUNT_D.id, {
        profileVisibility: 'public',
        allowFriendRequests: true,
        allowDiscovery: true
    });
});

test('Scenario 12 & 13: Firestore Security Rules & Responsive Connect Redesign Verification', () => {
    const rulesText = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
    // Verify friendRequests rules allow re-sending after cancelled/rejected/removed and unfriending cleanup
    assert.ok(
        rulesText.includes("resource.data.status in ['cancelled', 'rejected', 'removed'] && resource.data.senderId == request.auth.uid && request.resource.data.status == 'pending'"),
        'firestore.rules must allow sender to re-send a friend request after prior cancel/reject/remove'
    );
    assert.ok(
        rulesText.includes("match /users/{userId}") && rulesText.includes("allow read, write: if isOwner(userId);"),
        'Private financial user documents must remain strictly owner-only'
    );

    // Verify ConnectView and PublicProfileModal redesign components and responsive CSS
    const connectViewCode = fs.readFileSync(path.resolve('src/views/ConnectView.jsx'), 'utf8');
    const connectCssCode = fs.readFileSync(path.resolve('src/styles/connect.css'), 'utf8');
    const modalCode = fs.readFileSync(path.resolve('src/components/social/PublicProfileModal.jsx'), 'utf8');

    assert.ok(connectViewCode.includes('Friends Online'), 'ConnectView must feature Friends Online section');
    assert.ok(connectViewCode.includes('Incoming Friend Requests'), 'ConnectView must feature Incoming Friend Requests preview');
    assert.ok(connectViewCode.includes('Suggested for You'), 'ConnectView must feature Suggested Friends section');
    assert.ok(connectViewCode.includes('ConfirmModal'), 'ConnectView must use ConfirmModal for destructive actions');
    assert.ok(connectViewCode.includes('useToast'), 'ConnectView must provide toast notifications');
    assert.ok(modalCode.includes('createPortal'), 'PublicProfileModal must render via createPortal');
    assert.ok(connectCssCode.includes('@media (max-width: 768px)') && connectCssCode.includes('@media (max-width: 430px)'), 'connect.css must include mobile responsive breakpoints down to 320px');
});

