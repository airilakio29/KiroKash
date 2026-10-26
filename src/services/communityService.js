/**
 * KampusKash Community "Makan Murah" Service
 * 
 * Provides validated, sanitized thread management for budget student food spots,
 * supporting both live Firebase Firestore persistence and in-memory demo datasets.
 */

export const COMMUNITY_TAGS = [
  { id: 'bawah-rm10', label: 'Bawah RM10', iconName: 'Banknote', color: '#10B981' },
  { id: 'halal', label: 'Halal Certified', iconName: 'ShieldCheck', color: '#059669' },
  { id: 'student-deal', label: 'Diskaun Pelajar', iconName: 'GraduationCap', color: '#6366F1' },
  { id: 'buka-lewat', label: 'Buka Lewat (12AM+)', iconName: 'Moon', color: '#8B5CF6' },
  { id: 'wifi-plug', label: 'Wi-Fi & Plug', iconName: 'Wifi', color: '#06B6D4' },
  { id: 'porsi-besar', label: 'Porsi Kenyang', iconName: 'Utensils', color: '#F59E0B' },
  { id: 'aircond', label: 'Berhawa Dingin', iconName: 'Wind', color: '#3B82F6' },
  { id: 'mamak', label: 'Mamak Vibes', iconName: 'Coffee', color: '#EC4899' },
  { id: 'vegetarian', label: 'Vegetarian', iconName: 'Leaf', color: '#14B8A6' }
];

export const CAMPUS_OPTIONS = [
  { id: 'all', label: 'Semua Kampus (Malaysia)' },
  { id: 'utp', label: 'Universiti Teknologi PETRONAS (UTP)' },
  { id: 'um', label: 'Universiti Malaya (UM)' },
  { id: 'uitm', label: 'Universiti Teknologi MARA (UiTM)' },
  { id: 'ukm', label: 'Universiti Kebangsaan Malaysia (UKM)' },
  { id: 'usm', label: 'Universiti Sains Malaysia (USM)' },
  { id: 'utm', label: 'Universiti Teknologi Malaysia (UTM)' },
  { id: 'upm', label: 'Universiti Putra Malaysia (UPM)' },
  { id: 'iium', label: 'International Islamic University (IIUM)' },
  { id: 'tarc', label: 'TAR UMT' },
  { id: 'other', label: 'Lain-lain / Kolej Swasta' }
];

const BLOCKED_WORDS = [
  'babi', 'puki', 'pantat', 'bodoh', 'sial', 'anjing', 'kontol', 'fuck', 'shit', 'scam'
];

/**
 * Strips HTML tags and control characters to prevent XSS and formatting issues.
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip ASCII control chars
    .trim();
}

/**
 * Validates a new or updated community thread submission.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateThreadInput(data = {}) {
  const errors = [];

  const placeName = sanitizeText(data.placeName);
  if (!placeName || placeName.length < 2) {
    errors.push('Nama kedai / kafe mesti sekurang-kurangnya 2 aksara.');
  } else if (placeName.length > 80) {
    errors.push('Nama kedai tidak boleh melebihi 80 aksara.');
  }

  const title = sanitizeText(data.title);
  if (!title || title.length < 3) {
    errors.push('Tajuk thread mesti sekurang-kurangnya 3 aksara.');
  } else if (title.length > 120) {
    errors.push('Tajuk thread tidak boleh melebihi 120 aksara.');
  }

  const body = sanitizeText(data.body);
  if (!body || body.length < 5) {
    errors.push('Ulasan atau deskripsi mesti sekurang-kurangnya 5 aksara.');
  } else if (body.length > 1200) {
    errors.push('Ulasan tidak boleh melebihi 1200 aksara.');
  }

  const price = Number(data.pricePerMeal);
  if (isNaN(price) || price < 0) {
    errors.push('Anggaran harga per hidangan (RM) mestilah nombor positif.');
  } else if (price > 200) {
    errors.push('Anggaran harga melebihi RM200 (fokus kepada makanan bajet pelajar).');
  }

  const rating = Number(data.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push('Rating mestilah antara 1 hingga 5 bintang.');
  }

  const campus = (data.campus || 'all').trim();
  if (!campus) {
    errors.push('Sila pilih kampus atau lokasi berkaitan.');
  }

  // Check profanity
  const combinedText = `${title} ${body} ${placeName}`.toLowerCase();
  const containsProfanity = BLOCKED_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(combinedText);
  });
  if (containsProfanity) {
    errors.push('Teks mengandungi perkataan yang tidak sopan atau dilarang dalam komuniti kampus.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Pure filtering & sorting function for community threads.
 * Used for both live Firestore cached arrays and in-memory demo datasets.
 */
export function filterAndSortThreads(threads = [], options = {}) {
  if (!Array.isArray(threads)) return [];

  const {
    campus = 'all',
    maxPrice = null,
    selectedTags = [],
    sort = 'newest',
    searchQuery = ''
  } = options;

  let filtered = threads.filter(t => {
    if (t.status === 'hidden') return false;

    // Campus filter
    if (campus && campus !== 'all') {
      if (t.campus && t.campus.toLowerCase() !== campus.toLowerCase()) {
        return false;
      }
    }

    // Price filter
    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
      const limit = Number(maxPrice);
      if (!isNaN(limit) && limit > 0) {
        if (Number(t.pricePerMeal) > limit) return false;
      }
    }

    // Tags filter (AND condition: must include all selected tags)
    if (Array.isArray(selectedTags) && selectedTags.length > 0) {
      const threadTags = Array.isArray(t.tags) ? t.tags : [];
      const hasAll = selectedTags.every(st => threadTags.includes(st));
      if (!hasAll) return false;
    }

    // Search query (matches placeName, title, body, campus)
    if (searchQuery && typeof searchQuery === 'string') {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const p = (t.placeName || '').toLowerCase();
        const tit = (t.title || '').toLowerCase();
        const b = (t.body || '').toLowerCase();
        const c = (t.campus || '').toLowerCase();
        if (!p.includes(q) && !tit.includes(q) && !b.includes(q) && !c.includes(q)) {
          return false;
        }
      }
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sort === 'cheapest') {
      const diff = Number(a.pricePerMeal || 0) - Number(b.pricePerMeal || 0);
      if (diff !== 0) return diff;
      return (b.upvoteCount || 0) - (a.upvoteCount || 0);
    }
    if (sort === 'top') {
      const diff = (b.upvoteCount || 0) - (a.upvoteCount || 0);
      if (diff !== 0) return diff;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    }
    // Default 'newest'
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return filtered;
}

/**
 * Creates a clean thread object formatted for persistence
 */
export function buildThreadPayload(user, inputData) {
  const validation = validateThreadInput(inputData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const now = new Date().toISOString();
  return {
    authorId: user?.id || user?.uid || 'anonymous',
    authorName: user?.username || user?.displayName || 'Student',
    authorAvatar: user?.avatar || '🎓',
    authorUniversity: user?.university || 'Campus Student',
    campus: inputData.campus || 'all',
    placeName: sanitizeText(inputData.placeName),
    title: sanitizeText(inputData.title),
    body: sanitizeText(inputData.body),
    pricePerMeal: Number(Number(inputData.pricePerMeal).toFixed(2)),
    rating: Number(inputData.rating) || 5,
    tags: Array.isArray(inputData.tags) ? inputData.tags : [],
    osmPlaceId: inputData.osmPlaceId || null,
    address: inputData.address ? sanitizeText(inputData.address) : null,
    lat: typeof inputData.lat === 'number' ? inputData.lat : null,
    lng: typeof inputData.lng === 'number' ? inputData.lng : null,
    upvoteCount: 0,
    replyCount: 0,
    reportCount: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
}

import { 
  db, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  where 
} from '../firebase.js';
import { increment } from 'firebase/firestore';

/**
 * Validates a reply to a community thread.
 */
export function validateReplyInput(replyText) {
  const errors = [];
  const clean = sanitizeText(replyText);
  if (!clean || clean.length < 2) {
    errors.push('Komen mestilah sekurang-kurangnya 2 aksara.');
  } else if (clean.length > 600) {
    errors.push('Komen tidak boleh melebihi 600 aksara.');
  }

  const containsProfanity = BLOCKED_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(clean.toLowerCase());
  });
  if (containsProfanity) {
    errors.push('Teks mengandungi perkataan yang tidak sopan.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Builds a validated reply payload.
 */
export function buildReplyPayload(user, replyText) {
  const val = validateReplyInput(replyText);
  if (!val.valid) {
    throw new Error(val.errors.join(' '));
  }
  return {
    authorId: user?.id || user?.uid || 'anonymous',
    authorName: user?.username || user?.displayName || 'Student',
    authorAvatar: user?.avatar || '🎓',
    authorUniversity: user?.university || 'Campus Student',
    body: sanitizeText(replyText),
    createdAt: new Date().toISOString()
  };
}

/**
 * Subscribes to active community threads from live Firestore.
 */
export function subscribeToCommunityThreads(onUpdate, onError) {
  if (!db) {
    if (onError) onError(new Error('Firestore is not configured.'));
    return () => {};
  }
  const threadsRef = collection(db, 'communityThreads');
  const q = query(threadsRef, where('status', '==', 'active'));
  return onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach(docSnap => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (onUpdate) onUpdate(items);
  }, (err) => {
    console.error('Error listening to community threads:', err);
    if (onError) onError(err);
  });
}

/**
 * Creates a new community thread in Firestore.
 */
export async function createFirestoreCommunityThread(user, inputData) {
  if (!db) throw new Error('Firestore is not configured.');
  const payload = buildThreadPayload(user, inputData);
  const docRef = await addDoc(collection(db, 'communityThreads'), payload);
  return { id: docRef.id, ...payload };
}

/**
 * Toggles an upvote on a community thread.
 */
export async function toggleFirestoreCommunityVote(threadId, userId) {
  if (!db || !userId) return false;
  const voteDocRef = doc(db, 'communityThreads', threadId, 'votes', userId);
  const threadRef = doc(db, 'communityThreads', threadId);
  const snap = await getDoc(voteDocRef);
  if (snap.exists()) {
    await deleteDoc(voteDocRef);
    await updateDoc(threadRef, { upvoteCount: increment(-1) });
    return false; // unvoted
  } else {
    await setDoc(voteDocRef, { createdAt: new Date().toISOString() });
    await updateDoc(threadRef, { upvoteCount: increment(1) });
    return true; // voted
  }
}

/**
 * Adds a reply to a thread in Firestore.
 */
export async function addFirestoreCommunityReply(threadId, user, replyText) {
  if (!db) throw new Error('Firestore is not configured.');
  const payload = buildReplyPayload(user, replyText);
  const repliesRef = collection(db, 'communityThreads', threadId, 'replies');
  const replyDoc = await addDoc(repliesRef, payload);
  const threadRef = doc(db, 'communityThreads', threadId);
  await updateDoc(threadRef, { replyCount: increment(1) });
  return { id: replyDoc.id, ...payload };
}

/**
 * Subscribes to replies for a single community thread.
 */
export function subscribeToCommunityReplies(threadId, onUpdate, onError) {
  if (!db || !threadId) return () => {};
  const repliesRef = collection(db, 'communityThreads', threadId, 'replies');
  return onSnapshot(repliesRef, (snapshot) => {
    const items = [];
    snapshot.forEach(docSnap => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });
    items.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    if (onUpdate) onUpdate(items);
  }, onError);
}

/**
 * Reports a community thread for moderation review.
 */
export async function reportFirestoreCommunityThread(threadId, user, reason) {
  if (!db) throw new Error('Firestore is not configured.');
  const reportPayload = {
    threadId,
    reporterId: user?.id || user?.uid || 'anonymous',
    reporterName: user?.username || 'Student',
    reason: sanitizeText(reason || 'Reported by user'),
    createdAt: new Date().toISOString()
  };
  await addDoc(collection(db, 'communityReports'), reportPayload);
  const threadRef = doc(db, 'communityThreads', threadId);
  await updateDoc(threadRef, { reportCount: increment(1) });
  return true;
}
