/**
 * KampusKash Explore Service
 * Manages fetching partner cafes, real OpenStreetMap businesses,
 * student vouchers, saved vouchers, and filtering logic.
 */

import { MOCK_CAFES, MOCK_VOUCHERS } from '../data/exploreMock.js';
import { db, doc, setDoc } from '../firebase.js';
import { fetchRealNearbyBusinesses } from './osmOverpassService.js';
import { DEFAULT_LOCATION, DEFAULT_SEARCH_RADIUS_METERS } from '../config/mapConfig.js';

export const SAVED_VOUCHERS_KEY_PREFIX = 'student_tracker_saved_vouchers_';

// Ipoh Reference Center (Default location)
export const IPOH_CENTER = {
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  name: DEFAULT_LOCATION.name
};

/**
 * Fetch list of verified KampusKash partner cafes.
 * Guaranteed 100% backward compatible for tests and partner deals.
 */
export async function getCafes(options = {}) {
  const {
    includeOsm = false,
    latitude = IPOH_CENTER.latitude,
    longitude = IPOH_CENTER.longitude,
    radiusMeters = DEFAULT_SEARCH_RADIUS_METERS
  } = options;

  // Partner cafes with verified vouchers, ratings, and student budget ranges
  const partnerCafes = MOCK_CAFES.map((c) => ({
    ...c,
    isPartner: true,
    source: 'kampuskash_partner'
  }));

  if (!includeOsm) {
    return [...partnerCafes];
  }

  // Combined mode: Partner cafes + Real OpenStreetMap businesses
  try {
    const realOsmBusinesses = await fetchRealNearbyBusinesses({
      latitude,
      longitude,
      radiusMeters
    });

    const partnerNames = new Set(partnerCafes.map((p) => p.name.trim().toLowerCase()));
    const nonDuplicateOsm = realOsmBusinesses.filter(
      (b) => !partnerNames.has(b.name.trim().toLowerCase())
    );

    return [...partnerCafes, ...nonDuplicateOsm];
  } catch (err) {
    console.warn('Failed to load live OSM businesses, falling back to partner cafes', err);
    return [...partnerCafes];
  }
}

/**
 * Fetch all venues for Explore page (verified partners + real OSM businesses).
 */
export async function getExplorePlaces(options = {}) {
  return getCafes({ ...options, includeOsm: true });
}

/**
 * Fetch list of campus vouchers asynchronously.
 */
export async function getVouchers() {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return [...MOCK_VOUCHERS];
}

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Retrieve saved voucher IDs for a user from LocalStorage.
 */
export function getSavedVoucherIds(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${SAVED_VOUCHERS_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to parse saved vouchers from localStorage', err);
    return [];
  }
}

/**
 * Persist saved voucher IDs to LocalStorage and Firestore.
 */
export async function persistSavedVoucherIds(userId, voucherIds) {
  if (!userId) return;
  try {
    localStorage.setItem(`${SAVED_VOUCHERS_KEY_PREFIX}${userId}`, JSON.stringify(voucherIds));
  } catch (err) {
    console.warn('Failed to save vouchers to localStorage', err);
  }

  if (db) {
    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        savedVouchers: voucherIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to sync saved vouchers to Firestore', err);
    }
  }
}

/**
 * Toggle saving a voucher. Returns updated array of saved voucher IDs.
 */
export async function toggleSaveVoucherId(userId, voucherId) {
  const current = getSavedVoucherIds(userId);
  const exists = current.includes(voucherId);
  const updated = exists ? current.filter((id) => id !== voucherId) : [...current, voucherId];
  await persistSavedVoucherIds(userId, updated);
  return updated;
}

/**
 * Filter and sort venues based on user filters and search options.
 */
export function filterAndSortCafes(cafes = [], options = {}, vouchers = []) {
  const {
    searchQuery = '',
    category = 'all',
    budgetPreset = 'all', // 'all', 'under10', '10to20', 'over20'
    hasVoucher = false,
    studyFriendly = false,
    sortBy = 'rating', // 'rating', 'cheapest', 'nearest'
    userLat = IPOH_CENTER.latitude,
    userLng = IPOH_CENTER.longitude
  } = options;

  const voucherCafeIdSet = new Set(
    vouchers.filter((v) => v.status !== 'expired').map((v) => v.cafeId)
  );

  const query = searchQuery.trim().toLowerCase();

  let result = cafes.filter((cafe) => {
    // 1. Search Query (Matches name, area, specialty, description, address, cuisine)
    if (query) {
      const matchName = (cafe.name || '').toLowerCase().includes(query);
      const matchArea = (cafe.area || '').toLowerCase().includes(query);
      const matchCat = (cafe.category || '').toLowerCase().includes(query);
      const matchDesc = (cafe.shortDescription || '').toLowerCase().includes(query);
      const matchSpec = (cafe.featuredSpecialty || '').toLowerCase().includes(query);
      const matchAddr = (cafe.address || '').toLowerCase().includes(query);
      const matchCuisine = (cafe.cuisine || '').toLowerCase().includes(query);
      if (!matchName && !matchArea && !matchCat && !matchDesc && !matchSpec && !matchAddr && !matchCuisine) {
        return false;
      }
    }

    // 2. Category Filter
    if (category !== 'all') {
      const catLower = category.toLowerCase();
      const cafeCatLower = (cafe.category || '').toLowerCase();
      
      let matchesCat = false;
      if (catLower === 'halal friendly') {
        matchesCat = Boolean(cafe.isHalal);
      } else if (catLower === 'cafe') {
        matchesCat = cafeCatLower.includes('cafe') || cafeCatLower.includes('coffee');
      } else if (catLower === 'study cafe') {
        matchesCat = cafeCatLower.includes('study');
      } else if (catLower === 'dessert') {
        matchesCat = cafeCatLower.includes('dessert') || cafeCatLower.includes('ice');
      } else if (catLower === 'local food') {
        matchesCat = cafeCatLower.includes('local') || cafeCatLower.includes('hawker');
      } else if (catLower === 'groceries') {
        matchesCat = cafeCatLower.includes('supermarket') || cafeCatLower.includes('convenience');
      } else {
        matchesCat = cafeCatLower.includes(catLower) || catLower.includes(cafeCatLower);
      }

      if (!matchesCat) return false;
    }

    // 3. Budget Preset Filter
    if (budgetPreset !== 'all') {
      // If cafe does not have listed budget, omit on strict budget filter
      if (cafe.minBudget == null) {
        return false;
      }
      if (budgetPreset === 'under10') {
        if (cafe.minBudget > 10) return false;
      } else if (budgetPreset === '10to20') {
        if (cafe.minBudget > 20 || (cafe.maxBudget != null && cafe.maxBudget < 10)) return false;
      } else if (budgetPreset === 'over20') {
        if (cafe.maxBudget != null ? cafe.maxBudget < 20 : cafe.minBudget < 20) return false;
      }
    }

    // 4. Has Voucher Filter
    if (hasVoucher && !voucherCafeIdSet.has(cafe.id)) {
      return false;
    }

    // 5. Study Friendly Filter
    if (studyFriendly && (!cafe.hasWifi || !cafe.hasStudySeating)) {
      return false;
    }

    return true;
  });

  // Calculate distance for each venue
  result = result.map((cafe) => ({
    ...cafe,
    distanceKm: calculateDistanceKm(userLat, userLng, cafe.latitude, cafe.longitude)
  }));

  // Sorting
  result.sort((a, b) => {
    if (sortBy === 'cheapest') {
      const budgetA = a.minBudget != null ? a.minBudget : 999;
      const budgetB = b.minBudget != null ? b.minBudget : 999;
      return budgetA - budgetB;
    }
    if (sortBy === 'nearest') {
      return (a.distanceKm || 0) - (b.distanceKm || 0);
    }
    // Default: Top Rated (Venues with verified rating first, then by review count / name)
    const ratingA = a.rating != null ? a.rating : 0;
    const ratingB = b.rating != null ? b.rating : 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }
    const reviewsA = a.reviewCount || 0;
    const reviewsB = b.reviewCount || 0;
    if (reviewsB !== reviewsA) {
      return reviewsB - reviewsA;
    }
    return (a.distanceKm || 0) - (b.distanceKm || 0);
  });

  return result;
}

/**
 * Check how a venue fits into the user's remaining food budget.
 */
export function evaluateBudgetFit(cafe, foodBudgetStatus) {
  if (!foodBudgetStatus || !foodBudgetStatus.hasBudget) {
    return {
      status: 'no_budget',
      label: 'No Food Budget Set',
      message: 'Set a Food budget to track affordability'
    };
  }

  const remaining = Number(foodBudgetStatus.remaining) || 0;

  if (cafe.minBudget == null) {
    return {
      status: 'unspecified',
      label: 'Budget not listed',
      message: `RM ${remaining.toFixed(2)} remaining in Food budget`
    };
  }

  const maxB = cafe.maxBudget != null ? cafe.maxBudget : cafe.minBudget;

  if (remaining >= maxB) {
    return {
      status: 'fits',
      label: 'Fits your budget',
      message: `RM ${remaining.toFixed(2)} remaining in Food budget`
    };
  }

  if (remaining >= cafe.minBudget) {
    return {
      status: 'tight',
      label: 'Fits minimum budget',
      message: `RM ${remaining.toFixed(2)} remaining in Food budget`
    };
  }

  return {
    status: 'over',
    label: 'Over your budget',
    message: `Exceeds current Food budget (RM ${remaining.toFixed(2)} left)`
  };
}
