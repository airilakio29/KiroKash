/**
 * KampusKash "Spot Jimat" (formerly Makan Murah) Community Spots Service
 *
 * Provides validated, sanitized student spot management across 6 categories
 * (Makan, Thrift & Bundles, Activities & Sports, Study Spots, Services, Free Events & Promos),
 * automatic non-destructive migration of legacy Makan Murah posts into category "makan",
 * likes, comments, bookmarks/saves, edit/delete for owners, reporting, and filtering/sorting.
 */

import {
  SPOT_CATEGORIES,
  SPOT_BUDGET_TAGS,
  getBudgetTagForPrice
} from '../config/appConstants.js';
import {
  sanitizeText,
  normalizeHandle,
  checkProfanityAndSpam,
  checkRateLimit,
  validateSpotPhotoFile,
  compressSpotPhoto,
  BLOCKED_WORDS
} from '../utils/safetyUtils.js';
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
  where,
  increment
} from '../firebase.js';

export {
  sanitizeText,
  validateSpotPhotoFile,
  compressSpotPhoto,
  SPOT_CATEGORIES,
  SPOT_BUDGET_TAGS,
  getBudgetTagForPrice
};

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
  { id: 'all', label: 'Semua Kampus (Malaysia)', lat: 4.3857, lng: 100.9797 },
  { id: 'utp', label: 'Universiti Teknologi PETRONAS (UTP)', lat: 4.3857, lng: 100.9797 },
  { id: 'um', label: 'Universiti Malaya (UM)', lat: 3.1209, lng: 101.6538 },
  { id: 'uitm', label: 'Universiti Teknologi MARA (UiTM)', lat: 3.0698, lng: 101.5037 },
  { id: 'ukm', label: 'Universiti Kebangsaan Malaysia (UKM)', lat: 2.9300, lng: 101.7774 },
  { id: 'usm', label: 'Universiti Sains Malaysia (USM)', lat: 5.3569, lng: 100.3014 },
  { id: 'utm', label: 'Universiti Teknologi Malaysia (UTM)', lat: 1.5584, lng: 103.6380 },
  { id: 'upm', label: 'Universiti Putra Malaysia (UPM)', lat: 2.9992, lng: 101.7078 },
  { id: 'iium', label: 'International Islamic University (IIUM)', lat: 3.2505, lng: 101.7346 },
  { id: 'tarc', label: 'TAR UMT', lat: 3.2162, lng: 101.7290 },
  { id: 'other', label: 'Lain-lain / Kolej Swasta', lat: 4.5975, lng: 101.0901 }
];

export const CAMPUS_AREAS = CAMPUS_OPTIONS.filter((c) => c.id !== 'all').map((c) => c.label);

export const DEFAULT_CAMPUS_COORDS = { lat: 4.3857, lng: 100.9797 }; // Seri Iskandar / Ipoh region

/**
 * Calculates Haversine distance in kilometers between two coordinates.
 */
export function calculateHaversineDistanceKm(lat1, lng1, lat2, lng2) {
  if (
    typeof lat1 !== 'number' || typeof lng1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lng2 !== 'number' ||
    isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)
  ) {
    return null;
  }
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Migrates any existing Makan Murah thread into the new Spot Jimat post schema
 * under category 'makan' without losing any existing fields or data.
 */
export function migrateLegacyThreadToSpot(raw = {}) {
  if (!raw || typeof raw !== 'object') return raw;

  const validCategoryIds = SPOT_CATEGORIES.map((c) => c.id);
  const category = validCategoryIds.includes(raw.category) ? raw.category : 'makan';

  const pricePerMeal = typeof raw.pricePerMeal === 'number'
    ? raw.pricePerMeal
    : (typeof raw.price === 'number' ? raw.price : Number(raw.pricePerMeal || raw.price || 0));

  const budgetTag = raw.budgetTag || getBudgetTagForPrice(pricePerMeal);
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const studentPrice = typeof raw.studentPrice === 'boolean'
    ? raw.studentPrice
    : tags.includes('student-deal');

  const body = raw.body || raw.shortTip || '';
  const shortTip = raw.shortTip || (body.length > 140 ? `${body.slice(0, 137)}...` : body);

  // Resolve coordinates from raw or campus fallback so Nearest sort always works
  const campusMeta = CAMPUS_OPTIONS.find((c) => c.id === (raw.campus || 'all')) || CAMPUS_OPTIONS[0];
  const lat = typeof raw.lat === 'number' ? raw.lat : (raw.location?.lat ?? campusMeta.lat);
  const lng = typeof raw.lng === 'number' ? raw.lng : (raw.location?.lng ?? campusMeta.lng);
  const mapLink = raw.mapLink || raw.location?.mapLink || null;
  const address = raw.address || raw.location?.address || null;

  const upvoteCount = Number(raw.upvoteCount ?? raw.likeCount ?? 0);
  const replyCount = Number(raw.replyCount ?? raw.commentCount ?? (Array.isArray(raw.replies) ? raw.replies.length : 0));
  const saveCount = Number(raw.saveCount ?? 0);

  return {
    ...raw,
    placeName: raw.placeName || raw.stallName || 'Kedai Kampus',
    category,
    pricePerMeal,
    price: pricePerMeal,
    priceRange: raw.priceRange || (pricePerMeal === 0 ? 'Free' : `RM${pricePerMeal.toFixed(2)}`),
    budgetTag,
    shortTip,
    body,
    studentPrice,
    photoUrl: raw.photoUrl || null,
    mapLink,
    address,
    lat,
    lng,
    location: {
      address,
      mapLink,
      lat,
      lng,
      campus: raw.campus || 'all'
    },
    authorUsername: raw.authorUsername || normalizeHandle(raw.authorName || 'student'),
    replies: Array.isArray(raw.replies) ? raw.replies : [],
    upvoteCount,
    likeCount: upvoteCount,
    replyCount,
    commentCount: replyCount,
    saveCount,
    migratedFromMakanMurah: !raw.category
  };
}

/**
 * Generates legacy Makan Murah posts for backwards-compatibility migration testing and offline fallback.
 */
export function generateInitialCommunityThreads() {
  const now = Date.now();
  return [
    {
      id: 'legacy_makan_1',
      authorId: 'user_aiman',
      authorName: 'Aiman Hakimi',
      stallName: 'Nasi Ekonomi Makcik V4',
      title: 'Nasi + Ayam Goreng + Sayur RM4.50 je!',
      body: 'Port wajib hujung bulan dekat V4 UTP. Ambil kuah kari banjir memang kenyang sampai malam.',
      pricePerMeal: 4.50,
      campus: 'utp',
      rating: 5,
      tags: ['halal', 'nasi-campur', 'student-deal'],
      upvoteCount: 24,
      replies: [{ id: 'r1', authorName: 'Zul', body: 'Memang padu!' }],
      createdAt: new Date(now - 3600000 * 12).toISOString()
    },
    {
      id: 'legacy_makan_2',
      authorId: 'user_sarah',
      authorName: 'Sarah Liyana',
      stallName: 'Gerai Kak Pah KK12',
      title: 'Nasi Ayam Gepuk Padu RM6.00 (Free Air Sirap)',
      body: 'Sambal dia memang pedas berapi, boleh minta tambah kobis goreng percuma.',
      pricePerMeal: 6.00,
      campus: 'um',
      rating: 5,
      tags: ['halal', 'pedas', 'free-refill'],
      upvoteCount: 19,
      replies: [],
      createdAt: new Date(now - 3600000 * 20).toISOString()
    },
    {
      id: 'legacy_makan_3',
      authorId: 'user_weijian',
      authorName: 'Tan Wei Jian',
      stallName: 'Uncle Lim Mixed Rice',
      title: '2 Sayur + 1 Telur RM4.00 tepi Gate B TAR UMT',
      body: 'Tunjuk kad matriks dapat diskaun 50 sen dan teh cina suam percuma.',
      pricePerMeal: 4.00,
      campus: 'tarc',
      rating: 4,
      tags: ['nasi-campur', 'vegetarian', 'student-deal'],
      upvoteCount: 15,
      replies: [],
      createdAt: new Date(now - 3600000 * 28).toISOString()
    },
    {
      id: 'legacy_makan_4',
      authorId: 'user_priya',
      authorName: 'Priya Nair',
      stallName: 'Restoran Al-Malik 24 Jam',
      title: 'Roti Canai + Teh O Ais RM3.20 port study lewat malam',
      body: 'Buka 24 jam, ada plug tepi meja dan Wi-Fi laju untuk buat assignment.',
      pricePerMeal: 3.20,
      campus: 'usm',
      rating: 5,
      tags: ['halal', 'mamak-24h', 'wifi-study'],
      upvoteCount: 31,
      replies: [],
      createdAt: new Date(now - 3600000 * 36).toISOString()
    },
    {
      id: 'legacy_makan_5',
      authorId: 'user_danish',
      authorName: 'Danish Irfan',
      stallName: 'Kafe Kolej Mawar',
      title: 'Set Makan Tengahari Bajet RM5.00 siap buah potong',
      body: 'Lauk masak lemak cili api dia memang rasa macam masakan rumah.',
      pricePerMeal: 5.00,
      campus: 'uitm',
      rating: 5,
      tags: ['halal', 'nasi-campur', 'portion-besar'],
      upvoteCount: 18,
      replies: [],
      createdAt: new Date(now - 3600000 * 48).toISOString()
    },
    {
      id: 'legacy_makan_6',
      authorId: 'user_amirul',
      authorName: 'Amirul Haziq',
      stallName: 'Mee Tarik Warisan Kampus',
      title: 'Mee Tarik Sup Daging RM7.50 lepas diskaun pelajar',
      body: 'Mee tarik handmade segar, sup reneh 6 jam dan boleh tambah cili minyak free.',
      pricePerMeal: 7.50,
      campus: 'ukm',
      rating: 4,
      tags: ['halal', 'student-deal', 'portion-besar'],
      upvoteCount: 14,
      replies: [],
      createdAt: new Date(now - 3600000 * 60).toISOString()
    }
  ];
}

/**
 * Batch migrates an array of legacy Makan Murah posts into Spot Jimat posts.
 */
export function migrateExistingMakanMurahPosts(posts = []) {
  if (!Array.isArray(posts)) return [];
  return posts.map(migrateLegacyThreadToSpot);
}

/**
 * Validates a new or updated community thread / Spot Jimat post submission.
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

  const bodyText = sanitizeText(data.body || data.shortTip);
  if (!bodyText || bodyText.length < 5) {
    errors.push('Ulasan atau deskripsi mesti sekurang-kurangnya 5 aksara.');
  } else if (bodyText.length > 1200) {
    errors.push('Ulasan tidak boleh melebihi 1200 aksara.');
  }

  const rawPrice = data.pricePerMeal !== undefined ? data.pricePerMeal : data.price;
  const price = Number(rawPrice);
  if (isNaN(price) || price < 0) {
    errors.push('Anggaran harga per hidangan (RM) mestilah nombor positif.');
  } else if (price > 200) {
    errors.push('Anggaran harga melebihi RM200 (fokus kepada makanan bajet pelajar).');
  }

  const rating = data.rating !== undefined ? Number(data.rating) : 5;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push('Rating mestilah antara 1 hingga 5 bintang.');
  }

  const campus = (data.campus || 'all').trim();
  if (!campus) {
    errors.push('Sila pilih kampus atau lokasi berkaitan.');
  }

  if (data.category !== undefined) {
    const validCats = SPOT_CATEGORIES.map((c) => c.id);
    if (!validCats.includes(data.category)) {
      errors.push('Kategori spot tidak sah.');
    }
  }

  // Check profanity & spam
  const combinedText = `${title} ${bodyText} ${placeName} ${sanitizeText(data.shortTip || '')}`;
  const check = checkProfanityAndSpam(combinedText);
  if (check.flagged) {
    errors.push(check.reason);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const validateSpotInput = validateThreadInput;

/**
 * Pure filtering & sorting function for Spot Jimat posts & legacy threads.
 * Supports:
 * - feedTab: 'explore' | 'following' | 'saved'
 * - category: 'all' | 'makan' | 'thrift' | 'activities' | 'study' | 'services' | 'events'
 * - budgetTag: 'all' | 'under-rm5' | 'rm5-15' | 'rm15-30' | 'rm30-plus'
 * - maxPrice: numeric limit (kept for backward compatibility)
 * - studentPriceOnly: boolean
 * - sort: 'trending' | 'newest' | 'nearest' | 'cheapest' | 'top'
 * - userLocation: { lat, lng } for 'nearest' sort
 */
export function filterAndSortThreads(threads = [], options = {}) {
  if (!Array.isArray(threads)) return [];

  const {
    campus = 'all',
    category = 'all',
    budgetTag = 'all',
    maxPrice = null,
    studentPriceOnly = false,
    selectedTags = [],
    sort: rawSort,
    sortBy,
    searchQuery = '',
    feedTab = 'explore',
    followingIds = null,
    savedSpotIds = null,
    blockedUserIds = null,
    userLocation = null,
    userCoords = null
  } = options;
  const sort = rawSort || sortBy || 'newest';
  const resolvedLocation = userLocation || userCoords || null;

  const blockedSet = blockedUserIds instanceof Set
    ? blockedUserIds
    : (Array.isArray(blockedUserIds) ? new Set(blockedUserIds) : new Set());

  const followingSet = followingIds instanceof Set
    ? followingIds
    : (Array.isArray(followingIds) ? new Set(followingIds) : null);

  const savedSet = savedSpotIds instanceof Set
    ? savedSpotIds
    : (Array.isArray(savedSpotIds) ? new Set(savedSpotIds) : null);

  let filtered = threads.filter((rawItem) => {
    if (!rawItem || rawItem.status === 'hidden') return false;
    if (rawItem.authorId && blockedSet.has(rawItem.authorId)) return false;

    const t = migrateLegacyThreadToSpot(rawItem);

    // Feed tab filter (Explore vs Following vs Saved)
    if (feedTab === 'following' && followingSet) {
      if (!followingSet.has(t.authorId)) return false;
    }
    if (feedTab === 'saved' && savedSet) {
      if (!savedSet.has(t.id)) return false;
    }

    // Category filter
    if (category && category !== 'all') {
      if ((t.category || 'makan') !== category) return false;
    }

    // Campus filter
    if (campus && campus !== 'all') {
      if (t.campus && t.campus.toLowerCase() !== campus.toLowerCase()) {
        return false;
      }
    }

    // Budget tag filter
    if (budgetTag && budgetTag !== 'all') {
      const resolvedBudgetTag = t.budgetTag || getBudgetTagForPrice(t.pricePerMeal);
      if (resolvedBudgetTag !== budgetTag) return false;
    }

    // Legacy maxPrice filter
    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
      const limit = Number(maxPrice);
      if (!isNaN(limit) && limit > 0) {
        if (Number(t.pricePerMeal) > limit) return false;
      }
    }

    // Student price filter
    if (studentPriceOnly && !t.studentPrice) {
      return false;
    }

    // Tags filter (AND condition: must include all selected tags)
    if (Array.isArray(selectedTags) && selectedTags.length > 0) {
      const threadTags = Array.isArray(t.tags) ? t.tags : [];
      const hasAll = selectedTags.every((st) => threadTags.includes(st));
      if (!hasAll) return false;
    }

    // Search query (matches placeName, title, body, shortTip, campus, category, authorName)
    if (searchQuery && typeof searchQuery === 'string') {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const p = (t.placeName || '').toLowerCase();
        const tit = (t.title || '').toLowerCase();
        const b = (t.body || '').toLowerCase();
        const tip = (t.shortTip || '').toLowerCase();
        const c = (t.campus || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const authName = (t.authorName || '').toLowerCase();
        const addr = (t.address || '').toLowerCase();
        if (
          !p.includes(q) &&
          !tit.includes(q) &&
          !b.includes(q) &&
          !tip.includes(q) &&
          !c.includes(q) &&
          !cat.includes(q) &&
          !authName.includes(q) &&
          !addr.includes(q)
        ) {
          return false;
        }
      }
    }

    return true;
  });

  // Compute distance if userLocation or nearest sort is active
  const refCoords = resolvedLocation && typeof resolvedLocation.lat === 'number' && typeof resolvedLocation.lng === 'number'
    ? resolvedLocation
    : DEFAULT_CAMPUS_COORDS;

  if (sort === 'nearest' || resolvedLocation) {
    filtered = filtered.map((item) => {
      const norm = migrateLegacyThreadToSpot(item);
      const distanceKm = calculateHaversineDistanceKm(refCoords.lat, refCoords.lng, norm.lat, norm.lng);
      return {
        ...item,
        distanceKm: distanceKm ?? 99999
      };
    });
  }

  const nowMs = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
    if (sort === 'trending') {
      const ageA = Math.max(0, nowMs - new Date(a.createdAt || 0).getTime());
      const ageB = Math.max(0, nowMs - new Date(b.createdAt || 0).getTime());
      const isThisWeekA = ageA <= ONE_WEEK_MS ? 25 : 0;
      const isThisWeekB = ageB <= ONE_WEEK_MS ? 25 : 0;
      const scoreA = isThisWeekA + (a.upvoteCount || a.likeCount || 0) * 2 + (a.replyCount || a.commentCount || 0) * 3 + (a.saveCount || 0) * 2;
      const scoreB = isThisWeekB + (b.upvoteCount || b.likeCount || 0) * 2 + (b.replyCount || b.commentCount || 0) * 3 + (b.saveCount || 0) * 2;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sort === 'nearest') {
      const normA = migrateLegacyThreadToSpot(a);
      const normB = migrateLegacyThreadToSpot(b);
      const distA = calculateHaversineDistanceKm(refCoords.lat, refCoords.lng, normA.lat, normA.lng) ?? 99999;
      const distB = calculateHaversineDistanceKm(refCoords.lat, refCoords.lng, normB.lat, normB.lng) ?? 99999;
      if (distA !== distB) return distA - distB;
      return (b.upvoteCount || 0) - (a.upvoteCount || 0);
    }
    // Default 'newest'
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return filtered;
}

/**
 * Creates a clean Spot Jimat / thread object formatted for persistence.
 */
export function buildThreadPayload(user, inputData) {
  const validation = validateThreadInput(inputData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const now = new Date().toISOString();
  const priceNum = Number(Number(inputData.pricePerMeal ?? inputData.price ?? 0).toFixed(2));
  const validCatIds = SPOT_CATEGORIES.map((c) => c.id);
  const category = validCatIds.includes(inputData.category) ? inputData.category : 'makan';
  const budgetTag = inputData.budgetTag || getBudgetTagForPrice(priceNum);

  const tags = Array.isArray(inputData.tags) ? [...inputData.tags] : [];
  const studentPrice = Boolean(inputData.studentPrice || tags.includes('student-deal'));
  if (studentPrice && !tags.includes('student-deal')) {
    tags.push('student-deal');
  }

  const cleanBody = sanitizeText(inputData.body || inputData.shortTip);
  const cleanShortTip = sanitizeText(inputData.shortTip || cleanBody).slice(0, 280);
  const campus = inputData.campus || 'all';
  const campusMeta = CAMPUS_OPTIONS.find((c) => c.id === campus) || CAMPUS_OPTIONS[0];
  const lat = typeof inputData.lat === 'number' && !isNaN(inputData.lat) ? inputData.lat : campusMeta.lat;
  const lng = typeof inputData.lng === 'number' && !isNaN(inputData.lng) ? inputData.lng : campusMeta.lng;
  const mapLink = inputData.mapLink ? sanitizeText(inputData.mapLink) : null;
  const address = inputData.address ? sanitizeText(inputData.address) : null;

  return {
    authorId: user?.id || user?.uid || 'anonymous',
    authorName: user?.username || user?.displayName || 'Student',
    authorUsername: user?.handle || normalizeHandle(user?.username || user?.displayName || 'student'),
    authorAvatar: user?.avatar || '🎓',
    authorUniversity: user?.university || 'Campus Student',
    category,
    campus,
    placeName: sanitizeText(inputData.placeName),
    title: sanitizeText(inputData.title),
    body: cleanBody,
    shortTip: cleanShortTip,
    pricePerMeal: priceNum,
    price: priceNum,
    priceRange: inputData.priceRange ? sanitizeText(inputData.priceRange) : (priceNum === 0 ? 'Free' : `RM${priceNum.toFixed(2)}`),
    budgetTag,
    studentPrice,
    photoUrl: inputData.photoUrl || null,
    rating: Number(inputData.rating) || 5,
    tags,
    osmPlaceId: inputData.osmPlaceId || null,
    address,
    mapLink,
    lat,
    lng,
    location: {
      address,
      mapLink,
      lat,
      lng,
      campus
    },
    upvoteCount: 0,
    likeCount: 0,
    replyCount: 0,
    commentCount: 0,
    saveCount: 0,
    reportCount: 0,
    status: 'active',
    isPitchDemo: Boolean(inputData.isPitchDemo),
    createdAt: now,
    updatedAt: now
  };
}

export const buildSpotPayload = buildThreadPayload;
export const createThreadObject = buildThreadPayload;

/**
 * Validates a reply / comment to a community spot.
 */
export function validateReplyInput(replyText) {
  const errors = [];
  const clean = sanitizeText(replyText);
  if (!clean || clean.length < 2) {
    errors.push('Komen mestilah sekurang-kurangnya 2 aksara.');
  } else if (clean.length > 600) {
    errors.push('Komen tidak boleh melebihi 600 aksara.');
  }

  const check = checkProfanityAndSpam(clean);
  if (check.flagged) {
    errors.push('Teks mengandungi perkataan yang tidak sopan.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Builds a validated reply / comment payload.
 */
export function buildReplyPayload(user, replyText) {
  const val = validateReplyInput(replyText);
  if (!val.valid) {
    throw new Error(val.errors.join(' '));
  }
  return {
    authorId: user?.id || user?.uid || 'anonymous',
    authorName: user?.username || user?.displayName || 'Student',
    authorUsername: user?.handle || normalizeHandle(user?.username || user?.displayName || 'student'),
    authorAvatar: user?.avatar || '🎓',
    authorUniversity: user?.university || 'Campus Student',
    body: sanitizeText(replyText),
    createdAt: new Date().toISOString()
  };
}

export const createReplyObject = buildReplyPayload;

/**
 * Subscribes to active community spots/threads from live Firestore,
 * automatically running non-destructive Makan Murah -> Spot Jimat migration on each record.
 */
export function subscribeToCommunityThreads(onUpdate, onError) {
  if (!db) {
    if (onError) onError(new Error('Firestore is not configured.'));
    return () => {};
  }
  const threadsRef = collection(db, 'communityThreads');
  const q = query(threadsRef, where('status', '==', 'active'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        const raw = { id: docSnap.id, ...docSnap.data() };
        items.push(migrateLegacyThreadToSpot(raw));
      });
      if (onUpdate) onUpdate(items);
    },
    (err) => {
      console.error('Error listening to community threads:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches active community spots/threads from Firestore once, migrating legacy Makan Murah posts.
 */
export async function fetchFirestoreCommunityThreads() {
  if (!db) return null;
  try {
    const threadsRef = collection(db, 'communityThreads');
    const q = query(threadsRef, where('status', '==', 'active'));
    const snap = await getDocs(q);
    const items = [];
    snap.forEach((docSnap) => {
      items.push(migrateLegacyThreadToSpot({ id: docSnap.id, ...docSnap.data() }));
    });
    return items;
  } catch {
    return null;
  }
}

/**
 * Creates a new Spot Jimat post in Firestore with rate-limit protection.
 */
export async function createFirestoreCommunityThread(user, inputData) {
  const userId = user?.id || user?.uid || 'anonymous';
  const rate = checkRateLimit('post', userId);
  if (!rate.allowed) {
    throw new Error(rate.error);
  }
  if (!db) throw new Error('Firestore is not configured.');
  const payload = buildThreadPayload(user, inputData);
  const docRef = await addDoc(collection(db, 'communityThreads'), payload);
  return { id: docRef.id, ...payload };
}

/**
 * Updates an existing Spot Jimat post (Owner only).
 */
export async function updateFirestoreCommunityThread(threadId, user, updates) {
  if (!db) throw new Error('Firestore is not configured.');
  const userId = user?.id || user?.uid;
  if (!userId) throw new Error('Authentication required.');

  const threadRef = doc(db, 'communityThreads', threadId);
  const snap = await getDoc(threadRef);
  if (!snap.exists()) throw new Error('Spot tidak dijumpai.');
  if (snap.data().authorId !== userId) {
    throw new Error('Hanya pemilik asal boleh mengemas kini spot ini.');
  }

  const mergedInput = { ...snap.data(), ...updates };
  const val = validateThreadInput(mergedInput);
  if (!val.valid) {
    throw new Error(val.errors.join(' '));
  }

  const priceNum = Number(Number(mergedInput.pricePerMeal ?? mergedInput.price ?? 0).toFixed(2));
  const cleanUpdates = {
    title: sanitizeText(mergedInput.title),
    placeName: sanitizeText(mergedInput.placeName),
    category: mergedInput.category || 'makan',
    body: sanitizeText(mergedInput.body || mergedInput.shortTip),
    shortTip: sanitizeText(mergedInput.shortTip || mergedInput.body).slice(0, 280),
    pricePerMeal: priceNum,
    price: priceNum,
    priceRange: mergedInput.priceRange ? sanitizeText(mergedInput.priceRange) : (priceNum === 0 ? 'Free' : `RM${priceNum.toFixed(2)}`),
    budgetTag: mergedInput.budgetTag || getBudgetTagForPrice(priceNum),
    studentPrice: Boolean(mergedInput.studentPrice),
    photoUrl: mergedInput.photoUrl !== undefined ? mergedInput.photoUrl : snap.data().photoUrl,
    campus: mergedInput.campus || 'all',
    address: mergedInput.address ? sanitizeText(mergedInput.address) : null,
    mapLink: mergedInput.mapLink ? sanitizeText(mergedInput.mapLink) : null,
    rating: Number(mergedInput.rating) || 5,
    tags: Array.isArray(mergedInput.tags) ? mergedInput.tags : [],
    updatedAt: new Date().toISOString()
  };

  await updateDoc(threadRef, cleanUpdates);
  return { id: threadId, ...snap.data(), ...cleanUpdates };
}

/**
 * Deletes a Spot Jimat post (Owner only).
 */
export async function deleteFirestoreCommunityThread(threadId, user) {
  if (!db) throw new Error('Firestore is not configured.');
  const userId = user?.id || user?.uid;
  if (!userId) throw new Error('Authentication required.');

  const threadRef = doc(db, 'communityThreads', threadId);
  const snap = await getDoc(threadRef);
  if (!snap.exists()) return true;
  if (snap.data().authorId !== userId) {
    throw new Error('Hanya pemilik asal boleh memadam spot ini.');
  }

  await deleteDoc(threadRef);
  return true;
}

/**
 * Toggles a like/upvote on a community spot.
 */
export async function toggleFirestoreCommunityVote(threadId, userId) {
  if (!db || !userId) return false;
  const voteDocRef = doc(db, 'communityThreads', threadId, 'votes', userId);
  const threadRef = doc(db, 'communityThreads', threadId);
  const snap = await getDoc(voteDocRef);
  if (snap.exists()) {
    await deleteDoc(voteDocRef);
    await updateDoc(threadRef, {
      upvoteCount: increment(-1),
      likeCount: increment(-1)
    });
    return false; // unliked
  } else {
    await setDoc(voteDocRef, { userId, createdAt: new Date().toISOString() });
    await updateDoc(threadRef, {
      upvoteCount: increment(1),
      likeCount: increment(1)
    });
    return true; // liked
  }
}

/**
 * Toggles bookmark / save on a community spot.
 */
export async function toggleFirestoreSpotSave(threadId, userId) {
  if (!db || !userId) return false;
  const saveId = `${userId}_${threadId}`;
  const saveDocRef = doc(db, 'spotSaves', saveId);
  const threadRef = doc(db, 'communityThreads', threadId);
  const snap = await getDoc(saveDocRef);
  if (snap.exists()) {
    await deleteDoc(saveDocRef);
    await updateDoc(threadRef, { saveCount: increment(-1) }).catch(() => {});
    return false;
  } else {
    await setDoc(saveDocRef, {
      userId,
      spotId: threadId,
      createdAt: new Date().toISOString()
    });
    await updateDoc(threadRef, { saveCount: increment(1) }).catch(() => {});
    return true;
  }
}

/**
 * Adds a comment / reply to a spot in Firestore with rate limiting.
 */
export async function addFirestoreCommunityReply(threadId, user, replyText) {
  const userId = user?.id || user?.uid || 'anonymous';
  const rate = checkRateLimit('comment', userId);
  if (!rate.allowed) {
    throw new Error(rate.error);
  }
  if (!db) throw new Error('Firestore is not configured.');
  const payload = buildReplyPayload(user, replyText);
  const repliesRef = collection(db, 'communityThreads', threadId, 'replies');
  const replyDoc = await addDoc(repliesRef, payload);
  const threadRef = doc(db, 'communityThreads', threadId);
  await updateDoc(threadRef, {
    replyCount: increment(1),
    commentCount: increment(1)
  });
  return { id: replyDoc.id, ...payload };
}

/**
 * Subscribes to replies/comments for a single community spot.
 */
export function subscribeToCommunityReplies(threadId, onUpdate, onError) {
  if (!db || !threadId) return () => {};
  const repliesRef = collection(db, 'communityThreads', threadId, 'replies');
  return onSnapshot(
    repliesRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      items.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      if (onUpdate) onUpdate(items);
    },
    onError
  );
}

/**
 * Reports a community spot for moderation review.
 */
export async function reportFirestoreCommunityThread(threadId, user, reason) {
  if (!db) throw new Error('Firestore is not configured.');
  const reportPayload = {
    threadId,
    targetType: 'spot',
    reporterId: user?.id || user?.uid || 'anonymous',
    reporterName: user?.username || 'Student',
    reason: sanitizeText(reason || 'Reported by user'),
    createdAt: new Date().toISOString()
  };
  await addDoc(collection(db, 'communityReports'), reportPayload);
  const threadRef = doc(db, 'communityThreads', threadId);
  await updateDoc(threadRef, { reportCount: increment(1) }).catch(() => {});
  return true;
}

export const toggleFirestoreThreadVote = toggleFirestoreCommunityVote;
export const addFirestoreThreadReply = addFirestoreCommunityReply;
