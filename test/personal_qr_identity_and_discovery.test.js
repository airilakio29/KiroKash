import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ensurePublicProfileForUser,
  updatePublicSocialProfile,
  ensureUserQrCode,
  encodePersonalQrCode,
  extractQrIdentifierFromPayload,
  getProfileByQrCodeId,
  resolveScannedUserByQrSync,
  resolveScannedUserByQr,
  isValidPersonalQrCodeId,
  sendFriendRequest,
  acceptFriendRequest,
  getIncomingFriendRequests,
  getFriendsList,
  areFriends,
  blockUser,
  unblockUser
} from '../src/services/socialService.js';

test('1. Unique Personal QR Code generation, format, 1:1 mapping, and persistence across logout/login', async () => {
  const accountA = {
    id: 'auth_uid_student_alpha_901',
    displayName: 'Farah Nadia',
    handle: 'farah_nadia_um',
    university: 'Universiti Malaya (UM)',
    course: 'Software Engineering',
    bio: 'Tracking campus meals & saving smart!',
    email: 'farah.private@siswa.um.edu.my',
    balance: 1450.75,
    totalIncome: 2500,
    totalExpense: 1049.25
  };

  const accountB = {
    id: 'auth_uid_student_beta_902',
    displayName: 'Haziq Danial',
    handle: 'haziq_danial_upm',
    university: 'Universiti Putra Malaysia (UPM)',
    course: 'Data Science',
    bio: 'Badminton & coding club.',
    email: 'haziq.private@student.upm.edu.my',
    balance: 890.00
  };

  const profileA = ensurePublicProfileForUser(accountA);
  const profileB = ensurePublicProfileForUser(accountB);

  // Valid opaque random QR identifier format
  assert.ok(isValidPersonalQrCodeId(profileA.qrCodeId), `Expected valid qrCodeId for A, got ${profileA.qrCodeId}`);
  assert.ok(isValidPersonalQrCodeId(profileB.qrCodeId), `Expected valid qrCodeId for B, got ${profileB.qrCodeId}`);

  // Different users never share the same identifier
  assert.notEqual(profileA.qrCodeId, profileB.qrCodeId);

  // Never exposes raw Firebase UID or email inside qrCodeId or encoded deep link
  assert.ok(!profileA.qrCodeId.includes(accountA.id));
  assert.ok(!profileB.qrCodeId.includes(accountB.id));

  const qrDeepLinkA = encodePersonalQrCode(accountA);
  assert.equal(qrDeepLinkA, `https://kampuskash.vercel.app/scan-user?id=${profileA.qrCodeId}`);
  assert.ok(!qrDeepLinkA.includes(accountA.id));
  assert.ok(!qrDeepLinkA.includes(accountA.email));
  assert.ok(!qrDeepLinkA.includes('1450.75'));

  // Persistence across logout and login: re-calling ensurePublicProfileForUser or ensureUserQrCode preserves qrCodeId
  const originalQrA = profileA.qrCodeId;
  const afterReLoginProfileA = ensurePublicProfileForUser({
    id: accountA.id,
    displayName: 'Farah Nadia',
    handle: 'farah_nadia_um'
  });
  assert.equal(afterReLoginProfileA.qrCodeId, originalQrA);
  assert.equal(ensureUserQrCode(accountA.id), originalQrA);

  // Profile updates preserve qrCodeId and forbid changing qrCodeId to another value
  const updatedProfileA = await updatePublicSocialProfile(accountA.id, {
    bio: 'Updated campus bio!'
  });
  assert.equal(updatedProfileA.qrCodeId, originalQrA);

  await assert.rejects(
    async () => {
      await updatePublicSocialProfile(accountA.id, {
        qrCodeId: 'kkid_hijackedidentifier999'
      });
    },
    /Personal QR identifier cannot be modified once assigned/
  );

  // Lookup by qrCodeId returns exact 1:1 user profile without financial or private fields
  const resolvedByQrId = getProfileByQrCodeId(originalQrA);
  assert.equal(resolvedByQrId.id, accountA.id);
  assert.equal(resolvedByQrId.handle, 'farah_nadia_um');
  assert.equal(resolvedByQrId.email, undefined);
  assert.equal(resolvedByQrId.balance, undefined);
  assert.equal(resolvedByQrId.totalIncome, undefined);
});

test('2. Full Multi-Account QR Scan -> Profile Preview -> Send Friend Request -> Accept -> Friends Flow', async () => {
  const userA = {
    id: 'qr_flow_user_a_101',
    displayName: 'Nurul Izzah',
    handle: 'izzah_ukm',
    university: 'Universiti Kebangsaan Malaysia (UKM)',
    course: 'Accounting',
    bio: 'UKM Residential College 3'
  };

  const userB = {
    id: 'qr_flow_user_b_202',
    displayName: 'Syafiq Hakim',
    handle: 'syafiq_utm',
    university: 'Universiti Teknologi Malaysia (UTM)',
    course: 'Mechanical Engineering',
    bio: 'UTM Skudai'
  };

  ensurePublicProfileForUser(userA);
  ensurePublicProfileForUser(userB);

  // Step 1: Account A opens My Personal QR
  const qrLinkA = encodePersonalQrCode(userA);
  assert.match(qrLinkA, /^https:\/\/kampuskash\.vercel\.app\/scan-user\?id=kkid_[a-z0-9]{12,32}$/);

  // Step 2: Account B scans Account A's QR code
  const scan1 = await resolveScannedUserByQr(qrLinkA, userB.id);
  assert.equal(scan1.ok, true);
  assert.equal(scan1.code, 'can_connect');
  assert.equal(scan1.profile.id, userA.id);
  assert.equal(scan1.profile.displayName, 'Nurul Izzah');
  assert.equal(scan1.profile.handle, 'izzah_ukm');
  assert.equal(scan1.profile.university, 'Universiti Kebangsaan Malaysia (UKM)');
  assert.equal(scan1.relationship.status, 'none');
  assert.equal(scan1.relationship.canSendRequest, true);
  // Scanning does NOT automatically add them as friends
  assert.equal(areFriends(userA.id, userB.id), false);

  // Step 3: Account B clicks Add Friend on Scanned User Profile Preview
  const sentReq = await sendFriendRequest(userB, scan1.profile.id);
  assert.equal(sentReq.senderId, userB.id);
  assert.equal(sentReq.receiverId, userA.id);
  assert.equal(sentReq.status, 'pending');

  // Step 4: Duplicate request prevention & re-scanning while request is pending
  await assert.rejects(
    async () => {
      await sendFriendRequest(userB, userA.id);
    },
    /already pending/i
  );

  const scanWhilePendingFromB = resolveScannedUserByQrSync(qrLinkA, userB.id);
  assert.equal(scanWhilePendingFromB.ok, true);
  assert.equal(scanWhilePendingFromB.code, 'request_already_sent');
  assert.equal(scanWhilePendingFromB.relationship.status, 'outgoing_pending');

  // Step 5: Account A sees the incoming friend request in Connect -> Friend Requests
  const incomingForA = getIncomingFriendRequests(userA.id);
  assert.ok(incomingForA.some((r) => r.id === sentReq.id && r.senderId === userB.id));

  // If Account A scans Account B's QR while incoming request exists, shows incoming_request_exists
  const qrLinkB = encodePersonalQrCode(userB);
  const scanFromA = resolveScannedUserByQrSync(qrLinkB, userA.id);
  assert.equal(scanFromA.ok, true);
  assert.equal(scanFromA.code, 'incoming_request_exists');
  assert.equal(scanFromA.relationship.status, 'incoming_pending');

  // Step 6: Account A accepts the friend request
  const acceptRes = await acceptFriendRequest(userA, sentReq.id);
  assert.equal(acceptRes.accepted, true);
  assert.equal(acceptRes.request.status, 'accepted');

  // Step 7: Both Account A and Account B appear in each other's Friends list
  assert.equal(areFriends(userA.id, userB.id), true);
  const friendsOfA = getFriendsList(userA.id);
  const friendsOfB = getFriendsList(userB.id);
  assert.ok(friendsOfA.some((f) => f.id === userB.id && f.handle === 'syafiq_utm'));
  assert.ok(friendsOfB.some((f) => f.id === userA.id && f.handle === 'izzah_ukm'));

  // Step 8: Re-scanning an existing friend shows "already_friends" and prevents new requests
  const scanAfterFriends = await resolveScannedUserByQr(qrLinkA, userB.id);
  assert.equal(scanAfterFriends.ok, true);
  assert.equal(scanAfterFriends.code, 'already_friends');
  assert.equal(scanAfterFriends.relationship.status, 'friends');
  assert.equal(scanAfterFriends.relationship.canSendRequest, false);

  await assert.rejects(
    async () => {
      await sendFriendRequest(userB, userA.id);
    },
    /already friends/i
  );
});

test('3. Edge Cases: Self-scan, Invalid QR, Payment QR distinction, and Blocked/Unavailable Account', async () => {
  const userC = ensurePublicProfileForUser({
    id: 'qr_edge_user_c_303',
    displayName: 'Chong Wei',
    handle: 'chongwei_usm',
    university: 'Universiti Sains Malaysia (USM)'
  });

  const userD = ensurePublicProfileForUser({
    id: 'qr_edge_user_d_404',
    displayName: 'Divya Nair',
    handle: 'divya_um',
    university: 'Universiti Malaya (UM)'
  });

  const qrLinkC = encodePersonalQrCode(userC);

  // Case 1: User scans their own QR
  const selfScan = await resolveScannedUserByQr(qrLinkC, userC.id);
  assert.equal(selfScan.ok, true);
  assert.equal(selfScan.code, 'self_scan');
  assert.equal(selfScan.profile.id, userC.id);
  assert.equal(selfScan.relationship.status, 'self');
  assert.equal(selfScan.relationship.canSendRequest, false);

  await assert.rejects(
    async () => {
      await sendFriendRequest(userC, userC.id);
    },
    /yourself/i
  );

  // Case 2: Invalid or unrecognised QR code
  const invalidScan1 = await resolveScannedUserByQr('https://example.com/not-a-kampuskash-qr', userC.id);
  assert.equal(invalidScan1.ok, false);
  assert.equal(invalidScan1.code, 'invalid_qr');
  assert.equal(invalidScan1.profile, null);

  const invalidScan2 = await resolveScannedUserByQr('RANDOM_GIBBERISH_TEXT_123', userC.id);
  assert.equal(invalidScan2.ok, false);
  assert.equal(invalidScan2.code, 'invalid_qr');

  // Case 3: Well-formed kkid_ that does not belong to any existing account
  const nonexistentScan = await resolveScannedUserByQr(
    'https://kampuskash.vercel.app/scan-user?id=kkid_nonexistentuser99999',
    userC.id
  );
  assert.equal(nonexistentScan.ok, false);
  assert.equal(nonexistentScan.code, 'account_unavailable');

  // Case 4: Blocked account is reported as unavailable
  blockUser(userC.id, userD.id);
  const qrLinkD = encodePersonalQrCode(userD);
  const blockedScan = await resolveScannedUserByQr(qrLinkD, userC.id);
  assert.equal(blockedScan.ok, false);
  assert.equal(blockedScan.code, 'account_unavailable');
  unblockUser(userC.id, userD.id);

  // Case 5: Payment QR payload is cleanly distinguished by extractQrIdentifierFromPayload
  const paymentExtract = extractQrIdentifierFromPayload('KKPAY:demo_user_sarah:sarah_um:15.00');
  assert.equal(paymentExtract.valid, false);
  assert.equal(paymentExtract.isPaymentQr, true);
});

test('4. UI Components, Deep-Link Routing, and Firestore Security Rules Verification', () => {
  const rootDir = process.cwd();

  const rulesSource = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');
  assert.ok(rulesSource.includes('match /userQrCodes/{qrCodeId}'));
  assert.ok(rulesSource.includes('^kkid_[a-z0-9]{12,32}$'));
  assert.ok(rulesSource.includes('request.resource.data.qrCodeId == resource.data.qrCodeId'));

  const payViewSource = fs.readFileSync(path.join(rootDir, 'src/views/PayView.jsx'), 'utf8');
  assert.ok(payViewSource.includes('My Personal QR'));
  assert.ok(
    payViewSource.includes('Let other KampusKash users scan your QR to find your profile and connect with you.')
  );
  assert.ok(
    payViewSource.includes('Your unique KampusKash identity. Share it with friends to connect.')
  );
  assert.ok(payViewSource.includes('ScannedUserProfileCard'));

  const scannedCardSource = fs.readFileSync(
    path.join(rootDir, 'src/components/social/ScannedUserProfileCard.jsx'),
    'utf8'
  );
  assert.ok(scannedCardSource.includes('Add Friend'));
  assert.ok(scannedCardSource.includes('Request Sent'));
  assert.ok(scannedCardSource.includes('Accept Request'));
  assert.ok(scannedCardSource.includes('Friends'));
  assert.ok(scannedCardSource.includes('View Profile'));

  const appSource = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');
  assert.ok(appSource.includes('/scan-user'));
});
