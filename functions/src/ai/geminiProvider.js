/**
 * KampusKash AI Provider (Legacy Gemini & Groq Adapter)
 * Delegates to groqProvider for fast LPU-powered inference while preserving backward compatibility.
 */

export {
  SUPPORTED_MODELS,
  formatGroqMessages,
  callGroqAPI,
  callGroqAPI as callAIAPI,
  callGroqAPI as callGeminiAPI,
  executeAIChat,
  generateLocalFallbackResponse
} from './groqProvider.js';
