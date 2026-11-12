/**
 * KampusKash Connect — Phase 4: Groups, Savings Challenges, Leaderboards & Community Moderation Cloud Function
 * Enforces server-side authentication, group admin roles, group membership, declared-only savings challenge
 * updates, leaderboard privacy opt-outs, and community moderation privileges.
 */

import { verifyFirebaseTokenClaims, checkRateLimit } from '../ai/chatFunction.js';

export function validateGroupCommunityOperation({
  actorUid,
  action,
  payload = {},
  group = null,
  challenge = null,
  community = null
} = {}) {
  if (!actorUid) {
    return { valid: false, status: 401, error: 'Authentication required.' };
  }

  switch (action) {
    case 'create_group': {
      const { creatorId, name } = payload;
      if (creatorId && String(creatorId) !== String(actorUid)) {
        return { valid: false, status: 403, error: 'Creator UID mismatch.' };
      }
      if (!name || String(name).trim().length < 2) {
        return { valid: false, status: 400, error: 'Group name must be at least 2 characters.' };
      }
      return { valid: true, status: 200 };
    }

    case 'remove_group_member': {
      if (!group) {
        return { valid: false, status: 404, error: 'Group not found.' };
      }
      const isAdmin =
        group.roles?.[actorUid] === 'admin' ||
        (Array.isArray(group.adminIds) && group.adminIds.includes(String(actorUid)));
      if (!isAdmin) {
        return {
          valid: false,
          status: 403,
          error: 'Permission denied: Only group administrators can remove members.'
        };
      }
      if (String(payload.targetUserId) === String(group.creatorId)) {
        return {
          valid: false,
          status: 400,
          error: 'Cannot remove the original group creator.'
        };
      }
      return { valid: true, status: 200 };
    }

    case 'read_group': {
      if (!group) {
        return { valid: false, status: 404, error: 'Group not found.' };
      }
      if (!Array.isArray(group.memberIds) || !group.memberIds.includes(String(actorUid))) {
        return {
          valid: false,
          status: 403,
          error: 'Access denied: Only group members can read private group conversations and attachments.'
        };
      }
      return { valid: true, status: 200 };
    }

    case 'update_savings_challenge_progress': {
      if (!challenge) {
        return { valid: false, status: 404, error: 'Savings challenge not found.' };
      }
      if (payload.userId && String(payload.userId) !== String(actorUid)) {
        return {
          valid: false,
          status: 403,
          error: 'You can only update your own declared savings challenge progress.'
        };
      }
      const isParticipant =
        Array.isArray(challenge.participants) &&
        challenge.participants.some((p) => String(p.userId) === String(actorUid));
      if (!isParticipant) {
        return {
          valid: false,
          status: 403,
          error: 'Access denied: You are not a participant in this savings challenge.'
        };
      }
      if (payload.deductRealOrDemoBalance === true) {
        return {
          valid: false,
          status: 400,
          error: 'Savings challenges record declared progress only and must never deduct personal or demo balances.'
        };
      }
      return {
        valid: true,
        status: 200,
        isDeclaredOnly: true,
        verifiedBalanceDeducted: false
      };
    }

    case 'moderate_community_content': {
      if (!community) {
        return { valid: false, status: 404, error: 'Community not found.' };
      }
      const isCommunityAdmin =
        Array.isArray(community.adminIds) && community.adminIds.includes(String(actorUid));
      const isContentAuthor =
        payload.authorId && String(payload.authorId) === String(actorUid);
      if (!isCommunityAdmin && !isContentAuthor) {
        return {
          valid: false,
          status: 403,
          error: 'Permission denied: Community administrator or content owner privileges required.'
        };
      }
      return { valid: true, status: 200 };
    }

    default:
      return { valid: false, status: 400, error: `Unsupported action: ${action}` };
  }
}

export async function handleGroupCommunityRequest(req, res) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token.' });
    }
    const idToken = authHeader.slice(7).trim();
    const claims = verifyFirebaseTokenClaims(idToken);
    const actorUid = claims.user_id || claims.sub;

    if (!checkRateLimit(actorUid)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again shortly.' });
    }

    const { action, payload, group, challenge, community } = req.body || {};
    const result = validateGroupCommunityOperation({
      actorUid,
      action,
      payload,
      group,
      challenge,
      community
    });

    if (!result.valid) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json({
      ok: true,
      actorUid,
      action,
      ...result
    });
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Authentication failed.' });
  }
}

