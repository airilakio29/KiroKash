import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getCafes,
  getExplorePlaces,
  getVouchers,
  calculateDistanceKm,
  filterAndSortCafes,
  evaluateBudgetFit,
  IPOH_CENTER
} from '../src/services/exploreService.js';
import {
  buildOverpassQuery,
  normalizeOsmElement,
  VERIFIED_OSM_FALLBACK_DATA
} from '../src/services/osmOverpassService.js';
import {
  LOCATION_PRESETS,
  DEFAULT_LOCATION,
  OVERPASS_ENDPOINTS,
  TILE_LAYER_URL,
  TILE_LAYER_FALLBACK
} from '../src/config/mapConfig.js';

describe('Explore Service & Cafe Logic', () => {
  it('should fetch at least 12 cafes asynchronously with all required fields', async () => {
    const cafes = await getCafes();
    assert.ok(cafes.length >= 12, 'Must have at least 12 cafes');

    for (const cafe of cafes) {
      assert.ok(cafe.id, 'Cafe must have id');
      assert.ok(cafe.name, 'Cafe must have name');
      assert.ok(cafe.area, 'Cafe must have area');
      assert.ok(typeof cafe.latitude === 'number', 'Latitude must be number');
      assert.ok(typeof cafe.longitude === 'number', 'Longitude must be number');
      assert.ok(cafe.shortDescription, 'Must have shortDescription');
      assert.ok(cafe.category, 'Must have category');
      assert.ok(cafe.minBudget > 0, 'minBudget must be > 0');
      assert.ok(cafe.maxBudget >= cafe.minBudget, 'maxBudget >= minBudget');
      assert.ok(['budget', 'mid', 'premium'].includes(cafe.priceTier), 'priceTier valid');
      assert.ok(typeof cafe.rating === 'number', 'Rating must be number');
      assert.ok(cafe.openingHours, 'Must have openingHours');
      assert.ok(typeof cafe.hasWifi === 'boolean', 'hasWifi must be boolean');
      assert.ok(typeof cafe.hasStudySeating === 'boolean', 'hasStudySeating must be boolean');
      assert.ok(typeof cafe.xPercent === 'number' && cafe.xPercent >= 0 && cafe.xPercent <= 100, 'xPercent must be 0-100');
      assert.ok(typeof cafe.yPercent === 'number' && cafe.yPercent >= 0 && cafe.yPercent <= 100, 'yPercent must be 0-100');
    }
  });

  it('should fetch at least 8 vouchers linked to cafes with all required fields', async () => {
    const vouchers = await getVouchers();
    assert.ok(vouchers.length >= 8, 'Must have at least 8 vouchers');

    for (const voucher of vouchers) {
      assert.ok(voucher.id, 'Voucher must have id');
      assert.ok(voucher.cafeId, 'Voucher must have cafeId');
      assert.ok(voucher.title, 'Voucher must have title');
      assert.ok(voucher.discountType, 'Must have discountType');
      assert.ok(voucher.discountValue, 'Must have discountValue');
      assert.ok(voucher.code, 'Must have code');
      assert.ok(voucher.expiryDate, 'Must have expiryDate');
      assert.ok(voucher.terms, 'Must have terms');
      assert.ok(['active', 'expiring_soon', 'expired'].includes(voucher.status), 'status valid');
    }
  });

  it('should calculate realistic distance in km within Ipoh', () => {
    // Distance from center to Old Town cafe (~1-2km)
    const dist = calculateDistanceKm(IPOH_CENTER.latitude, IPOH_CENTER.longitude, 4.5968, 101.0776);
    assert.ok(dist >= 0 && dist < 15, `Distance ${dist}km is reasonable for Ipoh`);
  });

  it('should filter cafes by search query correctly', async () => {
    const cafes = await getCafes();
    const vouchers = await getVouchers();

    const filtered = filterAndSortCafes(cafes, { searchQuery: 'Old Town' }, vouchers);
    assert.ok(filtered.length > 0, 'Should find Old Town cafes');
    for (const c of filtered) {
      const match = c.name.includes('Old Town') || c.area === 'Old Town' || c.shortDescription.includes('Old Town');
      assert.ok(match, 'Cafe should match Old Town query');
    }
  });

  it('should filter cafes by budget preset and study friendly', async () => {
    const cafes = await getCafes();
    const vouchers = await getVouchers();

    const under10 = filterAndSortCafes(cafes, { budgetPreset: 'under10' }, vouchers);
    for (const c of under10) {
      assert.ok(c.minBudget <= 10, 'Min budget should be <= 10');
    }

    const studyOnly = filterAndSortCafes(cafes, { studyFriendly: true }, vouchers);
    for (const c of studyOnly) {
      assert.ok(c.hasWifi && c.hasStudySeating, 'Must have wifi and study seating');
    }
  });

  it('should evaluate budget suitability accurately against remaining food budget', () => {
    const cafe = { minBudget: 10, maxBudget: 20 };

    // Case 1: No food budget set
    const noBudget = evaluateBudgetFit(cafe, { hasBudget: false });
    assert.equal(noBudget.status, 'no_budget');

    // Case 2: Fits completely (remaining >= maxBudget)
    const fits = evaluateBudgetFit(cafe, { hasBudget: true, remaining: 50 });
    assert.equal(fits.status, 'fits');

    // Case 3: Tight (minBudget <= remaining < maxBudget)
    const tight = evaluateBudgetFit(cafe, { hasBudget: true, remaining: 15 });
    assert.equal(tight.status, 'tight');

    // Case 4: Over budget (remaining < minBudget)
    const over = evaluateBudgetFit(cafe, { hasBudget: true, remaining: 5 });
    assert.equal(over.status, 'over');

    // Case 5: OpenStreetMap venue with unlisted budget
    const osmCafe = { minBudget: null, maxBudget: null };
    const unlisted = evaluateBudgetFit(osmCafe, { hasBudget: true, remaining: 25 });
    assert.equal(unlisted.status, 'unspecified');
    assert.equal(unlisted.label, 'Budget not listed');
  });

  describe('Real OpenStreetMap Integration & Overpass API', () => {
    it('should configure valid OpenStreetMap tile and Overpass endpoints', () => {
      assert.ok(TILE_LAYER_URL.includes('{z}/{x}/{y}'), 'Must have standard tile template');
      assert.ok(TILE_LAYER_FALLBACK.includes('tile.openstreetmap.org'), 'Must provide fallback OpenStreetMap tile layer');
      assert.ok(OVERPASS_ENDPOINTS.length >= 2, 'Must have at least 2 fallback Overpass endpoints');
      assert.ok(LOCATION_PRESETS.length >= 4, 'Must include location presets');
      assert.ok(DEFAULT_LOCATION.latitude && DEFAULT_LOCATION.longitude, 'Default location set');
    });

    it('should build an Overpass QL query covering all required student merchant categories', () => {
      const q = buildOverpassQuery(4.5975, 101.0901, 5000);
      assert.ok(q.includes('amenity"="cafe"'), 'Must query cafes');
      assert.ok(q.includes('amenity"="restaurant"'), 'Must query restaurants');
      assert.ok(q.includes('shop"="bakery"'), 'Must query bakeries');
      assert.ok(q.includes('amenity"="ice_cream"'), 'Must query dessert/ice cream');
      assert.ok(q.includes('amenity"="fast_food"'), 'Must query fast-food outlets');
      assert.ok(q.includes('shop"="convenience"'), 'Must query convenience stores');
      assert.ok(q.includes('shop"="supermarket"'), 'Must query supermarkets');
      assert.ok(q.includes('out center 60 tags;'), 'Must query center coordinates and tags');
    });

    it('should normalize raw OpenStreetMap elements without inventing fake ratings or prices', () => {
      const rawNode = {
        type: 'node',
        id: 10066724691,
        lat: 4.5936701,
        lon: 101.0846702,
        tags: {
          name: 'Ipoh Bean Bar',
          amenity: 'cafe',
          cuisine: 'coffee_shop',
          internet_access: 'wlan',
          'addr:street': 'Jalan Yau Tet Shin',
          'addr:city': 'Ipoh'
        }
      };

      const normalized = normalizeOsmElement(rawNode, 4.5975, 101.0901);
      assert.ok(normalized, 'Should normalize element');
      assert.equal(normalized.id, 'osm-node-10066724691');
      assert.equal(normalized.name, 'Ipoh Bean Bar');
      assert.equal(normalized.category, 'Study Cafe');
      assert.equal(normalized.hasWifi, true);
      assert.equal(normalized.source, 'openstreetmap');
      assert.equal(normalized.isPartner, false);
      // Data integrity constraints:
      assert.equal(normalized.rating, null, 'Must NOT invent fake rating');
      assert.equal(normalized.minBudget, null, 'Must NOT invent fake min budget');
      assert.equal(normalized.maxBudget, null, 'Must NOT invent fake max budget');
      assert.ok(normalized.distanceKm >= 0, 'Must calculate real distance');
    });

    it('should fetch combined places distinguishing partners from OpenStreetMap businesses', async () => {
      const places = await getExplorePlaces();
      assert.ok(places.length >= 15, 'Combined places must include partner and OSM businesses');

      const partnerPlaces = places.filter((p) => p.isPartner);
      const osmPlaces = places.filter((p) => !p.isPartner && p.source === 'openstreetmap');

      assert.ok(partnerPlaces.length > 0, 'Must contain verified partner venues');
      assert.ok(osmPlaces.length > 0, 'Must contain real OpenStreetMap community venues');

      // Vouchers are only linked to verified partner venues, never automatically given to ordinary OSM places
      const vouchers = await getVouchers();
      const voucherCafeIds = new Set(vouchers.map((v) => v.cafeId));
      for (const osm of osmPlaces) {
        assert.ok(!voucherCafeIds.has(osm.id), 'Ordinary OSM places must not be given vouchers');
      }
    });

    it('should have authentic verified OpenStreetMap fallback places with accurate coordinates', () => {
      assert.ok(VERIFIED_OSM_FALLBACK_DATA.length >= 10, 'Must have at least 10 verified fallback places');
      for (const place of VERIFIED_OSM_FALLBACK_DATA) {
        assert.ok(place.osmId, 'Must have authentic OSM ID');
        assert.equal(place.source, 'openstreetmap');
        assert.equal(place.isPartner, false);
        assert.equal(place.rating, null);
        assert.equal(place.minBudget, null);
        assert.ok(place.latitude > 4.0 && place.latitude < 5.0, 'Must be in Perak region');
        assert.ok(place.longitude > 100.5 && place.longitude < 101.5, 'Must be in Perak region');
      }
    });
  });
});
