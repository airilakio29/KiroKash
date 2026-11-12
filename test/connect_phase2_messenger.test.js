import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    ensurePublicProfileForUser,
    sendFriendRequest,
    acceptFriendRequest,
    blockUser,
    unblockUser,
    updateProfilePrivacySettings
} from '../src/services/socialService.js';
import {
    resetMessengerStateForTesting,
    getDirectConversationId,
    ensureDirectConversation,
    getConversationForParticipant,
    getUserConversations,
    getTotalUnreadMessageCount,
    sendMessage,
    getConversationMessages,
    subscribeToConversationMessages,
    markConversationRead,
    toggleMessageReaction,
    deleteMessage,
    validateChatImageFile,
    uploadConversationImage,
    getAttachmentForParticipant,
    prepareLocationSharePayload,
    requestBrowserLocationWithConsent,
    setUserPresence,
    getUserPresenceForViewer,
    setTypingIndicator,
    getActiveTypingUsers,
    getMessagingNotificationPrefs,
    updateMessagingNotificationPrefs,
    dispatchMessageNotification,
    createGroupConversationStructure
} from '../src/services/messengerService.js';
import { validateConnectOperation } from '../functions/src/connect/connectFunction.js';
import { resetRateLimits } from '../src/utils/safetyUtils.js';
import { ensureUserWallet, transferMoney, setWalletPin } from '../src/services/walletService.js';
import { MESSAGE_TYPES, TYPING_INDICATOR_EXPIRY_MS } from '../src/config/appConstants.js';

function setupThreeUsers() {
    resetMessengerStateForTesting();
    resetRateLimits();

    const userA = ensurePublicProfileForUser({
        id: 'msg_user_alice_01',
        name: 'Alice Tan',
        handle: 'alice_msg',
        university: 'Universiti Malaya (UM)',
        course: 'Computer Science',
        bio: 'Building campus apps'
    });

    const userB = ensurePublicProfileForUser({
        id: 'msg_user_bob_02',
        name: 'Bob Razak',
        handle: 'bob_msg',
        university: 'Universiti Malaya (UM)',
        course: 'Software Engineering',
        bio: 'Coffee & code'
    });

    const userC = ensurePublicProfileForUser({
        id: 'msg_user_charlie_03',
        name: 'Charlie Lim',
        handle: 'charlie_outsider',
        university: 'Universiti Teknologi PETRONAS (UTP)',
        course: 'Data Science',
        bio: 'Non-participant user'
    });

    return { userA, userB, userC };
}

async function makeMutualFriends(userA, userB) {
    try {
        unblockUser(userA.id, userB.id);
        unblockUser(userB.id, userA.id);
    } catch {
        // ignore
    }
    try {
        const req = await sendFriendRequest(
            { id: userA.id, name: userA.displayName, handle: userA.handle },
            userB.id
        );
        await acceptFriendRequest(userB.id, req.id);
    } catch {
        // already friends in shared store
    }
}

test('Scenario 1: Both users can start a conversation only if they are friends', async () => {
    const { userA, userB, userC } = setupThreeUsers();

    // User A and User C are NOT friends -> cannot start a conversation
    assert.throws(
        () => ensureDirectConversation(userA.id, userC.id),
        /You can only start a conversation with friends/i
    );

    // Connect User A and User B as mutual friends
    await makeMutualFriends(userA, userB);

    const convA = ensureDirectConversation(userA.id, userB.id);
    const convB = ensureDirectConversation(userB.id, userA.id);

    assert.equal(convA.id, convB.id);
    assert.equal(convA.id, getDirectConversationId(userA.id, userB.id));
    assert.deepEqual(convA.participants, [userA.id, userB.id].sort());
});

test('Scenario 2: Real-time text messaging, replies, reactions, and owner-only message deletion', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    const liveSnapshotsForB = [];
    const unsubscribeB = subscribeToConversationMessages(conv.id, userB.id, (pageData) => {
        liveSnapshotsForB.push(pageData.messages.map((m) => ({ id: m.id, text: m.text, reactions: m.reactions })));
    });

    // User A sends a text message
    const firstMsg = sendMessage({
        conversationId: conv.id,
        senderId: userA.id,
        authenticatedUid: userA.id,
        type: MESSAGE_TYPES.TEXT,
        text: 'Hey Bob! Want to study at the UM Central Library at 3pm?'
    });

    assert.equal(firstMsg.senderId, userA.id);
    assert.equal(firstMsg.status, 'delivered');
    assert.ok(liveSnapshotsForB.length >= 2, 'User B real-time listener should receive message immediately');
    assert.equal(
        liveSnapshotsForB[liveSnapshotsForB.length - 1][0].text,
        'Hey Bob! Want to study at the UM Central Library at 3pm?'
    );

    // User B replies to User A's specific message
    const replyMsg = sendMessage({
        conversationId: conv.id,
        senderId: userB.id,
        authenticatedUid: userB.id,
        type: MESSAGE_TYPES.TEXT,
        text: 'Sounds great! See you there.',
        replyTo: {
            messageId: firstMsg.id,
            senderId: userA.id,
            senderName: userA.displayName,
            previewText: firstMsg.text,
            type: firstMsg.type
        }
    });
    assert.equal(replyMsg.replyTo.messageId, firstMsg.id);

    // User B reacts with 🔥 emoji to User A's message
    const reacted = toggleMessageReaction({
        conversationId: conv.id,
        messageId: firstMsg.id,
        actorId: userB.id,
        emoji: '🔥'
    });
    assert.equal(reacted.reactions[userB.id], '🔥');

    // User B cannot delete User A's message
    assert.throws(
        () =>
            deleteMessage({
                conversationId: conv.id,
                messageId: firstMsg.id,
                actorId: userB.id
            }),
        /only delete your own messages/i
    );

    // User A can delete their own message
    const deleted = deleteMessage({
        conversationId: conv.id,
        messageId: firstMsg.id,
        actorId: userA.id
    });
    assert.equal(deleted.deleted, true);
    assert.equal(deleted.text, 'This message was deleted');

    unsubscribeB();
});

test('Scenario 3: Messages remain after refreshing and load using chronological pagination', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    // Send 12 messages in order
    for (let i = 1; i <= 12; i += 1) {
        sendMessage({
            conversationId: conv.id,
            senderId: i % 2 === 1 ? userA.id : userB.id,
            authenticatedUid: i % 2 === 1 ? userA.id : userB.id,
            type: MESSAGE_TYPES.TEXT,
            text: `Message #${i}`
        });
    }

    // Load recent page of 5 messages (simulating pagination rather than downloading all 12 at once)
    const recentPage = getConversationMessages(conv.id, userA.id, { limit: 5 });
    assert.equal(recentPage.messages.length, 5);
    assert.equal(recentPage.totalCount, 12);
    assert.equal(recentPage.hasMore, true);
    assert.deepEqual(
        recentPage.messages.map((m) => m.text),
        ['Message #8', 'Message #9', 'Message #10', 'Message #11', 'Message #12']
    );

    // Load older page before the oldest message of recentPage
    const olderPage = getConversationMessages(conv.id, userA.id, {
        limit: 5,
        beforeMessageId: recentPage.oldestMessageId
    });
    assert.equal(olderPage.messages.length, 5);
    assert.equal(olderPage.hasMore, true);
    assert.deepEqual(
        olderPage.messages.map((m) => m.text),
        ['Message #3', 'Message #4', 'Message #5', 'Message #6', 'Message #7']
    );
});

test('Scenario 4: Read receipts and unread counts update accurately', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    sendMessage({
        conversationId: conv.id,
        senderId: userA.id,
        authenticatedUid: userA.id,
        type: MESSAGE_TYPES.TEXT,
        text: 'Unread check 1'
    });
    const m2 = sendMessage({
        conversationId: conv.id,
        senderId: userA.id,
        authenticatedUid: userA.id,
        type: MESSAGE_TYPES.TEXT,
        text: 'Unread check 2'
    });

    assert.equal(getTotalUnreadMessageCount(userB.id), 2);
    assert.equal(m2.readBy.includes(userB.id), false);

    // User B opens and marks conversation read
    markConversationRead(conv.id, userB.id);
    assert.equal(getTotalUnreadMessageCount(userB.id), 0);

    const updatedPage = getConversationMessages(conv.id, userA.id, { limit: 10 });
    for (const msg of updatedPage.messages) {
        assert.equal(msg.status, 'read');
        assert.equal(msg.readBy.includes(userB.id), true);
        assert.ok(msg.readAt[userB.id]);
    }
});

test('Scenario 5: Typing indicators work and auto-expire after inactivity', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    const startMs = 1_700_000_000_000;
    setTypingIndicator(conv.id, userA.id, true, { nowMs: startMs, force: true });

    // Before expiry: User B sees User A typing
    const activeAt1s = getActiveTypingUsers(conv.id, userB.id, startMs + 1000);
    assert.equal(activeAt1s.length, 1);
    assert.equal(activeAt1s[0].userId, userA.id);

    // After TYPING_INDICATOR_EXPIRY_MS (4000ms): automatically expires
    const activeAfterExpiry = getActiveTypingUsers(
        conv.id,
        userB.id,
        startMs + TYPING_INDICATOR_EXPIRY_MS + 100
    );
    assert.equal(activeAfterExpiry.length, 0);
});

test('Scenario 6: Image uploads validate file type/size and forbid raw binary data in Firestore documents', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    // Reject unsupported file type
    const badTypeCheck = validateChatImageFile({
        name: 'malware.exe',
        type: 'application/x-msdownload',
        size: 1024
    });
    assert.equal(badTypeCheck.valid, false);

    // Reject oversized image (> 5MB)
    const oversizedCheck = validateChatImageFile({
        name: 'huge.png',
        type: 'image/png',
        size: 6 * 1024 * 1024
    });
    assert.equal(oversizedCheck.valid, false);

    // Upload valid image to Storage reference
    const uploaded = await uploadConversationImage({
        conversationId: conv.id,
        senderId: userA.id,
        file: {
            name: 'receipt_photo.jpg',
            type: 'image/jpeg',
            size: 180 * 1024
        },
        previewUrl: 'https://storage.kampuskash.local/preview/receipt_photo.jpg'
    });

    assert.ok(uploaded.storagePath.startsWith(`conversations/${conv.id}/attachments/`));

    // Reject storing raw binary inside Firestore message document
    assert.throws(
        () =>
            sendMessage({
                conversationId: conv.id,
                senderId: userA.id,
                authenticatedUid: userA.id,
                type: MESSAGE_TYPES.IMAGE,
                attachment: {
                    ...uploaded,
                    rawBytes: new Uint8Array([1, 2, 3])
                }
            }),
        /Binary field "rawBytes" is forbidden/i
    );

    // Send clean image message referencing Storage path
    const imgMsg = sendMessage({
        conversationId: conv.id,
        senderId: userA.id,
        authenticatedUid: userA.id,
        type: MESSAGE_TYPES.IMAGE,
        text: 'Lunch receipt at Kolej 12',
        attachment: uploaded
    });
    assert.equal(imgMsg.type, MESSAGE_TYPES.IMAGE);
    assert.equal(imgMsg.attachment.storagePath, uploaded.storagePath);
});

test('Scenario 7: Location sharing requires explicit user consent and builds map links', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    // Cannot prepare location without explicit consentGranted: true
    assert.throws(
        () =>
            prepareLocationSharePayload({
                lat: 3.1209,
                lng: 101.6538,
                label: 'UM Library',
                consentGranted: false
            }),
        /Explicit user location consent is required/i
    );

    // Cannot request browser geolocation unless userInitiated: true
    await assert.rejects(
        () => requestBrowserLocationWithConsent({ userInitiated: false }),
        /explicitly initiated by the user/i
    );

    // With explicit user consent, location message succeeds and generates map URLs
    const locPayload = await requestBrowserLocationWithConsent({
        userInitiated: true,
        label: 'UM Central Library',
        geolocationImpl: {
            getCurrentPosition: (success) =>
                success({ coords: { latitude: 3.1209, longitude: 101.6538, accuracy: 12 } })
        }
    });

    const locMsg = sendMessage({
        conversationId: conv.id,
        senderId: userA.id,
        authenticatedUid: userA.id,
        type: MESSAGE_TYPES.LOCATION,
        text: 'Meet here!',
        location: locPayload
    });

    assert.equal(locMsg.type, MESSAGE_TYPES.LOCATION);
    assert.equal(locMsg.location.consentGranted, true);
    assert.ok(locMsg.location.googleMapsUrl.includes('3.1209,101.6538'));
    assert.ok(locMsg.location.appleMapsUrl.includes('3.1209,101.6538'));
});

test('Scenario 8: Notifications deduplicate by messageId and protect lock-screen privacy', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    // Default notification prefs: showPreviewText is false for lock-screen privacy
    const defaultPrefs = getMessagingNotificationPrefs(userB.id);
    assert.equal(defaultPrefs.showPreviewText, false);

    const msg = sendMessage({
        conversationId: conv.id,
        senderId: userA.id,
        authenticatedUid: userA.id,
        type: MESSAGE_TYPES.TEXT,
        text: 'Private study group passcode 9941'
    });

    // Duplicate dispatch for the same messageId must be suppressed
    const duplicateAttempt = dispatchMessageNotification({
        message: msg,
        conversation: conv,
        recipientId: userB.id
    });
    assert.equal(duplicateAttempt.dispatched, false);
    assert.equal(duplicateAttempt.reason, 'duplicate');
    assert.equal(
        duplicateAttempt.notification.lockScreenBody.includes('9941'),
        false,
        'Lock-screen notification body must NOT expose private message text by default'
    );

    // When user explicitly enables showPreviewText, preview is included
    updateMessagingNotificationPrefs(userB.id, { showPreviewText: true });
    const msg2 = sendMessage({
        conversationId: conv.id,
        senderId: userA.id,
        authenticatedUid: userA.id,
        type: MESSAGE_TYPES.TEXT,
        text: 'See you at 5pm!'
    });
    const dupCheck2 = dispatchMessageNotification({
        message: msg2,
        conversation: conv,
        recipientId: userB.id
    });
    assert.equal(dupCheck2.notification.previewExposedOnLockScreen, true);
    assert.ok(dupCheck2.notification.lockScreenBody.includes('See you at 5pm!'));
});

test('Scenario 9: Non-participants cannot access conversations, messages, or attachments', async () => {
    const { userA, userB, userC } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    const uploaded = await uploadConversationImage({
        conversationId: conv.id,
        senderId: userA.id,
        file: { name: 'notes.png', type: 'image/png', size: 20480 }
    });

    sendMessage({
        conversationId: conv.id,
        senderId: userA.id,
        authenticatedUid: userA.id,
        type: MESSAGE_TYPES.IMAGE,
        attachment: uploaded
    });

    // Outsider User C cannot read conversation, messages, subscribe, or read attachment
    assert.throws(
        () => getConversationForParticipant(conv.id, userC.id),
        /Access denied: You are not a participant/i
    );
    assert.throws(
        () => getConversationMessages(conv.id, userC.id),
        /Access denied: You are not a participant/i
    );
    assert.throws(
        () =>
            sendMessage({
                conversationId: conv.id,
                senderId: userC.id,
                authenticatedUid: userC.id,
                type: MESSAGE_TYPES.TEXT,
                text: 'Intruder message'
            }),
        /Access denied: You are not a participant/i
    );
    assert.throws(
        () => getAttachmentForParticipant(conv.id, uploaded.storagePath, userC.id),
        /Access denied: You are not a participant/i
    );

    // Server-side Cloud Function validator also blocks non-participant attachment access & sender spoofing
    const serverSpoofCheck = validateConnectOperation({
        actorUid: userA.id,
        action: 'send_message',
        payload: {
            conversationId: conv.id,
            senderId: userB.id, // attempting to spoof User B
            participants: [userA.id, userB.id]
        },
        areAlreadyFriends: true
    });
    assert.equal(serverSpoofCheck.valid, false);
    assert.equal(serverSpoofCheck.status, 403);

    const serverAttachmentCheck = validateConnectOperation({
        actorUid: userC.id,
        action: 'access_attachment',
        payload: {
            conversationId: conv.id,
            storagePath: uploaded.storagePath,
            participants: [userA.id, userB.id]
        }
    });
    assert.equal(serverAttachmentCheck.valid, false);
    assert.equal(serverAttachmentCheck.status, 403);
});

test('Scenario 10: Blocked users cannot continue messaging', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    // User B blocks User A
    blockUser(userB.id, userA.id);

    assert.throws(
        () =>
            sendMessage({
                conversationId: conv.id,
                senderId: userA.id,
                authenticatedUid: userA.id,
                type: MESSAGE_TYPES.TEXT,
                text: 'Are you still there?'
            }),
        /blocked/i
    );

    assert.throws(
        () =>
            sendMessage({
                conversationId: conv.id,
                senderId: userB.id,
                authenticatedUid: userB.id,
                type: MESSAGE_TYPES.TEXT,
                text: 'Messaging while blocked'
            }),
        /blocked/i
    );

    unblockUser(userB.id, userA.id);
});

test('Scenario 11: Online presence respects privacy settings and background tabs do not force offline', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);

    setUserPresence(userA.id, 'online');
    // App goes to background tab -> should remain online
    setUserPresence(userA.id, 'offline', { isBackgroundTab: true });
    const presenceWhileBackgrounded = getUserPresenceForViewer(userA.id, userB.id);
    assert.equal(presenceWhileBackgrounded.state, 'online');

    // User A disables online status and last seen in privacy settings
    updateProfilePrivacySettings(userA.id, {
        showOnlineStatus: false,
        showLastSeen: false
    });
    const hiddenPresence = getUserPresenceForViewer(userA.id, userB.id);
    assert.equal(hiddenPresence.state, 'offline');
    assert.equal(hiddenPresence.lastSeen, null);
    assert.equal(hiddenPresence.hiddenByPrivacy, true);
});

test('Scenario 12: Phase 3 payment schema compatibility & existing finance wallet features still work', async () => {
    const { userA, userB } = setupThreeUsers();
    await makeMutualFriends(userA, userB);
    const conv = ensureDirectConversation(userA.id, userB.id);

    // Executing an actual in-chat payment is blocked in Phase 2 (reserved for Phase 3)
    assert.throws(
        () =>
            sendMessage({
                conversationId: conv.id,
                senderId: userA.id,
                authenticatedUid: userA.id,
                type: MESSAGE_TYPES.PAYMENT,
                paymentMetadata: { amountRM: 15 }
            }),
        /reserved for KampusKash Connect Phase 3/i
    );

    // Future group conversation schema helper works cleanly
    const groupStruct = createGroupConversationStructure({
        creatorId: userA.id,
        participantIds: [userB.id],
        title: 'UM Final Year Project Group'
    });
    assert.equal(groupStruct.type, 'group');
    assert.equal(groupStruct.participants.length, 2);

    // Existing KampusKash Demo Wallet financial transfer still works
    ensureUserWallet({ id: userA.id, name: userA.displayName, handle: userA.handle });
    ensureUserWallet({ id: userB.id, name: userB.displayName, handle: userB.handle });
    await setWalletPin(userA.id, '1234');

    const tx = await transferMoney({
        sender: userA.id,
        receiver: userB.id,
        amount: 10,
        note: 'Nasi lemak lunch',
        pin: '1234',
        idempotencyKey: `idem_phase2_${Date.now()}`
    });
    assert.equal(tx.receipt.amount, 10);
    assert.equal(tx.senderWallet.balance, 90);

    // Verify MessagesView mobile keyboard handling (visualViewport + 100dvh + safe-area) & Storage/Firestore rules
    const messagesViewSource = fs.readFileSync(path.resolve('src/views/MessagesView.jsx'), 'utf8');
    assert.ok(messagesViewSource.includes('visualViewport'), 'MessagesView must handle mobile keyboard resize via visualViewport');
    assert.ok(messagesViewSource.includes('100dvh'), 'MessagesView must use 100dvh for mobile full-screen chat');
    assert.ok(messagesViewSource.includes('Back to conversations'), 'MessagesView must provide a clear mobile Back button');

    const storageRules = fs.readFileSync(path.resolve('storage.rules'), 'utf8');
    assert.ok(storageRules.includes('isConversationParticipant(conversationId)'), 'storage.rules must restrict attachments to conversation participants');
    assert.ok(storageRules.includes('5 * 1024 * 1024'), 'storage.rules must enforce 5MB file size limit');

    const firestoreRules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
    assert.ok(firestoreRules.includes('match /conversations/{conversationId}'), 'firestore.rules must protect conversations');
    assert.ok(firestoreRules.includes('hasNoForbiddenMessageBinaryKeys'), 'firestore.rules must forbid raw binary fields in messages');
});
