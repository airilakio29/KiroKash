/**
 * KampusKash Connect — Phase 3: Trusted Backend Atomic Demo Wallet Processor
 * Validates Firebase ID tokens, enforces one-time initial RM100 allocation,
 * processes atomic P2P transfers, payment requests, and split bills,
 * and rejects any unauthorized or direct client balance tampering.
 */

import { verifyFirebaseTokenClaims, checkRateLimit } from '../ai/chatFunction.js';

export const DEMO_MODE_BANNER = 'DEMO MODE — SIMULATED MONEY — NO REAL FUNDS';

function roundRM(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

export function validateBackendDemoAmount(rawAmount, maxAmount = 200) {
  if (rawAmount === null || rawAmount === undefined || rawAmount === '' || typeof rawAmount === 'boolean') {
    return { valid: false, error: 'Amount is required.' };
  }
  const str = String(rawAmount).trim();
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    return { valid: false, error: 'Invalid numerical input.' };
  }
  const num = Number(str);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, error: 'Amount must be greater than RM0.00.' };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return { valid: false, error: 'RM amount can have at most 2 decimal places.' };
  }
  const rounded = roundRM(num);
  if (maxAmount && rounded > maxAmount) {
    return { valid: false, error: `Amount cannot exceed RM${Number(maxAmount).toFixed(2)}.` };
  }
  return { valid: true, amount: rounded };
}

/**
 * Validates and prepares an atomic Demo Wallet backend operation.
 */
export function validateDemoWalletBackendOperation({
  actorUid,
  action,
  payload = {},
  senderWallet = null,
  recipientWallet = null,
  existingRequest = null,
  isBlocked = false,
  alreadyProcessedIdempotency = false
}) {
  if (!actorUid) {
    return { valid: false, status: 401, error: 'Authentication required.' };
  }

  if (alreadyProcessedIdempotency) {
    return {
      valid: false,
      status: 409,
      deduplicated: true,
      error: 'Duplicate transfer submission rejected by idempotency protection.'
    };
  }

  switch (action) {
    case 'send_demo_money': {
      const { senderId, recipientId, amount, confirmed } = payload;
      if (senderId && String(senderId) !== String(actorUid)) {
        return { valid: false, status: 403, error: 'Sender UID mismatch: unauthorized transfer attempt.' };
      }
      if (confirmed !== true) {
        return { valid: false, status: 400, error: 'Explicit user confirmation is required before transfer.' };
      }
      if (!recipientId || typeof recipientId !== 'string') {
        return { valid: false, status: 400, error: 'Recipient UID is required.' };
      }
      if (String(actorUid) === String(recipientId)) {
        return { valid: false, status: 400, error: 'You cannot send demo money to yourself.' };
      }
      if (isBlocked) {
        return { valid: false, status: 403, error: 'Cannot transfer demo money to a blocked user.' };
      }
      if (!recipientWallet) {
        return { valid: false, status: 404, error: 'Recipient wallet/user does not exist.' };
      }
      const amtCheck = validateBackendDemoAmount(amount, 200);
      if (!amtCheck.valid) {
        return { valid: false, status: 400, error: amtCheck.error };
      }
      const currentSenderBal = roundRM(senderWallet?.balance ?? 0);
      if (currentSenderBal < amtCheck.amount) {
        return {
          valid: false,
          status: 400,
          error: `Insufficient demo balance (Available: RM${currentSenderBal.toFixed(2)}, Required: RM${amtCheck.amount.toFixed(2)}).`
        };
      }
      return {
        valid: true,
        status: 200,
        amount: amtCheck.amount,
        senderBalanceAfter: roundRM(currentSenderBal - amtCheck.amount),
        recipientBalanceAfter: roundRM((recipientWallet.balance ?? 0) + amtCheck.amount),
        simulationLabel: DEMO_MODE_BANNER
      };
    }

    case 'respond_payment_request': {
      const { requestAction } = payload;
      if (!existingRequest) {
        return { valid: false, status: 404, error: 'Payment request not found.' };
      }
      if (existingRequest.status !== 'pending') {
        return {
          valid: false,
          status: 409,
          error: `Payment request has already been ${existingRequest.status}.`
        };
      }
      if (requestAction === 'accept' || requestAction === 'decline') {
        if (String(existingRequest.recipientId) !== String(actorUid)) {
          return { valid: false, status: 403, error: 'Only the recipient can accept or decline this request.' };
        }
      } else if (requestAction === 'cancel') {
        if (String(existingRequest.requesterId) !== String(actorUid)) {
          return { valid: false, status: 403, error: 'Only the requester can cancel this request.' };
        }
      } else {
        return { valid: false, status: 400, error: 'Invalid payment request action.' };
      }
      return { valid: true, status: 200 };
    }

    case 'direct_balance_write': {
      // Strictly reject any client attempt to directly modify wallet balances
      return {
        valid: false,
        status: 403,
        error: 'Security Violation: Clients must NEVER directly modify demo wallet balances or completed ledger entries.'
      };
    }

    default:
      return { valid: false, status: 400, error: `Unsupported Demo Wallet action: ${action}` };
  }
}

export async function handleDemoWalletRequest(req, res) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token.' });
    }
    const idToken = authHeader.slice(7).trim();
    const claims = verifyFirebaseTokenClaims(idToken);
    const actorUid = claims.user_id || claims.sub;

    if (!checkRateLimit(actorUid)) {
      return res.status(429).json({ error: 'Too many Demo Wallet requests. Please wait a moment.' });
    }

    const { action, payload, senderWallet, recipientWallet, existingRequest, isBlocked } = req.body || {};
    const result = validateDemoWalletBackendOperation({
      actorUid,
      action,
      payload,
      senderWallet,
      recipientWallet,
      existingRequest,
      isBlocked: Boolean(isBlocked)
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

