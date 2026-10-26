import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateThreadInput,
  sanitizeText,
  filterAndSortThreads,
  buildThreadPayload,
  validateReplyInput,
  buildReplyPayload,
  COMMUNITY_TAGS,
  CAMPUS_OPTIONS
} from '../src/services/communityService.js';

describe('KampusKash "Makan Murah" Community Service Tests', () => {

  describe('1. Input Sanitization & Safety', () => {
    it('should strip HTML tags from input text', () => {
      const malicious = '<script>alert("xss")</script>Nasi Lemak <b>Sedap</b>';
      const clean = sanitizeText(malicious);
      assert.strictEqual(clean, 'alert("xss")Nasi Lemak Sedap');
      assert.ok(!clean.includes('<script>'));
      assert.ok(!clean.includes('<b>'));
    });

    it('should strip ASCII control characters safely', () => {
      const textWithControls = 'Mamak\x00\x08Corner\x1F';
      const clean = sanitizeText(textWithControls);
      assert.strictEqual(clean, 'MamakCorner');
    });

    it('should return empty string for non-string values', () => {
      assert.strictEqual(sanitizeText(null), '');
      assert.strictEqual(sanitizeText(undefined), '');
      assert.strictEqual(sanitizeText(123), '');
    });
  });

  describe('2. Thread Validation (validateThreadInput)', () => {
    const validSample = {
      placeName: 'Warung Nasi Lemak Royale',
      title: 'Nasi Lemak RM4.50 Sambal Kerang Padu',
      body: 'Portion sangat kenyang untuk student, sambal manis pedas dan telur rebus separuh.',
      pricePerMeal: 4.5,
      rating: 5,
      campus: 'utp',
      tags: ['bawah-rm10', 'halal']
    };

    it('should pass validation for complete and realistic student thread', () => {
      const res = validateThreadInput(validSample);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.errors.length, 0);
    });

    it('should reject empty or too short place name', () => {
      const res = validateThreadInput({ ...validSample, placeName: 'A' });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('Nama kedai')));
    });

    it('should reject empty or too short title', () => {
      const res = validateThreadInput({ ...validSample, title: 'Hi' });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('Tajuk thread')));
    });

    it('should reject empty or too short body description', () => {
      const res = validateThreadInput({ ...validSample, body: 'Bad' });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('Ulasan')));
    });

    it('should reject invalid prices (negative or > RM200)', () => {
      const resNegative = validateThreadInput({ ...validSample, pricePerMeal: -5 });
      assert.strictEqual(resNegative.valid, false);

      const resExpensive = validateThreadInput({ ...validSample, pricePerMeal: 250 });
      assert.strictEqual(resExpensive.valid, false);
      assert.ok(resExpensive.errors.some(e => e.includes('melebihi RM200')));
    });

    it('should reject invalid star ratings (must be 1–5 integer)', () => {
      assert.strictEqual(validateThreadInput({ ...validSample, rating: 0 }).valid, false);
      assert.strictEqual(validateThreadInput({ ...validSample, rating: 6 }).valid, false);
      assert.strictEqual(validateThreadInput({ ...validSample, rating: 4.5 }).valid, false);
    });

    it('should detect and reject inappropriate language / profanity', () => {
      const res = validateThreadInput({
        ...validSample,
        body: 'Kedai ni bodoh and babi tak sedap langsung'
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('tidak sopan')));
    });
  });

  describe('3. filterAndSortThreads (Filtering & Sorting Engine)', () => {
    const mockThreads = [
      {
        id: 't1',
        placeName: 'Mamak Bismillah',
        title: 'Roti Canai RM1.50 & Teh Tarik RM2',
        body: 'Port lepak assignment sampai 3 pagi, wifi laju ada plug.',
        campus: 'utp',
        pricePerMeal: 3.5,
        rating: 5,
        tags: ['bawah-rm10', 'buka-lewat', 'wifi-plug', 'mamak'],
        upvoteCount: 42,
        status: 'active',
        createdAt: '2026-10-25T10:00:00.000Z'
      },
      {
        id: 't2',
        placeName: 'Kafe Siswa Mahallah',
        title: 'Nasi Campur Ayam Goreng RM6.00',
        body: 'Ayam berempah panas-panas, sayur percuma kuah banjir.',
        campus: 'um',
        pricePerMeal: 6.0,
        rating: 4,
        tags: ['bawah-rm10', 'halal', 'porsi-besar'],
        upvoteCount: 88,
        status: 'active',
        createdAt: '2026-10-26T08:00:00.000Z'
      },
      {
        id: 't3',
        placeName: 'Burger Bakar Abang Bob',
        title: 'Triple Beef Burger Special RM15',
        body: 'Daging tebal juicy, reward lepas exam final.',
        campus: 'utp',
        pricePerMeal: 15.0,
        rating: 4,
        tags: ['halal', 'buka-lewat'],
        upvoteCount: 15,
        status: 'active',
        createdAt: '2026-10-26T12:00:00.000Z'
      },
      {
        id: 't4',
        placeName: 'Spam Outlet',
        title: 'Spam Promo',
        body: 'Buy now scam link',
        campus: 'utp',
        pricePerMeal: 5.0,
        rating: 1,
        tags: [],
        upvoteCount: 0,
        status: 'hidden', // Moderated
        createdAt: '2026-10-26T13:00:00.000Z'
      }
    ];

    it('should exclude hidden/moderated threads automatically', () => {
      const res = filterAndSortThreads(mockThreads);
      assert.strictEqual(res.length, 3);
      assert.ok(!res.some(t => t.id === 't4'));
    });

    it('should filter accurately by campus', () => {
      const utpOnly = filterAndSortThreads(mockThreads, { campus: 'utp' });
      assert.strictEqual(utpOnly.length, 2);
      assert.ok(utpOnly.every(t => t.campus === 'utp'));

      const umOnly = filterAndSortThreads(mockThreads, { campus: 'um' });
      assert.strictEqual(umOnly.length, 1);
      assert.strictEqual(umOnly[0].id, 't2');
    });

    it('should filter by max budget price (e.g. <= RM5)', () => {
      const underFive = filterAndSortThreads(mockThreads, { maxPrice: 5 });
      assert.strictEqual(underFive.length, 1);
      assert.strictEqual(underFive[0].id, 't1');
      assert.strictEqual(underFive[0].pricePerMeal, 3.5);
    });

    it('should filter by multiple tags with AND condition', () => {
      const res = filterAndSortThreads(mockThreads, {
        selectedTags: ['bawah-rm10', 'buka-lewat']
      });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res.id, undefined);
      assert.strictEqual(res[0].id, 't1');
    });

    it('should filter by search query across place name or body', () => {
      const res = filterAndSortThreads(mockThreads, { searchQuery: 'assignment' });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].placeName, 'Mamak Bismillah');
    });

    it('should sort correctly by "cheapest"', () => {
      const res = filterAndSortThreads(mockThreads, { sort: 'cheapest' });
      assert.strictEqual(res[0].pricePerMeal, 3.5);
      assert.strictEqual(res[1].pricePerMeal, 6.0);
      assert.strictEqual(res[2].pricePerMeal, 15.0);
    });

    it('should sort correctly by "top" (upvotes)', () => {
      const res = filterAndSortThreads(mockThreads, { sort: 'top' });
      assert.strictEqual(res[0].id, 't2'); // 88 upvotes
      assert.strictEqual(res[1].id, 't1'); // 42 upvotes
      assert.strictEqual(res[2].id, 't3'); // 15 upvotes
    });

    it('should sort correctly by "newest" by default', () => {
      const res = filterAndSortThreads(mockThreads, { sort: 'newest' });
      assert.strictEqual(res[0].id, 't3'); // 12:00:00
      assert.strictEqual(res[1].id, 't2'); // 08:00:00
      assert.strictEqual(res[2].id, 't1'); // Oct 25
    });
  });

  describe('4. buildThreadPayload', () => {
    it('should build a sanitized thread payload ready for database creation', () => {
      const mockUser = {
        id: 'user-123',
        username: 'Ahmad Faiz',
        avatar: '👨‍🎓',
        university: 'Universiti Malaya (UM)'
      };
      const rawInput = {
        placeName: ' Restoran Selera Kampung <b>HQ</b> ',
        title: 'Nasi Campur RM5 Murah Giler',
        body: 'Lauk banyak pilihan, teh o ais free waktu lunch.',
        pricePerMeal: '5.00',
        rating: 5,
        campus: 'um',
        tags: ['bawah-rm10', 'halal']
      };

      const payload = buildThreadPayload(mockUser, rawInput);
      assert.strictEqual(payload.authorId, 'user-123');
      assert.strictEqual(payload.authorName, 'Ahmad Faiz');
      assert.strictEqual(payload.placeName, 'Restoran Selera Kampung HQ');
      assert.strictEqual(payload.pricePerMeal, 5.0);
      assert.strictEqual(payload.upvoteCount, 0);
      assert.strictEqual(payload.replyCount, 0);
      assert.strictEqual(payload.reportCount, 0);
      assert.strictEqual(payload.status, 'active');
      assert.ok(payload.createdAt);
    });
  });

  describe('5. Constants Verification', () => {
    it('COMMUNITY_TAGS should provide essential student tags with icons and labels', () => {
      assert.ok(COMMUNITY_TAGS.length >= 8);
      const tagIds = COMMUNITY_TAGS.map(t => t.id);
      assert.ok(tagIds.includes('bawah-rm10'));
      assert.ok(tagIds.includes('halal'));
      assert.ok(tagIds.includes('student-deal'));
      assert.ok(tagIds.includes('buka-lewat'));
    });

    it('CAMPUS_OPTIONS should include national universities and "all" option', () => {
      assert.ok(CAMPUS_OPTIONS.length >= 5);
      assert.strictEqual(CAMPUS_OPTIONS[0].id, 'all');
    });
  });


  describe('6. Reply Validation & Construction', () => {
    it('should validate valid reply text correctly', () => {
      const res = validateReplyInput('Memang sedap, kuah kari dia pekat gila!');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.errors.length, 0);
    });

    it('should reject too short replies or empty strings', () => {
      assert.strictEqual(validateReplyInput('a').valid, false);
      assert.strictEqual(validateReplyInput('   ').valid, false);
    });

    it('should reject profanity in replies', () => {
      const res = validateReplyInput('bodoh servis lambat');
      assert.strictEqual(res.valid, false);
    });

    it('should build clean reply payload with author metadata', () => {
      const user = { id: 'u1', username: 'Farah', university: 'UM', avatar: '👩‍🎓' };
      const reply = buildReplyPayload(user, '<b>Roti canai crispy RM1.50</b>');
      assert.strictEqual(reply.authorId, 'u1');
      assert.strictEqual(reply.authorName, 'Farah');
      assert.strictEqual(reply.authorUniversity, 'UM');
      assert.strictEqual(reply.body, 'Roti canai crispy RM1.50');
      assert.ok(!reply.body.includes('<b>'));
      assert.ok(reply.createdAt);
    });
  });

});
