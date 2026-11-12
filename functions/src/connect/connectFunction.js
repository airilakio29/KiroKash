/**
 * KampusKash Connect — Server-Side Validation & Friend Request Cloud Function
 * Validates Firebase ID tokens, enforces rate limits, prevents self-requests,
 * duplicate requests, blocked interactions, and validates friendship transitions.
 */

import { verifyFirebaseTokenClaims, checkRateLimit } from '../ai/chatFunction.js';

/**
 * Validates a friend request operation on the server side.
 */
export function validateConnectOperation({ actorUid, action, payload = {}, existingRequest = null, areAlreadyFriends = false, isBlocked = false }) {
  if (!actorUid) {
    return { valid: false, status: 401, error: 'Authentication required.' };
  }

  switch (action) {
    case 'send_request': {
      const { receiverId } = payload;
      if (!receiverId || typeof receiverId !== 'string') {
        return { valid: false, status: 400, error: 'Recipient user ID is required.' };
      }
      if (actorUid === receiverId) {
        return { valid: false, status: 400, error: 'You cannot send a friend request to yourself.' };
      }
      if (isBlocked) {
        return { valid: false, status: 403, error: 'Cannot send a friend request to this user.' };
      }
      if (areAlreadyFriends) {
        return { valid: false, status: 409, error: 'You are already friends with this user.' };
      }
      if (existingRequest && existingRequest.status === 'pending') {
        return { valid: false, status: 409, error: 'A friend request is already pending for this user.' };
      }
      return {
        valid: true,
        status: 200,
        requestId: `${actorUid}_${receiverId}`
      };
    }

    case 'accept_request': {
      if (!existingRequest) {
        return { valid: false, status: 404, error: 'Friend request not found.' };
      }
      if (existingRequest.receiverId !== actorUid) {
        return { valid: false, status: 403, error: 'Only the recipient can accept this friend request.' };
      }
      if (existingRequest.status !== 'pending') {
        return { valid: false, status: 409, error: `Friend request has already been ${existingRequest.status}.` };
      }
      if (isBlocked) {
        return { valid: false, status: 403, error: 'Cannot accept a friend request from a blocked user.' };
      }
      if (areAlreadyFriends) {
        return { valid: false, status: 409, error: 'You are already friends with this user.' };
      }
      const [userA, userB] = [existingRequest.senderId, existingRequest.receiverId].sort();
      return {
        valid: true,
        status: 200,
        friendshipId: `${userA}_${userB}`,
        users: [userA, userB]
      };
    }

    case 'reject_request': {
      if (!existingRequest) {
        return { valid: false, status: 404, error: 'Friend request not found.' };
      }
      if (existingRequest.receiverId !== actorUid) {
        return { valid: false, status: 403, error: 'Only the recipient can reject this friend request.' };
      }
      if (existingRequest.status !== 'pending') {
        return { valid: false, status: 409, error: `Friend request has already been ${existingRequest.status}.` };
      }
      return { valid: true, status: 200 };
    }

    case 'cancel_request': {
      if (!existingRequest) {
        return { valid: false, status: 404, error: 'Friend request not found.' };
      }
      if (existingRequest.senderId !== actorUid) {
        return { valid: false, status: 403, error: 'Only the sender can cancel an outgoing friend request.' };
      }
      if (existingRequest.status !== 'pending') {
        return { valid: false, status: 409, error: `Cannot cancel a friend request that is already ${existingRequest.status}.` };
      }
      return { valid: true, status: 200 };
    }

    case 'remove_friend': {
      const { friendUserId } = payload;
      if (!friendUserId || actorUid === friendUserId) {
        return { valid: false, status: 400, error: 'Valid friend user ID is required.' };
      }
      const [userA, userB] = [actorUid, friendUserId].sort();
      return {
        valid: true,
        status: 200,
        friendshipId: `${userA}_${userB}`
      };
    }

    case 'send_message': {
      const { conversationId, senderId, participants = [], type = 'text' } = payload;
      if (!conversationId || typeof conversationId !== 'string') {
        return { valid: false, status: 400, error: 'Conversation ID is required.' };
      }
      if (senderId && senderId !== actorUid) {
        return { valid: false, status: 403, error: 'Sender ID mismatch: cannot spoof another user.' };
      }
      if (!Array.isArray(participants) || !participants.includes(actorUid)) {
        return { valid: false, status: 403, error: 'Only conversation participants can send messages.' };
      }
      if (isBlocked) {
        return { valid: false, status: 403, error: 'Cannot send message to a blocked user.' };
      }
      if (!areAlreadyFriends) {
        return { valid: false, status: 403, error: 'You must be friends to send messages in this conversation.' };
      }
      const validTypes = ['text', 'image', 'location', 'system', 'payment', 'voice', 'group_challenge'];
      if (!validTypes.includes(type)) {
        return { valid: false, status: 400, error: `Unsupported message type: ${type}` };
      }
      return {
        valid: true,
        status: 200,
        verifiedSenderId: actorUid,
        conversationId
      };
    }

    case 'delete_message': {
      const { messageSenderId, participants = [] } = payload;
      if (!Array.isArray(participants) || !participants.includes(actorUid)) {
        return { valid: false, status: 403, error: 'Only conversation participants can access this conversation.' };
      }
      if (!messageSenderId || messageSenderId !== actorUid) {
        return { valid: false, status: 403, error: 'You can only delete your own messages.' };
      }
      return { valid: true, status: 200 };
    }

    case 'access_attachment': {
      const { conversationId, storagePath, participants = [] } = payload;
      if (!Array.isArray(participants) || !participants.includes(actorUid)) {
        return { valid: false, status: 403, error: 'Access denied: non-participants cannot access conversation attachments.' };
      }
      if (!storagePath || !String(storagePath).startsWith(`conversations/${conversationId}/attachments/`)) {
        return { valid: false, status: 403, error: 'Attachment path does not match conversation.' };
      }
      return { valid: true, status: 200 };
    }

    default:
      return { valid: false, status: 400, error: `Unsupported Connect action: ${action}` };
  }
}

/**
 * Express/Firebase HTTPS Handler for KampusKash Connect operations
 */
export async function handleConnectRequest(req, res) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token.' });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    let authUser;
    try {
      authUser = verifyFirebaseTokenClaims(token, process.env.VITE_FIREBASE_PROJECT_ID || 'kampuskash-82b7c');
    } catch (authErr) {
      return res.status(401).json({ error: `Unauthorized: ${authErr.message}` });
    }

    const rate = checkRateLimit(authUser.uid);
    if (!rate.allowed) {
      return res.status(429).json({ error: rate.error });
    }

    const { action, payload, existingRequest, areAlreadyFriends, isBlocked } = req.body || {};
    const validation = validateConnectOperation({
      actorUid: authUser.uid,
      action,
      payload,
      existingRequest,
      areAlreadyFriends,
      isBlocked
    });

    if (!validation.valid) {
      return res.status(validation.status).json({ error: validation.error });
    }

    return res.status(200).json({
      success: true,
      actorUid: authUser.uid,
      action,
      ...validation
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Internal server error in Connect handler.' });
  }
}

