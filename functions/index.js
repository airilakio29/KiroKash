/**
 * KampusKash Firebase Cloud Functions Entrypoint
 * Deploys chatFunction on Firebase v2 HTTPS with Secret Manager integration
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { handleAIChatRequest } from './src/ai/chatFunction.js';

// Secure Secret Manager declaration for GEMINI_API_KEY
export const geminiApiKey = defineSecret('GEMINI_API_KEY');

/**
 * KampusKash AI Chat Cloud Function
 * Exposed securely with CORS and secret injection
 */
export const chatFunction = onRequest(
  {
    cors: true,
    secrets: [geminiApiKey],
    region: 'asia-southeast1', // Singapore (low latency for Malaysia)
    maxInstances: 10
  },
  async (req, res) => {
    const key = process.env.GEMINI_API_KEY || (typeof geminiApiKey.value === 'function' ? geminiApiKey.value() : null);
    await handleAIChatRequest(req, res, { apiKey: key });
  }
);
