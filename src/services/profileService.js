/**
 * KampusKash Profile Service
 * Manages user profile details, avatar presets, and ensures technical IDs
 * (Firebase UID, hashes) are NEVER displayed as user-facing names.
 */

import { db, doc, setDoc, getDoc, auth, updateProfile } from '../firebase.js';
import { isTechnicalId } from './authService.js';

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit

export const SUPPORTED_CURRENCIES = [
  { code: 'RM', symbol: 'RM', label: 'MYR - Malaysian Ringgit (RM)' },
  { code: 'USD', symbol: '$', label: 'USD - US Dollar ($)' },
  { code: 'SGD', symbol: 'S$', label: 'SGD - Singapore Dollar (S$)' },
  { code: 'EUR', symbol: '€', label: 'EUR - Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP - British Pound (£)' },
  { code: 'IDR', symbol: 'Rp', label: 'IDR - Indonesian Rupiah (Rp)' }
];

export const PRESET_AVATARS = [
  {
    id: 'preset-scholar',
    label: 'Scholar',
    iconName: 'GraduationCap',
    bg: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    color: '#FFFFFF'
  },
  {
    id: 'preset-techie',
    label: 'Techie',
    iconName: 'Laptop',
    bg: 'linear-gradient(135deg, #059669, #10B981)',
    color: '#FFFFFF'
  },
  {
    id: 'preset-creative',
    label: 'Creative',
    iconName: 'Palette',
    bg: 'linear-gradient(135deg, #EC4899, #F43F5E)',
    color: '#FFFFFF'
  },
  {
    id: 'preset-scientist',
    label: 'Scientist',
    iconName: 'Atom',
    bg: 'linear-gradient(135deg, #0284C7, #06B6D4)',
    color: '#FFFFFF'
  },
  {
    id: 'preset-saver',
    label: 'Smart Saver',
    iconName: 'PiggyBank',
    bg: 'linear-gradient(135deg, #D97706, #F59E0B)',
    color: '#FFFFFF'
  },
  {
    id: 'preset-achiever',
    label: 'Achiever',
    iconName: 'Target',
    bg: 'linear-gradient(135deg, #7C3AED, #A855F7)',
    color: '#FFFFFF'
  },
  {
    id: 'preset-bookworm',
    label: 'Researcher',
    iconName: 'BookOpen',
    bg: 'linear-gradient(135deg, #2563EB, #3B82F6)',
    color: '#FFFFFF'
  },
  {
    id: 'preset-explorer',
    label: 'Explorer',
    iconName: 'Compass',
    bg: 'linear-gradient(135deg, #EA580C, #F97316)',
    color: '#FFFFFF'
  }
];

/**
 * Cleanly format any user's display name, guaranteeing no technical ID or hash is shown.
 */
export function getCleanDisplayName(user) {
  if (!user) return 'Student';
  const name = user.username || user.displayName;
  if (!name || isTechnicalId(name) || name === user.id) {
    if (user.email) {
      const emailPrefix = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
      return emailPrefix
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
        .trim() || 'Student';
    }
    return 'Student';
  }
  return name;
}

/**
 * Validate an avatar image file before upload.
 */
export function validateAvatarFile(file) {
  if (!file) {
    return { valid: false, error: 'Please choose an image file.' };
  }
  if (!file.type || !file.type.startsWith('image/')) {
    return { valid: false, error: 'Please upload an image file (JPEG, PNG, WebP, or GIF).' };
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return { valid: false, error: 'Image size exceeds 2MB limit. Please choose a smaller photo.' };
  }
  return { valid: true };
}

/**
 * Read file as base64 data URL with promise.
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Update user profile in Firestore and return updated data.
 */
export async function updateUserProfile(userId, profileUpdates) {
  if (!userId || !db) return profileUpdates;
  const userDocRef = doc(db, 'users', userId);
  try {
    await setDoc(userDocRef, {
      profile: profileUpdates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return profileUpdates;
  } catch (err) {
    console.warn('Failed to update profile in Firestore', err);
    throw err;
  }
}

/**
 * Save complete user profile, synchronizing both Firestore and Firebase Auth.
 */
export async function saveFullUserProfile(userId, profileData) {
  const cleanName = profileData.username?.trim() || 'Student';
  const avatarValue = profileData.avatar || 'preset-scholar';

  // 1. Sync to Firebase Auth if auth.currentUser is available
  if (auth && auth.currentUser) {
    const authUpdates = { displayName: cleanName };
    if (typeof avatarValue === 'string') {
      // Firebase Auth photoURL can handle standard URLs and short data URIs
      if (avatarValue.startsWith('http') || (avatarValue.startsWith('data:') && avatarValue.length < 2048)) {
        authUpdates.photoURL = avatarValue;
      }
    }
    try {
      await updateProfile(auth.currentUser, authUpdates);
    } catch (authErr) {
      console.warn('Firebase Auth updateProfile non-critical notice:', authErr);
    }
  }

  // 2. Persist in Firestore users/${userId}
  const fullProfile = {
    username: cleanName,
    handle: (profileData.handle || '').trim().toLowerCase(),
    bio: (profileData.bio || '').trim(),
    university: (profileData.university || '').trim(),
    course: (profileData.course || '').trim(),
    achievements: Array.isArray(profileData.achievements) ? profileData.achievements : [],
    privacySettings: profileData.privacySettings || undefined,
    monthlyBudget: Math.max(0, Number(profileData.monthlyBudget) || 0),
    currency: profileData.currency || 'RM',
    avatar: avatarValue,
    updatedAt: new Date().toISOString()
  };

  if (userId && db) {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      profile: fullProfile
    }, { merge: true });
  }

  return { success: true, profile: fullProfile };
}

/**
 * Fetch user profile from Firestore.
 */
export async function fetchUserProfile(userId) {
  if (!userId || !db) return null;
  const userDocRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data().profile || null;
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch profile from Firestore', err);
    return null;
  }
}
