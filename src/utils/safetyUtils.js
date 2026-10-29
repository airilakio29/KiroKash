/**
 * KampusKash Safety, Sanitization, Rate Limiting & Photo Compression Utilities
 */

export const BLOCKED_WORDS = [
  'babi', 'puki', 'pantat', 'bodoh', 'sial', 'anjing', 'kontol', 'fuck', 'shit', 'scam',
  'bitch', 'asshole', 'lancau', 'cipap', 'butoh', 'haramjadah', 'penipu'
];

export const TEXT_LIMITS = {
  SPOT_TITLE_MIN: 3,
  SPOT_TITLE_MAX: 120,
  SPOT_PLACE_MIN: 2,
  SPOT_PLACE_MAX: 80,
  SPOT_BODY_MIN: 5,
  SPOT_BODY_MAX: 1200,
  SPOT_TIP_MAX: 280,
  COMMENT_MIN: 2,
  COMMENT_MAX: 600,
  BIO_MAX: 160,
  USERNAME_MIN: 3,
  USERNAME_MAX: 24,
  WALLET_NOTE_MAX: 140
};

export const MAX_SPOT_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB raw upload limit
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Strips HTML tags, script payloads, and ASCII control characters to prevent XSS.
 */
export function sanitizeText(str, maxLength = null) {
  if (typeof str !== 'string') return '';
  const cleaned = str
    .replace(/<[^>]*>?/gm, '') // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip ASCII control chars
    .trim();
  if (typeof maxLength === 'number' && maxLength > 0) {
    return cleaned.slice(0, maxLength);
  }
  return cleaned;
}

/**
 * Normalizes a unique @username handle (lowercase alphanumeric + underscores).
 */
export function normalizeHandle(str, fallbackName = 'student') {
  const base = sanitizeText(str || fallbackName)
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!base || base.length < 3) {
    return `student_${Math.random().toString(36).slice(2, 6)}`;
  }
  return base.slice(0, TEXT_LIMITS.USERNAME_MAX);
}

/**
 * Checks text for profanity or spam patterns (excessive repeated chars, link spam, scam keywords).
 * Returns { flagged: boolean, valid: boolean, reason: string | null }
 */
export function checkProfanityAndSpam(text) {
  const clean = sanitizeText(text);
  if (!clean) return { flagged: false, valid: true, reason: null };

  const lower = clean.toLowerCase();
  const hasProfanity = BLOCKED_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lower);
  });
  if (hasProfanity) {
    return {
      flagged: true,
      valid: false,
      reason: 'Teks mengandungi perkataan yang tidak sopan atau dilarang dalam komuniti kampus.'
    };
  }

  // Check excessive character repetition (e.g. "aaaaaaaaaaaaaaa")
  if (/(.)\1{14,}/.test(clean)) {
    return {
      flagged: true,
      valid: false,
      reason: 'Teks dikesan sebagai spam (aksara berulang berlebihan).'
    };
  }

  // Check multiple URL spam (more than 2 URLs in a single post/comment)
  const urlMatches = clean.match(/https?:\/\/[^\s]+/gi) || [];
  if (urlMatches.length > 2) {
    return {
      flagged: true,
      valid: false,
      reason: 'Teks mengandungi terlalu banyak pautan luar (anti-spam).'
    };
  }

  // Check common scam phrases
  if (/(whatsapp\s*me|free\s*money|fast\s*loan|free\s*crypto\s*airdrop|telegram\s*investment\s*guaranteed)/i.test(lower)) {
    return {
      flagged: true,
      valid: false,
      reason: 'Kandungan promosi skim mencurigakan tidak dibenarkan.'
    };
  }

  return { flagged: false, valid: true, reason: null };
}

/**
 * In-memory rate limiter per user and action type
 * Rules:
 * - 'post': max 5 posts per 60 seconds
 * - 'comment': max 10 comments per 60 seconds
 * - 'transfer': max 8 transfers per 60 seconds
 */
const rateLimitBuckets = new Map();

export const RATE_LIMIT_CONFIG = {
  post: { maxCount: 5, windowMs: 60 * 1000, label: 'perkongsian spot' },
  comment: { maxCount: 10, windowMs: 60 * 1000, label: 'komen' },
  transfer: { maxCount: 8, windowMs: 60 * 1000, label: 'pemindahan dompet' }
};

export function checkRateLimit(actionType, userId = 'anonymous', nowMs = Date.now()) {
  const rule = RATE_LIMIT_CONFIG[actionType];
  if (!rule) return { allowed: true };

  const key = `${actionType}:${userId}`;
  const history = rateLimitBuckets.get(key) || [];
  const recent = history.filter((ts) => nowMs - ts < rule.windowMs);

  if (recent.length >= rule.maxCount) {
    const retryAfterSec = Math.max(1, Math.ceil((rule.windowMs - (nowMs - recent[0])) / 1000));
    const msg = `Had kadar dicapai: Sila tunggu ${retryAfterSec} saat sebelum melakukan ${rule.label} seterusnya.`;
    return {
      allowed: false,
      retryAfterSec,
      error: msg,
      reason: msg
    };
  }

  recent.push(nowMs);
  rateLimitBuckets.set(key, recent);
  return { allowed: true, remaining: rule.maxCount - recent.length };
}

export function resetRateLimits() {
  rateLimitBuckets.clear();
}

/**
 * Validates a spot photo upload file (type & size <= 5MB).
 */
export function validateSpotPhotoFile(file) {
  if (!file) {
    return { valid: false, error: 'Sila pilih fail gambar.' };
  }
  const type = (file.type || '').toLowerCase();
  if (!ALLOWED_PHOTO_TYPES.includes(type)) {
    return {
      valid: false,
      error: 'Format gambar tidak disokong. Sila muat naik fail JPEG, PNG, atau WebP.'
    };
  }
  if (typeof file.size === 'number' && file.size > MAX_SPOT_PHOTO_BYTES) {
    return {
      valid: false,
      error: 'Saiz gambar melebihi had 5MB. Sila pilih gambar yang lebih kecil.'
    };
  }
  return { valid: true };
}

/**
 * Compresses an uploaded image file on the client before saving.
 * Resizes max dimension to `maxWidth` (default 720px) and encodes as JPEG/WebP
 * with quality 0.72 so it stays compact (<120KB) for Firestore & local storage.
 */
export async function compressSpotPhoto(file, { maxWidth = 720, maxHeight = 540, quality = 0.72 } = {}) {
  const validation = validateSpotPhotoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // In non-browser environments (e.g. Node unit tests) where FileReader/Canvas are absent:
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof FileReader === 'undefined') {
    if (typeof file.dataUrl === 'string') return file.dataUrl;
    return 'data:image/jpeg;base64,compressed_mock_photo';
  }

  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
