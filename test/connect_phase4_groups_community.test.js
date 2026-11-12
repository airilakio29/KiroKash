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
    unblockUser,
    getUserNotifications
} from '../src/services/socialService.js';
import { resetRateLimits } from '../src/utils/safetyUtils.js';
import {
    resetMessengerStateForTesting,
    sendMessage,
    toggleMessageReaction,
    markConversationRead,
    prepareLocationSharePayload
} from '../src/services/messengerService.js';
import {
    resetDemoWalletStateForTesting,
    ensureDemoWallet,
    getDemoWallet
} from '../src/services/demoWalletService.js';
import {
    resetPhase4StateForTesting,
    createConnectGroup,
    getGroupDetails,
    getUserGroups,
    updateConnectGroup,
    inviteFriendToGroup,
    getUserGroupInvitations,
    respondToGroupInvitation,
    removeGroupMember,
    leaveConnectGroup,
    sendGroupMessage,
    getGroupMessages,
    uploadGroupImage,
    getGroupAttachment,
    createGroupDemoSplitBill,
    payGroupDemoSplitShare,
    createGroupDemoPaymentRequest,
    sendGroupPaymentReminder,
    getGroupSplitBills,
    createGroupSavingsChallenge,
    updateSavingsChallengeProgress,
    getSavingsChallenge,
    ensureUserGamificationRecord,
    setLeaderboardOptIn,
    getConnectLeaderboard,
    discoverCommunities,
    joinCommunity,
    leaveCommunity,
    promoteCommunityAdmin,
    createCommunityPost,
    getCommunityPosts,
    toggleCommunityPostReaction,
    addCommunityComment,
    getCommunityComments,
    reportCommunityContent,
    getCommunityReports,
    moderateCommunityContent,
    setCommunityMemberRestriction,
    updatePhase4NotificationPrefs
} from '../src/services/communityGroupService.js';
import { validateGroupCommunityOperation } from '../functions/src/connect/groupCommunityFunction.js';
import { MESSAGE_TYPES } from '../src/config/appConstants.js';

async function connectFriends(u1, u2) {
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
        // already friends
    }
}

async function setupFiveStudentsAndOutsider() {
    globalThis.localStorage.clear();
    resetMessengerStateForTesting();
    resetDemoWalletStateForTesting();
    resetPhase4StateForTesting();
    resetRateLimits();

    const u1 = ensurePublicProfileForUser({
        id: 'stu_1',
        name: 'Aiman Hakim',
        handle: 'aiman_utp',
        university: 'Universiti Teknologi PETRONAS (UTP)'
    });
    const u2 = ensurePublicProfileForUser({
        id: 'stu_2',
        name: 'Nurul Izzah',
        handle: 'nurul_utp',
        university: 'Universiti Teknologi PETRONAS (UTP)'
    });
    const u3 = ensurePublicProfileForUser({
        id: 'stu_3',
        name: 'Danish Irfan',
        handle: 'danish_um',
        university: 'Universiti Malaya (UM)'
    });
    const u4 = ensurePublicProfileForUser({
        id: 'stu_4',
        name: 'Mei Ling',
        handle: 'meiling_usm',
        university: 'Universiti Sains Malaysia (USM)'
    });
    const u5 = ensurePublicProfileForUser({
        id: 'stu_5',
        name: 'Harith Zaki',
        handle: 'harith_ukm',
        university: 'Universiti Kebangsaan Malaysia (UKM)'
    });
    const outsider = ensurePublicProfileForUser({
        id: 'stu_outsider',
        name: 'Outsider Stranger',
        handle: 'stranger_x',
        university: 'Other Campus'
    });

    // Make stu_1 friends with stu_2, stu_3, stu_4, stu_5
    await connectFriends(u1, u2);
    await connectFriends(u1, u3);
    await connectFriends(u1, u4);
    await connectFriends(u1, u5);
    await connectFriends(u2, u3);
    resetRateLimits();

    // Ensure demo wallets (RM100 each)
    for (const u of [u1, u2, u3, u4, u5, outsider]) {
        ensureDemoWallet(u.id);
    }

    return { u1, u2, u3, u4, u5, outsider };
}

test('Phase 4 (1, 2, 3, 4): Group creation, friend invitations, admin roles, member removal, leaving group & strict non-member access denial', async () => {
    await setupFiveStudentsAndOutsider();

    // 1. Create group with stu_1 (creator/admin), stu_2, stu_3
    const group = createConnectGroup({
        authenticatedUid: 'stu_1',
        creatorId: 'stu_1',
        name: 'UTP Hostel Block V4',
        description: 'Housemates & study group',
        avatarUrl: 'fox',
        memberIds: ['stu_2', 'stu_3']
    });

    assert.equal(group.name, 'UTP Hostel Block V4');
    assert.equal(group.isViewerAdmin, true);
    assert.deepEqual(group.memberIds, ['stu_1', 'stu_2', 'stu_3']);
    assert.equal(getUserGroups('stu_2').length, 1);

    // Update group settings as admin
    const updatedGroup = updateConnectGroup({
        authenticatedUid: 'stu_1',
        actorId: 'stu_1',
        groupId: group.id,
        name: 'UTP Village 4 Squad'
    });
    assert.equal(updatedGroup.name, 'UTP Village 4 Squad');

    // Non-admin cannot remove members
    assert.throws(
        () =>
            removeGroupMember({
                authenticatedUid: 'stu_2',
                actorId: 'stu_2',
                groupId: group.id,
                targetUserId: 'stu_3'
            }),
        /Only group administrators can remove members/i
    );

    // 2. Invite stu_4 to group -> stu_4 receives invitation and accepts
    const invRes = inviteFriendToGroup({
        authenticatedUid: 'stu_1',
        actorId: 'stu_1',
        groupId: group.id,
        targetUserId: 'stu_4'
    });
    assert.equal(invRes.status, 'invited');
    const pendingInvs = getUserGroupInvitations('stu_4');
    assert.equal(pendingInvs.length, 1);

    const acceptedInv = respondToGroupInvitation({
        authenticatedUid: 'stu_4',
        userId: 'stu_4',
        inviteId: pendingInvs[0].id,
        action: 'accept'
    });
    assert.equal(acceptedInv.group.memberIds.includes('stu_4'), true);

    // Admin removes stu_3 from group
    const afterRemove = removeGroupMember({
        authenticatedUid: 'stu_1',
        actorId: 'stu_1',
        groupId: group.id,
        targetUserId: 'stu_3'
    });
    assert.equal(afterRemove.memberIds.includes('stu_3'), false);

    // 3. stu_4 leaves the group voluntarily
    const leaveRes = leaveConnectGroup({
        authenticatedUid: 'stu_4',
        userId: 'stu_4',
        groupId: group.id
    });
    assert.equal(leaveRes.left, true);

    // 4. Unauthorised user (`stu_outsider` and former member `stu_4`) CANNOT read private group or messages
    assert.throws(
        () => getGroupDetails(group.id, 'stu_outsider'),
        /Access denied: You are not a member of this private group/i
    );
    assert.throws(
        () => getGroupMessages(group.id, 'stu_outsider'),
        /Access denied/i
    );
    assert.throws(
        () => getGroupMessages(group.id, 'stu_4'),
        /Access denied/i
    );
});

test('Phase 4 (5): Group messaging supports text, images, locations, reactions, replies, read indicators & attachment protection', async () => {
    await setupFiveStudentsAndOutsider();

    const group = createConnectGroup({
        authenticatedUid: 'stu_1',
        creatorId: 'stu_1',
        name: 'Campus Study Group',
        memberIds: ['stu_2', 'stu_3']
    });

    // Text message
    const textMsg = sendGroupMessage({
        authenticatedUid: 'stu_1',
        senderId: 'stu_1',
        groupId: group.id,
        type: MESSAGE_TYPES.TEXT,
        text: 'Meeting at central library at 8pm!'
    });
    assert.equal(textMsg.text, 'Meeting at central library at 8pm!');

    // Reply message from stu_2
    const replyMsg = sendGroupMessage({
        authenticatedUid: 'stu_2',
        senderId: 'stu_2',
        groupId: group.id,
        type: MESSAGE_TYPES.TEXT,
        text: 'On my way!',
        replyTo: {
            messageId: textMsg.id,
            senderId: 'stu_1',
            senderName: 'Aiman Hakim',
            previewText: textMsg.text
        }
    });
    assert.equal(replyMsg.replyTo.messageId, textMsg.id);

    // Image upload & image message in group
    const uploadedImg = await uploadGroupImage({
        groupId: group.id,
        senderId: 'stu_2',
        file: { name: 'notes.png', type: 'image/png', size: 120 * 1024 }
    });
    const imgMsg = sendGroupMessage({
        authenticatedUid: 'stu_2',
        senderId: 'stu_2',
        groupId: group.id,
        type: MESSAGE_TYPES.IMAGE,
        text: 'Whiteboard notes',
        attachment: uploadedImg
    });
    assert.equal(imgMsg.type, 'image');

    // Group member can access attachment; non-member is blocked
    const att = getGroupAttachment(group.id, uploadedImg.storagePath, 'stu_3');
    assert.equal(att.fileName, 'notes.png');
    assert.throws(
        () => getGroupAttachment(group.id, uploadedImg.storagePath, 'stu_outsider'),
        /Access denied/i
    );

    // Location sharing in group
    const locPayload = prepareLocationSharePayload({
        lat: 4.3856,
        lng: 100.9701,
        label: 'UTP Chancellor Complex',
        consentGranted: true
    });
    const locMsg = sendGroupMessage({
        authenticatedUid: 'stu_3',
        senderId: 'stu_3',
        groupId: group.id,
        type: MESSAGE_TYPES.LOCATION,
        location: locPayload
    });
    assert.equal(locMsg.location.label, 'UTP Chancellor Complex');

    // Reactions & Read indicators
    toggleMessageReaction({
        conversationId: group.conversationId,
        messageId: textMsg.id,
        actorId: 'stu_2',
        emoji: '🔥'
    });
    markConversationRead(group.conversationId, 'stu_3');

    const page = getGroupMessages(group.id, 'stu_1', { limit: 20 });
    const updatedTextMsg = page.messages.find((m) => m.id === textMsg.id);
    assert.equal(updatedTextMsg.reactions.stu_2, '🔥');
    assert.equal(updatedTextMsg.readBy.includes('stu_3'), true);
});

test('Phase 4 (6 & 7): Group Demo Wallet — 5 students share RM100 expense (RM20 each), explicit approval required, payment tracking & reminders', async () => {
    await setupFiveStudentsAndOutsider();

    // Create a group of 5 students: stu_1, stu_2, stu_3, stu_4, stu_5
    const group = createConnectGroup({
        authenticatedUid: 'stu_1',
        creatorId: 'stu_1',
        name: 'Five Friends Dinner Squad',
        memberIds: ['stu_2', 'stu_3', 'stu_4', 'stu_5']
    });
    assert.equal(group.memberIds.length, 5);

    // 5 students share a RM100.00 expense equally -> RM20.00 per student
    const { splitBill } = createGroupDemoSplitBill({
        authenticatedUid: 'stu_1',
        creatorId: 'stu_1',
        groupId: group.id,
        title: 'Hotpot Dinner for 5',
        totalAmount: 100,
        splitMode: 'equal'
    });

    assert.equal(splitBill.totalAmount, 100);
    assert.equal(splitBill.participants.length, 5);
    for (const part of splitBill.participants) {
        assert.equal(part.amountOwed, 20);
    }
    // Creator's RM20 is marked paid; 4 members owe RM20 each = RM80 outstanding
    assert.equal(splitBill.outstandingAmount, 80);

    // Unconfirmed payment attempt MUST be rejected (each payment requires explicit approval)
    await assert.rejects(
        () =>
            payGroupDemoSplitShare({
                authenticatedUid: 'stu_2',
                payerId: 'stu_2',
                groupId: group.id,
                splitBillId: splitBill.id,
                confirmed: false
            }),
        /Explicit user approval is required/i
    );

    // stu_2 and stu_3 explicitly approve and pay their RM20 shares
    await payGroupDemoSplitShare({
        authenticatedUid: 'stu_2',
        payerId: 'stu_2',
        groupId: group.id,
        splitBillId: splitBill.id,
        confirmed: true
    });
    const after3 = await payGroupDemoSplitShare({
        authenticatedUid: 'stu_3',
        payerId: 'stu_3',
        groupId: group.id,
        splitBillId: splitBill.id,
        confirmed: true
    });

    // Remaining outstanding amount is RM40 (stu_4 and stu_5 still pending)
    assert.equal(after3.splitBill.outstandingAmount, 40);
    assert.equal(getDemoWallet('stu_1').balance, 140); // 100 + 20 + 20
    assert.equal(getDemoWallet('stu_2').balance, 80);
    assert.equal(getDemoWallet('stu_3').balance, 80);

    // Send payment reminder to the 2 remaining unpaid members (stu_4, stu_5)
    const reminderRes = sendGroupPaymentReminder({
        authenticatedUid: 'stu_1',
        actorId: 'stu_1',
        groupId: group.id,
        splitBillId: splitBill.id
    });
    assert.equal(reminderRes.remindedCount, 2);
    assert.deepEqual(reminderRes.remindedUserIds, ['stu_4', 'stu_5']);

    // Group payment request test
    const reqRes = createGroupDemoPaymentRequest({
        authenticatedUid: 'stu_1',
        requesterId: 'stu_1',
        groupId: group.id,
        targetMemberIds: ['stu_4', 'stu_5'],
        amountPerMember: 15,
        note: 'Shuttle van share'
    });
    assert.equal(reqRes.requests.length, 2);
    assert.equal(getGroupSplitBills(group.id, 'stu_1').length, 1);
});

test('Phase 4 (8 & 9): Group Savings Challenges (5 students save RM1,000 over 30 days, declared progress only, no balance deduction) + Leaderboards privacy opt-out', async () => {
    await setupFiveStudentsAndOutsider();

    // Seed real financial tracker balance for stu_1 to verify 100% non-deduction
    const realAccountKey = 'student_tracker_accounts_stu_1';
    const initialRealAccountJson = JSON.stringify([
        { accountId: 'acc_1', accountName: 'Bank Islam Student', balance: 850.0 }
    ]);
    globalThis.localStorage.setItem(realAccountKey, initialRealAccountJson);
    const demoBalanceBefore = getDemoWallet('stu_1').balance;

    // 5 students create a challenge to collectively save RM1,000 over 30 days (RM200 individual target)
    const challenge = createGroupSavingsChallenge({
        authenticatedUid: 'stu_1',
        creatorId: 'stu_1',
        title: '5-Student RM1,000 30-Day Challenge',
        targetAmount: 1000,
        deadlineDays: 30,
        participantIds: ['stu_2', 'stu_3', 'stu_4', 'stu_5']
    });

    assert.equal(challenge.overallTarget, 1000);
    assert.equal(challenge.individualTargetAmount, 200);
    assert.equal(challenge.participants.length, 5);
    assert.equal(challenge.totalDeclaredContributions, 0);
    assert.equal(challenge.remainingAmount, 1000);
    assert.equal(challenge.completionPercentage, 0);
    assert.ok(challenge.daysRemaining >= 29 && challenge.daysRemaining <= 30);
    assert.equal(challenge.isDeclaredOnly, true);
    assert.equal(challenge.verifiedBalanceDeducted, false);

    // Members voluntarily update their declared contributions -> crosses 25% milestone (RM250)
    const step1 = updateSavingsChallengeProgress({
        authenticatedUid: 'stu_1',
        userId: 'stu_1',
        challengeId: challenge.id,
        amountToAdd: 150,
        note: 'Week 1 meal prep savings'
    });
    assert.equal(step1.challenge.totalDeclaredContributions, 150);

    const step2 = updateSavingsChallengeProgress({
        authenticatedUid: 'stu_2',
        userId: 'stu_2',
        challengeId: challenge.id,
        amountToAdd: 150,
        note: 'Skipped cafe lattes'
    });
    assert.equal(step2.challenge.totalDeclaredContributions, 300);
    assert.equal(step2.challenge.remainingAmount, 700);
    assert.equal(step2.challenge.completionPercentage, 30);
    assert.ok(step2.newlyReachedMilestones.includes(25));

    // Verify neither real bank accounts nor demo wallets were deducted!
    assert.equal(globalThis.localStorage.getItem(realAccountKey), initialRealAccountJson);
    assert.equal(getDemoWallet('stu_1').balance, demoBalanceBefore);

    // stu_1 logs 2 more updates to earn Consistent Saver & Budget Master badges
    updateSavingsChallengeProgress({
        authenticatedUid: 'stu_1',
        userId: 'stu_1',
        challengeId: challenge.id,
        amountToAdd: 30
    });
    updateSavingsChallengeProgress({
        authenticatedUid: 'stu_1',
        userId: 'stu_1',
        challengeId: challenge.id,
        amountToAdd: 20
    });

    const gam1 = ensureUserGamificationRecord('stu_1');
    assert.ok(gam1.achievementIds.includes('first_savings_challenge'));
    assert.ok(gam1.achievementIds.includes('consistent_saver'));
    assert.ok(gam1.achievementIds.includes('budget_master'));
    assert.ok(gam1.achievementIds.includes('challenge_completed'));

    // 9. Leaderboards rank by points/progress without exposing wealth, and respect opt-out
    const boardBefore = getConnectLeaderboard({
        category: 'challenge_progress',
        viewerId: 'stu_2',
        candidateUserIds: ['stu_1', 'stu_2', 'stu_3']
    });
    const stu1Row = boardBefore.find((r) => r.userId === 'stu_1');
    assert.ok(stu1Row);
    assert.equal('balance' in stu1Row, false);
    assert.equal('netWorth' in stu1Row, false);

    // stu_1 opts out of public leaderboards -> immediately hidden from public leaderboard
    setLeaderboardOptIn('stu_1', false);
    const boardAfterOptOut = getConnectLeaderboard({
        category: 'challenge_progress',
        viewerId: 'stu_2',
        candidateUserIds: ['stu_1', 'stu_2', 'stu_3']
    });
    assert.equal(boardAfterOptOut.some((r) => r.userId === 'stu_1'), false);

    // Non-participant cannot read private challenge if viewerId is checked
    assert.throws(
        () => getSavingsChallenge(challenge.id, 'stu_outsider'),
        /Access denied/i
    );
});

test('Phase 4 (10 & 11): Student Communities discovery, posts, comments, reactions, financial privacy guard & admin moderation', async () => {
    await setupFiveStudentsAndOutsider();

    // 10. Discover default interest communities (UTP Students, Budget Travel, Student Cooking, Savings Club, Financial Literacy, University Life)
    const allComms = discoverCommunities({ viewerId: 'stu_1' });
    assert.ok(allComms.length >= 6);
    assert.ok(allComms.some((c) => c.name === 'UTP Students'));
    assert.ok(allComms.some((c) => c.name === 'Budget Travel'));
    assert.ok(allComms.some((c) => c.name === 'Student Cooking'));

    // Non-member cannot post before joining
    assert.throws(
        () =>
            createCommunityPost({
                authenticatedUid: 'stu_1',
                authorId: 'stu_1',
                communityId: 'comm_utp_students',
                content: 'Hello UTP!'
            }),
        /must join this community before posting/i
    );

    // stu_1 and stu_2 join UTP Students
    joinCommunity({ authenticatedUid: 'stu_1', userId: 'stu_1', communityId: 'comm_utp_students' });
    joinCommunity({ authenticatedUid: 'stu_2', userId: 'stu_2', communityId: 'comm_utp_students' });
    promoteCommunityAdmin({ communityId: 'comm_utp_students', targetUserId: 'stu_1' });

    // Create post
    const post = createCommunityPost({
        authenticatedUid: 'stu_2',
        authorId: 'stu_2',
        communityId: 'comm_utp_students',
        title: 'Best RM5 Economy Rice near V5',
        content: 'Cafeteria V5 has RM5 chicken rice with free soup every weekday!',
        tag: 'Tip'
    });
    assert.equal(post.title, 'Best RM5 Economy Rice near V5');

    // Sensitive financial information (e.g. 12-digit bank account number) MUST be blocked in public communities
    assert.throws(
        () =>
            createCommunityPost({
                authenticatedUid: 'stu_2',
                authorId: 'stu_2',
                communityId: 'comm_utp_students',
                content: 'Transfer to my bank account 123456789012 now'
            }),
        /Never share bank account numbers/i
    );

    // React & Comment on post
    const reacted = toggleCommunityPostReaction({
        authenticatedUid: 'stu_1',
        userId: 'stu_1',
        communityId: 'comm_utp_students',
        postId: post.id,
        emoji: '👍'
    });
    assert.equal(reacted.reactions.stu_1, '👍');

    const comment = addCommunityComment({
        authenticatedUid: 'stu_1',
        authorId: 'stu_1',
        communityId: 'comm_utp_students',
        postId: post.id,
        content: 'Thanks for sharing! Tried it today.'
    });
    assert.equal(comment.content, 'Thanks for sharing! Tried it today.');
    assert.equal(getCommunityComments(post.id).comments.length, 1);

    // 11. Reporting & Moderation
    const report = reportCommunityContent({
        authenticatedUid: 'stu_1',
        reporterId: 'stu_1',
        communityId: 'comm_utp_students',
        targetType: 'post',
        targetId: post.id,
        reason: 'Testing moderation queue'
    });
    assert.equal(report.status, 'open');
    assert.equal(getCommunityReports('comm_utp_students', 'stu_1').length, 1);

    // Non-admin (`stu_3`) cannot moderate another user's post
    joinCommunity({ authenticatedUid: 'stu_3', userId: 'stu_3', communityId: 'comm_utp_students' });
    assert.throws(
        () =>
            moderateCommunityContent({
                authenticatedUid: 'stu_3',
                moderatorId: 'stu_3',
                communityId: 'comm_utp_students',
                targetType: 'post',
                targetId: post.id,
                action: 'remove'
            }),
        /Permission denied/i
    );

    // Community admin (`stu_1`) removes inappropriate post & mutes spammer (`stu_3`)
    moderateCommunityContent({
        authenticatedUid: 'stu_1',
        moderatorId: 'stu_1',
        communityId: 'comm_utp_students',
        targetType: 'post',
        targetId: post.id,
        action: 'remove'
    });
    assert.equal(getCommunityPosts('comm_utp_students').posts.length, 0);

    setCommunityMemberRestriction({
        authenticatedUid: 'stu_1',
        adminId: 'stu_1',
        communityId: 'comm_utp_students',
        targetUserId: 'stu_3',
        restriction: 'mute'
    });
    assert.throws(
        () =>
            createCommunityPost({
                authenticatedUid: 'stu_3',
                authorId: 'stu_3',
                communityId: 'comm_utp_students',
                content: 'Trying to post while muted'
            }),
        /currently muted/i
    );

    // Leave community
    const afterLeave = leaveCommunity({
        authenticatedUid: 'stu_2',
        userId: 'stu_2',
        communityId: 'comm_utp_students'
    });
    assert.equal(afterLeave.isJoined, false);
});

test('Phase 4 (12 & 13): Notifications deduplication/preferences, Cloud Function validation & Firestore rules verification', async () => {
    await setupFiveStudentsAndOutsider();

    // Disable groupMessages notifications for stu_2
    updatePhase4NotificationPrefs('stu_2', { groupMessages: false });

    const group = createConnectGroup({
        authenticatedUid: 'stu_1',
        creatorId: 'stu_1',
        name: 'Notification Test Group',
        memberIds: ['stu_2', 'stu_3']
    });

    sendGroupMessage({
        authenticatedUid: 'stu_1',
        senderId: 'stu_1',
        groupId: group.id,
        text: 'Hello group!'
    });

    // stu_3 receives group_message notification for this group; stu_2 opted out of groupMessages notifications
    const notifsStu3 = getUserNotifications('stu_3');
    const notifsStu2 = getUserNotifications('stu_2');
    assert.equal(
        notifsStu3.some((n) => n.type === 'group_message' && n.message.includes('Notification Test Group')),
        true
    );
    assert.equal(
        notifsStu2.some((n) => n.type === 'group_message' && n.message.includes('Notification Test Group')),
        false
    );

    // Cloud Function validation checks
    const nonAdminRemove = validateGroupCommunityOperation({
        actorUid: 'stu_2',
        action: 'remove_group_member',
        payload: { targetUserId: 'stu_3' },
        group
    });
    assert.equal(nonAdminRemove.valid, false);
    assert.equal(nonAdminRemove.status, 403);

    const outsiderRead = validateGroupCommunityOperation({
        actorUid: 'stu_outsider',
        action: 'read_group',
        group
    });
    assert.equal(outsiderRead.valid, false);
    assert.equal(outsiderRead.status, 403);

    // Verify firestore.rules includes Phase 4 collections
    const rulesText = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
    assert.match(rulesText, /match \/connectGroups\/\{groupId\}/);
    assert.match(rulesText, /match \/savingsChallenges\/\{challengeId\}/);
    assert.match(rulesText, /match \/communities\/\{communityId\}/);
});
