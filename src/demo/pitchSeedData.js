/**
 * KampusKash Pitch Mode Seed Dataset
 *
 * Seeds:
 * - 8 clearly fictional Malaysian student demo users (fictional names & preset avatars, no real people)
 * - 28 varied Spot Jimat posts across all 6 categories (including the 6 migrated Makan Murah posts)
 * - Follows, likes, comments, and bookmarks between demo users
 * - Demo wallets, ledger transactions, notifications, and pending money requests
 * - All records tagged with `isPitchDemo: true` for clean one-click reset.
 */

import { generateDemoThreads } from './demoData.js';
import { migrateLegacyThreadToSpot, getBudgetTagForPrice } from '../services/communityService.js';
import { INITIAL_DEMO_WALLET_BALANCE } from '../config/appConstants.js';

/**
 * Generates a clean SVG illustration data URL for a spot card so photos look vibrant
 * and work 100% offline without external URLs or real people's photos.
 */
export function generateSpotIllustrationSvg(category, label, bgHex = '#312E81', accentHex = '#818CF8') {
  const safeLabel = String(label || 'Spot Jimat')
    .replace(/[<>&"']/g, '')
    .slice(0, 26);
  const categoryBadges = {
    makan: 'MAKAN & KAFE',
    thrift: 'THRIFT & BUNDLE',
    activities: 'SUKAN & AKTIVITI',
    study: 'STUDY SPOT',
    services: 'SERVIS PELAJAR',
    events: 'PROMO & EVENT'
  };
  const catText = categoryBadges[category] || 'SPOT JIMAT';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="320" viewBox="0 0 600 320">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgHex}" />
        <stop offset="100%" stop-color="${accentHex}" />
      </linearGradient>
    </defs>
    <rect width="600" height="320" rx="16" fill="url(#g)" />
    <circle cx="510" cy="70" r="85" fill="rgba(255,255,255,0.08)" />
    <circle cx="90" cy="260" r="110" fill="rgba(255,255,255,0.06)" />
    <rect x="28" y="28" width="160" height="32" rx="16" fill="rgba(0,0,0,0.32)" />
    <text x="44" y="49" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="700" letter-spacing="1">${catText}</text>
    <text x="32" y="242" fill="#FFFFFF" font-family="sans-serif" font-size="24" font-weight="800">${safeLabel}</text>
    <text x="32" y="272" fill="rgba(255,255,255,0.82)" font-family="sans-serif" font-size="14" font-weight="600">KampusKash • Spot Jimat Pelajar</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * 8 Fictional Demo Student Profiles (No real people or real photos)
 * First two are the primary switchable Pitch Mode accounts.
 */
export const PITCH_DEMO_USERS = [
  {
    id: 'demo-student-aiman',
    uid: 'demo-student-aiman',
    username: 'Aiman Hafiz',
    displayName: 'Aiman Hafiz',
    handle: 'aiman_utp',
    email: 'aiman.demo@kampuskash.my',
    university: 'Universiti Teknologi PETRONAS (UTP)',
    campus: 'utp',
    bio: 'Software Eng Y3 | Pemburu Spot Jimat & Futsal ⚽',
    avatar: 'preset-techie',
    currency: 'RM',
    monthlyBudget: 750,
    isDemoUser: true,
    isPitchDemo: true,
    walletBalance: 100.00,
    walletPin: '1234'
  },
  {
    id: 'demo-student-sarah',
    uid: 'demo-student-sarah',
    username: 'Sarah Dania',
    displayName: 'Sarah Dania',
    handle: 'sarah_um',
    email: 'sarah.demo@kampuskash.my',
    university: 'Universiti Malaya (UM)',
    campus: 'um',
    bio: 'CS Undergrad | Matcha, Study Cafes & Thrift 🍵',
    avatar: 'preset-scholar',
    currency: 'RM',
    monthlyBudget: 800,
    isDemoUser: true,
    isPitchDemo: true,
    walletBalance: 100.00,
    walletPin: '1234'
  },
  {
    id: 'demo-student-luqman',
    uid: 'demo-student-luqman',
    username: 'Luqman Hakim',
    displayName: 'Luqman Hakim',
    handle: 'luqman_uitm',
    email: 'luqman.demo@kampuskash.my',
    university: 'Universiti Teknologi MARA (UiTM)',
    campus: 'uitm',
    bio: 'Mechanical Eng | Badminton & Bundle Hunter 🏸',
    avatar: 'preset-explorer',
    currency: 'RM',
    monthlyBudget: 650,
    isDemoUser: true,
    isPitchDemo: true,
    walletBalance: 85.50,
    walletPin: '1234'
  },
  {
    id: 'demo-student-weilun',
    uid: 'demo-student-weilun',
    username: 'Chong Wei Lun',
    displayName: 'Chong Wei Lun',
    handle: 'weilun_usm',
    email: 'weilun.demo@kampuskash.my',
    university: 'Universiti Sains Malaysia (USM)',
    campus: 'usm',
    bio: 'EE Student | Late night coding & Kopi Peng ⚡',
    avatar: 'preset-scientist',
    currency: 'RM',
    monthlyBudget: 700,
    isDemoUser: true,
    isPitchDemo: true,
    walletBalance: 120.00,
    walletPin: '1234'
  },
  {
    id: 'demo-student-huda',
    uid: 'demo-student-huda',
    username: 'Nurul Huda',
    displayName: 'Nurul Huda',
    handle: 'huda_ukm',
    email: 'huda.demo@kampuskash.my',
    university: 'Universiti Kebangsaan Malaysia (UKM)',
    campus: 'ukm',
    bio: 'Accounting Y2 | Smart Saver & Bookworm 📚',
    avatar: 'preset-bookworm',
    currency: 'RM',
    monthlyBudget: 600,
    isDemoUser: true,
    isPitchDemo: true,
    walletBalance: 94.00,
    walletPin: '1234'
  },
  {
    id: 'demo-student-amirul',
    uid: 'demo-student-amirul',
    username: 'Amirul Asyraf',
    displayName: 'Amirul Asyraf',
    handle: 'amirul_utm',
    email: 'amirul.demo@kampuskash.my',
    university: 'Universiti Teknologi Malaysia (UTM)',
    campus: 'utm',
    bio: 'Robotics Club | Arcade & Tech Repair Geek 🤖',
    avatar: 'preset-achiever',
    currency: 'RM',
    monthlyBudget: 700,
    isDemoUser: true,
    isPitchDemo: true,
    walletBalance: 112.00,
    walletPin: '1234'
  },
  {
    id: 'demo-student-priya',
    uid: 'demo-student-priya',
    username: 'Priya Darshini',
    displayName: 'Priya Darshini',
    handle: 'priya_upm',
    email: 'priya.demo@kampuskash.my',
    university: 'Universiti Putra Malaysia (UPM)',
    campus: 'upm',
    bio: 'Design Student | Free Campus Events & Thrift 🎨',
    avatar: 'preset-creative',
    currency: 'RM',
    monthlyBudget: 680,
    isDemoUser: true,
    isPitchDemo: true,
    walletBalance: 78.00,
    walletPin: '1234'
  },
  {
    id: 'demo-student-danial',
    uid: 'demo-student-danial',
    username: 'Danial Haziq',
    displayName: 'Danial Haziq',
    handle: 'danial_iium',
    email: 'danial.demo@kampuskash.my',
    university: 'International Islamic University (IIUM)',
    campus: 'iium',
    bio: 'Economics Y3 | Budget Meal Prep & Bowling 🎳',
    avatar: 'preset-saver',
    currency: 'RM',
    monthlyBudget: 650,
    isDemoUser: true,
    isPitchDemo: true,
    walletBalance: 105.00,
    walletPin: '1234'
  }
];

/**
 * Generates 28 varied student spots across all 6 categories,
 * migrating the 6 original Makan Murah threads seamlessly under 'makan'.
 */
export function generatePitchSpots(baseDate = new Date()) {
  const getIso = (daysAgo, hoursAgo = 0) =>
    new Date(baseDate.getTime() - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();

  // 1. Migrate the 6 existing Makan Murah threads first (preserving all data)
  const legacyMakanThreads = generateDemoThreads(baseDate).map((thread, idx) => {
    const authorMap = [
      PITCH_DEMO_USERS[0], // Aiman
      PITCH_DEMO_USERS[1], // Sarah
      PITCH_DEMO_USERS[2], // Luqman
      PITCH_DEMO_USERS[3], // Wei Lun
      PITCH_DEMO_USERS[4], // Huda
      PITCH_DEMO_USERS[5]  // Amirul
    ];
    const mappedUser = authorMap[idx % authorMap.length];
    return migrateLegacyThreadToSpot({
      ...thread,
      authorId: mappedUser.id,
      authorName: mappedUser.username,
      authorUsername: mappedUser.handle,
      authorAvatar: mappedUser.avatar,
      authorUniversity: mappedUser.university,
      category: 'makan',
      photoUrl: generateSpotIllustrationSvg('makan', thread.placeName, '#065F46', '#10B981'),
      isPitchDemo: true
    });
  });

  // 2. Additional 22 spots across all 6 categories (total = 28 spots)
  const additionalRawSpots = [
    // --- MAKAN (4 more -> 10 total) ---
    {
      id: 'spot-pitch-7',
      userIndex: 6,
      category: 'makan',
      campus: 'upm',
      placeName: 'Gerai Pak Teh Sup Utara Serdang',
      title: 'Bihun Sup Utara Daging Melimpah RM4.80',
      shortTip: 'Datang waktu hujan petang, sambal kicap pedas boleh tambah sendiri percuma.',
      body: 'Bihun sup utara kuah tulang kaw, daging hiris lembut. Harga student RM4.80 sahaja, air teh o ais RM1.00.',
      pricePerMeal: 4.80,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'halal', 'student-deal', 'porsi-besar'],
      address: 'Sri Serdang, 500m dari Pintu 1 UPM',
      mapLink: 'https://maps.google.com/?q=3.0045,101.7132',
      lat: 3.0045,
      lng: 101.7132,
      upvoteCount: 54,
      replyCount: 2,
      saveCount: 19,
      daysAgo: 1,
      hoursAgo: 2,
      bgHex: '#065F46',
      accentHex: '#34D399'
    },
    {
      id: 'spot-pitch-8',
      userIndex: 7,
      category: 'makan',
      campus: 'iium',
      placeName: 'Mahallah Siddiq Kunafa & Shawarma Stall',
      title: 'Shawarma Ayam Padu RM5.00 Malam Jumaat',
      shortTip: 'Sos garlic toum buatan sendiri. Order awal sebelum 9 malam sebab cepat habis!',
      body: 'Roti pita bakar garing, isi ayam perap rempah Arab penuh. Sesuai kongsi atau makan lepas kelas malam.',
      pricePerMeal: 5.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'halal', 'buka-lewat'],
      address: 'Kafe Mahallah Siddiq, UIAM Gombak',
      mapLink: 'https://maps.google.com/?q=3.2521,101.7372',
      lat: 3.2521,
      lng: 101.7372,
      upvoteCount: 67,
      replyCount: 3,
      saveCount: 24,
      daysAgo: 1,
      hoursAgo: 7,
      bgHex: '#047857',
      accentHex: '#10B981'
    },
    {
      id: 'spot-pitch-9',
      userIndex: 0,
      category: 'makan',
      campus: 'utp',
      placeName: 'Ipoh Canning Dim Sum Halal Express',
      title: 'Set Student Platter 4 Bakul Dim Sum + Teh Cina RM16.90',
      shortTip: 'Pergi hari Selasa–Khamis 2PM-5PM ada diskaun 20% bila tunjuk kad pelajar.',
      body: 'Sesuai bila nak celebrate habis midterm dengan geng rumah sewa. Siew mai, har gow dan salted egg bun sedap gila.',
      pricePerMeal: 16.90,
      studentPrice: true,
      rating: 5,
      tags: ['halal', 'student-deal', 'aircond'],
      address: 'Taman Canning, Ipoh',
      mapLink: 'https://maps.google.com/?q=4.6085,101.1062',
      lat: 4.6085,
      lng: 101.1062,
      upvoteCount: 41,
      replyCount: 1,
      saveCount: 15,
      daysAgo: 2,
      hoursAgo: 4,
      bgHex: '#0F766E',
      accentHex: '#2DD4BF'
    },
    {
      id: 'spot-pitch-10',
      userIndex: 1,
      category: 'makan',
      campus: 'um',
      placeName: 'Hotpot Steamboat & Grill Student Buffet PJ',
      title: 'Buffet Steamboat & Kambing Perap Student Rate RM32',
      shortTip: 'Kumpul 5 orang kawan, seorang makan separuh harga bila tunjuk kad matrik!',
      body: 'Pilihan 40 jenis bahan steamboat, daging kambing blackpepper, aiskrim dan minuman free-flow. Sesuai untuk dinner kelab.',
      pricePerMeal: 32.00,
      studentPrice: true,
      rating: 4,
      tags: ['halal', 'student-deal', 'porsi-besar'],
      address: 'Seksyen 14, Petaling Jaya',
      mapLink: 'https://maps.google.com/?q=3.1112,101.6365',
      lat: 3.1112,
      lng: 101.6365,
      upvoteCount: 36,
      replyCount: 1,
      saveCount: 12,
      daysAgo: 3,
      hoursAgo: 5,
      bgHex: '#115E59',
      accentHex: '#14B8A6'
    },

    // --- THRIFT & BUNDLES (4 spots) ---
    {
      id: 'spot-pitch-11',
      userIndex: 2,
      category: 'thrift',
      campus: 'uitm',
      placeName: 'Jalan Jalan Japan One Shamelin & Seksyen 7',
      title: 'Kemeja Flannel & Knitwear Kuliah RM5 Sahaja!',
      shortTip: 'Cari rak tag warna hijau setiap hujung minggu — semua item jatuh RM3 hingga RM5.',
      body: 'Banyak baju kemeja Uniqlo, GU, dan seluar slack sesuai untuk pembentangan kelas atau OOTD kampus.',
      pricePerMeal: 5.00,
      studentPrice: false,
      rating: 5,
      tags: ['bawah-rm10', 'aircond'],
      address: 'Seksyen 7, Shah Alam',
      mapLink: 'https://maps.google.com/?q=3.0732,101.4881',
      lat: 3.0732,
      lng: 101.4881,
      upvoteCount: 82,
      replyCount: 4,
      saveCount: 38,
      daysAgo: 0,
      hoursAgo: 9,
      bgHex: '#4338CA',
      accentHex: '#818CF8'
    },
    {
      id: 'spot-pitch-12',
      userIndex: 1,
      category: 'thrift',
      campus: 'um',
      placeName: 'Kedai Bundle Vintage Pasar Seni / Gerbang Malam Ipoh',
      title: 'Sweatshirt & Windbreaker Universiti Vintage RM12',
      shortTip: 'Kalau beli 2 helai boleh nego dengan abang kedai dapat RM20 total!',
      body: 'Kualiti kain tebal elok untuk pakai dalam dewan kuliah yang sejuk beku. Banyak saiz oversized.',
      pricePerMeal: 12.00,
      studentPrice: true,
      rating: 5,
      tags: ['student-deal', 'buka-lewat'],
      address: 'Gerbang Malam Ipoh / Pasar Seni',
      mapLink: 'https://maps.google.com/?q=4.5948,101.0825',
      lat: 4.5948,
      lng: 101.0825,
      upvoteCount: 59,
      replyCount: 2,
      saveCount: 27,
      daysAgo: 1,
      hoursAgo: 11,
      bgHex: '#5B21B6',
      accentHex: '#A78bfa'
    },
    {
      id: 'spot-pitch-13',
      userIndex: 6,
      category: 'thrift',
      campus: 'upm',
      placeName: '2nd Street Bundle Bangi Gateway',
      title: 'Tote Bag Canvas & Beg LaptopPreloved RM18',
      shortTip: 'Bawa kad pelajar hari Rabu untuk tambahan diskaun 10% atas item tag putih.',
      body: 'Pilihan beg galas, sling bag dan jaket denim bersih siap dobi. Sangat berbaloi untuk pelajar.',
      pricePerMeal: 18.00,
      studentPrice: true,
      rating: 4,
      tags: ['student-deal', 'aircond'],
      address: 'Seksyen 15, Bandar Baru Bangi',
      mapLink: 'https://maps.google.com/?q=2.9365,101.7662',
      lat: 2.9365,
      lng: 101.7662,
      upvoteCount: 34,
      replyCount: 1,
      saveCount: 14,
      daysAgo: 4,
      hoursAgo: 2,
      bgHex: '#6D28D9',
      accentHex: '#C084FC'
    },
    {
      id: 'spot-pitch-14',
      userIndex: 4,
      category: 'thrift',
      campus: 'ukm',
      placeName: 'Bazaar Preloved Graduan Kolej Pendeta Zaaba',
      title: 'Buku Rujukan, Kalkulator Casios & Blazer Konvo RM10',
      shortTip: 'Senior tahun akhir jual barang bilik & buku teks separuh harga sebelum pindah keluar.',
      body: 'Ada lampu meja study RM8, rak buku plastik RM10, dan kalkulator saintifik original RM25.',
      pricePerMeal: 10.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'student-deal'],
      address: 'Foyer Kolej Pendeta Zaaba, UKM Bangi',
      mapLink: 'https://maps.google.com/?q=2.9225,101.7795',
      lat: 2.9225,
      lng: 101.7795,
      upvoteCount: 47,
      replyCount: 2,
      saveCount: 22,
      daysAgo: 2,
      hoursAgo: 8,
      bgHex: '#3730A3',
      accentHex: '#6366F1'
    },

    // --- ACTIVITIES & SPORTS (4 spots: badminton, bowling, golf, futsal/arcade) ---
    {
      id: 'spot-pitch-15',
      userIndex: 2,
      category: 'activities',
      campus: 'uitm',
      placeName: 'Dewan Badminton ProOne Kampus',
      title: 'Sewa Gelanggang Badminton Rate Pelajar RM12/Jam (Kongsi RM3/pax)',
      shortTip: 'Tempah slot 10 pagi hingga 5 petang hari biasa dengan kad matrik — jatuh RM3 seorang bila main beregu!',
      body: 'Lantai rubber mat baru, lampu LED terang tak silau, ada jual shuttlecock tabung dan air isotonik sejuk.',
      pricePerMeal: 3.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'student-deal'],
      address: 'Seksyen 13 / Seri Iskandar Sports Arena',
      mapLink: 'https://maps.google.com/?q=4.3612,100.9654',
      lat: 4.3612,
      lng: 100.9654,
      upvoteCount: 71,
      replyCount: 3,
      saveCount: 31,
      daysAgo: 0,
      hoursAgo: 5,
      bgHex: '#9A3412',
      accentHex: '#FB923C'
    },
    {
      id: 'spot-pitch-16',
      userIndex: 7,
      category: 'activities',
      campus: 'iium',
      placeName: 'Ampang Superbowl / Ipoh Parade Bowling',
      title: 'Student Bowling Deal: 3 Games + Kasut RM14 Sahaja!',
      shortTip: 'Wajib bawa kad pelajar fizikal atau digital sebelum pukul 6 petang Isnin–Jumaat.',
      body: 'Port lepas gian dengan geng tutorial. 3 game penuh siap sewa kasut baru RM14 seorang.',
      pricePerMeal: 14.00,
      studentPrice: true,
      rating: 5,
      tags: ['student-deal', 'aircond'],
      address: 'Aras 4, Ipoh Parade / Wangsa Walk',
      mapLink: 'https://maps.google.com/?q=4.5972,101.0905',
      lat: 4.5972,
      lng: 101.0905,
      upvoteCount: 64,
      replyCount: 2,
      saveCount: 25,
      daysAgo: 1,
      hoursAgo: 14,
      bgHex: '#B45309',
      accentHex: '#FBBF24'
    },
    {
      id: 'spot-pitch-17',
      userIndex: 0,
      category: 'activities',
      campus: 'utp',
      placeName: 'Meru Valley & Kampus Golf Driving Range',
      title: '100 Bola Golf Driving Range + Pinjam Kayu Iron RM10',
      shortTip: 'Kayu 7-iron boleh pinjam percuma di kaunter kalau tunjuk ID pelajar!',
      body: 'Tak perlu beli kelab golf mahal. RM10 dapat 100 biji bola untuk praktis hayunan petang-petang sambil tengok sunset.',
      pricePerMeal: 10.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'student-deal'],
      address: 'Jelapang / Seri Iskandar Golf Range',
      mapLink: 'https://maps.google.com/?q=4.6512,101.0651',
      lat: 4.6512,
      lng: 101.0651,
      upvoteCount: 53,
      replyCount: 2,
      saveCount: 20,
      daysAgo: 2,
      hoursAgo: 10,
      bgHex: '#78350F',
      accentHex: '#F59E0B'
    },
    {
      id: 'spot-pitch-18',
      userIndex: 5,
      category: 'activities',
      campus: 'utm',
      placeName: 'Futsal Arena & Molly Fantasy Arcade Combo',
      title: 'Gelanggang Futsal FIFA Turf RM80/Jam (RM8 Seorang Kongsi 10 Orang)',
      shortTip: 'Guna butang "Split with a friend" dalam KampusKash Wallet untuk kutip duit court daripada kawan!',
      body: 'Rumput tiruan tebal, bola disediakan 2 biji percuma. Lepas main futsal boleh singgah arked sebelah (token RM0.50).',
      pricePerMeal: 8.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'buka-lewat', 'student-deal'],
      address: 'Taman Universiti, Skudai / Seri Iskandar',
      mapLink: 'https://maps.google.com/?q=1.5421,103.6285',
      lat: 1.5421,
      lng: 103.6285,
      upvoteCount: 68,
      replyCount: 3,
      saveCount: 29,
      daysAgo: 3,
      hoursAgo: 4,
      bgHex: '#92400E',
      accentHex: '#FBBF24'
    },

    // --- STUDY SPOTS (4 spots) ---
    {
      id: 'spot-pitch-19',
      userIndex: 1,
      category: 'study',
      campus: 'um',
      placeName: 'ZUS Coffee Student Study Lounge',
      title: 'Kopi RM6.90 + Plug Point Setiap Meja & Wi-Fi 300Mbps',
      shortTip: 'Daftar akaun pelajar dalam aplikasi untuk baucar Buy 1 Free 1 setiap minggu peperiksaan.',
      body: 'Meja panjang sesuai untuk buka laptop dan iPad serentak. Aircond nyaman, muzik lo-fi perlahan.',
      pricePerMeal: 6.90,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'wifi-plug', 'aircond', 'student-deal'],
      address: 'Bangsar South / Seri Iskandar Prima',
      mapLink: 'https://maps.google.com/?q=3.1125,101.6628',
      lat: 3.1125,
      lng: 101.6628,
      upvoteCount: 79,
      replyCount: 3,
      saveCount: 44,
      daysAgo: 0,
      hoursAgo: 6,
      bgHex: '#1E3A8A',
      accentHex: '#60A5FA'
    },
    {
      id: 'spot-pitch-20',
      userIndex: 0,
      category: 'study',
      campus: 'utp',
      placeName: 'Perpustakaan IRC 24-Hour Study Pod UTP',
      title: 'Zon Belajar 24 Jam Percuma + Bilik Diskusi Kedap Bunyi',
      shortTip: 'Bawa botol air dan sweater tebal! Mesin kopi layan diri RM2.50 ada di tingkat bawah.',
      body: 'Spot paling fokus waktu minggu study week. Internet kampus laju dan kerusi ergonomik selesa.',
      pricePerMeal: 0.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'wifi-plug', 'aircond', 'buka-lewat'],
      address: 'Information Resource Centre (IRC), UTP',
      mapLink: 'https://maps.google.com/?q=4.3849,100.9742',
      lat: 4.3849,
      lng: 100.9742,
      upvoteCount: 91,
      replyCount: 4,
      saveCount: 52,
      daysAgo: 1,
      hoursAgo: 8,
      bgHex: '#1E40AF',
      accentHex: '#38BDF8'
    },
    {
      id: 'spot-pitch-21',
      userIndex: 3,
      category: 'study',
      campus: 'usm',
      placeName: 'BookXcess Glasshouse Study Corner',
      title: 'Meja Bacaan Tenang Dikelilingi Buku + Americano RM7.50',
      shortTip: 'Tunjuk kad pelajar di kafe dalam kedai buku untuk diskaun RM2 minuman.',
      body: 'Pencahayaan semula jadi cantik, sangat tenang untuk baca jurnal atau tulis tesis FYP.',
      pricePerMeal: 7.50,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'wifi-plug', 'aircond', 'student-deal'],
      address: 'Gurney Paragon / Kong Heng Ipoh',
      mapLink: 'https://maps.google.com/?q=5.4368,100.3112',
      lat: 5.4368,
      lng: 100.3112,
      upvoteCount: 46,
      replyCount: 1,
      saveCount: 23,
      daysAgo: 3,
      hoursAgo: 9,
      bgHex: '#0C4A6E',
      accentHex: '#7DD3FC'
    },
    {
      id: 'spot-pitch-22',
      userIndex: 4,
      category: 'study',
      campus: 'ukm',
      placeName: 'Kompleks Siswa Co-Working Hub',
      title: 'Pas Harian Co-Working Pelajar RM5 (Termasuk Kopi & Teh Refill)',
      shortTip: 'Ada monitor kedua (HDMI) boleh pinjam percuma untuk pelajar Sains Komputer & Kejuruteraan.',
      body: 'Pantry lengkap dengan air panas, biskut percuma dan bilik mesyuarat whiteboard.',
      pricePerMeal: 5.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'wifi-plug', 'aircond', 'student-deal'],
      address: 'Aras 2, Pusanika UKM Bangi',
      mapLink: 'https://maps.google.com/?q=2.9278,101.7801',
      lat: 2.9278,
      lng: 101.7801,
      upvoteCount: 55,
      replyCount: 2,
      saveCount: 28,
      daysAgo: 4,
      hoursAgo: 7,
      bgHex: '#312E81',
      accentHex: '#818CF8'
    },

    // --- SERVICES (3 spots: printing, laundry, laptop repair) ---
    {
      id: 'spot-pitch-23',
      userIndex: 4,
      category: 'services',
      campus: 'ukm',
      placeName: 'Kedai Print & Binding Murah Abang Man',
      title: 'Cetak Hitam Putih 3 Sen/Helai + Comb Binding RM2.00!',
      shortTip: 'Hantar PDF ikut Telegram kedai sebelum datang, sampai terus ambil tanpa beratur.',
      body: 'Penyelamat waktu nak hantar laporan makmal dan tesis FYP tebal. Kertas 80gsm berkualiti.',
      pricePerMeal: 2.50,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'student-deal'],
      address: 'Deretan Kedai Kolej / Pintu Belakang Kampus',
      mapLink: 'https://maps.google.com/?q=2.9291,101.7755',
      lat: 2.9291,
      lng: 101.7755,
      upvoteCount: 84,
      replyCount: 3,
      saveCount: 49,
      daysAgo: 0,
      hoursAgo: 12,
      bgHex: '#334155',
      accentHex: '#94A3B8'
    },
    {
      id: 'spot-pitch-24',
      userIndex: 5,
      category: 'services',
      campus: 'utm',
      placeName: 'Dobi Layan Diri BubbleLab 24 Jam',
      title: 'Basuh 14kg RM4.00 Sahaja (Sabun & Softener Automatik Percuma)',
      shortTip: 'Datang antara 9 pagi–12 tengah hari hari Selasa untuk diskaun RM1 pengering (dryer).',
      body: 'Mesin bersih, boleh bayar guna QR e-wallet, ada Wi-Fi percuma sementara tunggu baju siap kering 30 minit.',
      pricePerMeal: 4.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'buka-lewat', 'wifi-plug'],
      address: 'Taman Sri Iskandar / Taman Universiti',
      mapLink: 'https://maps.google.com/?q=4.3782,100.9698',
      lat: 4.3782,
      lng: 100.9698,
      upvoteCount: 49,
      replyCount: 1,
      saveCount: 18,
      daysAgo: 2,
      hoursAgo: 15,
      bgHex: '#1E293B',
      accentHex: '#64748B'
    },
    {
      id: 'spot-pitch-25',
      userIndex: 0,
      category: 'services',
      campus: 'utp',
      placeName: 'FixIt Student Tech & Laptop Clinic',
      title: 'Cuci Habuk Kipas Laptop + Tukar Thermal Paste RM25 (Siap 45 Minit)',
      shortTip: 'Pemeriksaan kerosakan (diagnostic) percuma 100% untuk pelajar universiti.',
      body: 'Kalau laptop selalu panas atau bunyi bising waktu run kod / AutoCAD, hantar sini. Jujur dan tak ketuk harga.',
      pricePerMeal: 25.00,
      studentPrice: true,
      rating: 5,
      tags: ['student-deal', 'aircond'],
      address: 'Bandar Universiti, Seri Iskandar',
      mapLink: 'https://maps.google.com/?q=4.3695,100.9621',
      lat: 4.3695,
      lng: 100.9621,
      upvoteCount: 61,
      replyCount: 2,
      saveCount: 33,
      daysAgo: 5,
      hoursAgo: 4,
      bgHex: '#0F172A',
      accentHex: '#38BDF8'
    },

    // --- FREE EVENTS & PROMOS (3 spots) ---
    {
      id: 'spot-pitch-26',
      userIndex: 6,
      category: 'events',
      campus: 'upm',
      placeName: 'Dewan Besar Karnival Kerjaya & Tech Expo',
      title: 'PERCUMA: Makan Tengah Hari, Totebag Eksklusif & Semakan Resume AI',
      shortTip: 'Daftar di meja pendaftaran sebelum 11 pagi untuk kupon makan tengah hari dan cabutan bertuah fon kepala.',
      body: 'Lebih 40 syarikat teknologi & kejuruteraan buka temuduga latihan industri (internship). Masuk percuma!',
      pricePerMeal: 0.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'student-deal', 'aircond'],
      address: 'Dewan Canselor Kampus Utama',
      mapLink: 'https://maps.google.com/?q=3.0012,101.7058',
      lat: 3.0012,
      lng: 101.7058,
      upvoteCount: 95,
      replyCount: 4,
      saveCount: 56,
      daysAgo: 0,
      hoursAgo: 3,
      bgHex: '#831843',
      accentHex: '#F472B6'
    },
    {
      id: 'spot-pitch-27',
      userIndex: 3,
      category: 'events',
      campus: 'usm',
      placeName: 'Malam Wayang Pacak & Kopi Percuma Padang Kawad',
      title: 'Tayangan Filem Outdoor Percuma + Popcorn & Sirap Bandung Free!',
      shortTip: 'Bawa tikar atau kerusi healing sendiri. 200 pelajar terawal dapat kupon popcorn percuma.',
      body: 'Anjuran Majlis Perwakilan Pelajar hujung minggu ini pukul 8.30 malam. Masuk percuma untuk semua warga kampus.',
      pricePerMeal: 0.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'student-deal', 'buka-lewat'],
      address: 'Padang Kawad Utama Kampus',
      mapLink: 'https://maps.google.com/?q=5.3551,100.3025',
      lat: 5.3551,
      lng: 100.3025,
      upvoteCount: 73,
      replyCount: 2,
      saveCount: 35,
      daysAgo: 1,
      hoursAgo: 9,
      bgHex: '#9D174D',
      accentHex: '#FB7185'
    },
    {
      id: 'spot-pitch-28',
      userIndex: 1,
      category: 'events',
      campus: 'um',
      placeName: 'Pop-Up Booth Diskaun Pelajar KampusKash x Kafe Siswa',
      title: 'Tebus Baucar Kopi & Pastri RM2.00 Sempena Minggu Orientasi',
      shortTip: 'Tunjuk profil KampusKash anda di booth untuk dapat pelekat (sticker pack) edisi terhad percuma!',
      body: 'Promosi khas untuk pelajar baharu dan senior. Ada sesi kuiz literasi kewangan pantas dengan hadiah menarik.',
      pricePerMeal: 2.00,
      studentPrice: true,
      rating: 5,
      tags: ['bawah-rm10', 'student-deal'],
      address: 'Dataran Pelajar / Gazebo Fakulti',
      mapLink: 'https://maps.google.com/?q=3.1215,101.6542',
      lat: 3.1215,
      lng: 101.6542,
      upvoteCount: 66,
      replyCount: 2,
      saveCount: 30,
      daysAgo: 2,
      hoursAgo: 6,
      bgHex: '#701A75',
      accentHex: '#E879F9'
    }
  ];

  const hydratedNewSpots = additionalRawSpots.map((s) => {
    const author = PITCH_DEMO_USERS[s.userIndex % PITCH_DEMO_USERS.length];
    const commenter = PITCH_DEMO_USERS[(s.userIndex + 1) % PITCH_DEMO_USERS.length];
    const createdAt = getIso(s.daysAgo, s.hoursAgo);
    return migrateLegacyThreadToSpot({
      id: s.id,
      authorId: author.id,
      authorName: author.username,
      authorUsername: author.handle,
      authorAvatar: author.avatar,
      authorUniversity: author.university,
      category: s.category,
      campus: s.campus,
      placeName: s.placeName,
      title: s.title,
      shortTip: s.shortTip,
      body: s.body,
      pricePerMeal: s.pricePerMeal,
      price: s.pricePerMeal,
      priceRange: s.pricePerMeal === 0 ? 'Free' : `RM${s.pricePerMeal.toFixed(2)}`,
      budgetTag: getBudgetTagForPrice(s.pricePerMeal),
      studentPrice: s.studentPrice,
      photoUrl: generateSpotIllustrationSvg(s.category, s.placeName, s.bgHex, s.accentHex),
      rating: s.rating,
      tags: s.tags,
      address: s.address,
      mapLink: s.mapLink,
      lat: s.lat,
      lng: s.lng,
      upvoteCount: s.upvoteCount,
      likeCount: s.upvoteCount,
      replyCount: s.replyCount,
      commentCount: s.replyCount,
      saveCount: s.saveCount,
      reportCount: 0,
      status: 'active',
      isPitchDemo: true,
      createdAt,
      updatedAt: createdAt,
      replies: [
        {
          id: `rep-${s.id}-1`,
          authorId: commenter.id,
          authorName: commenter.username,
          authorUsername: commenter.handle,
          authorAvatar: commenter.avatar,
          authorUniversity: commenter.university,
          body: `Terima kasih kongsi port ni @${author.handle}! Memang jimat untuk bajet pelajar minggu ni.`,
          createdAt: getIso(Math.max(0, s.daysAgo - 1), 1)
        }
      ]
    });
  });

  return [...legacyMakanThreads, ...hydratedNewSpots];
}

/**
 * Generates initial follows between the 8 demo users
 * Ensures Account 1 (Aiman) and Account 2 (Sarah) follow each other and several peers.
 */
export function generatePitchFollows(baseDate = new Date()) {
  const now = baseDate.toISOString();
  const pairs = [
    ['demo-student-aiman', 'demo-student-sarah'],
    ['demo-student-aiman', 'demo-student-luqman'],
    ['demo-student-aiman', 'demo-student-weilun'],
    ['demo-student-aiman', 'demo-student-huda'],
    ['demo-student-sarah', 'demo-student-aiman'],
    ['demo-student-sarah', 'demo-student-priya'],
    ['demo-student-sarah', 'demo-student-huda'],
    ['demo-student-luqman', 'demo-student-aiman'],
    ['demo-student-luqman', 'demo-student-sarah'],
    ['demo-student-weilun', 'demo-student-aiman'],
    ['demo-student-huda', 'demo-student-sarah'],
    ['demo-student-amirul', 'demo-student-aiman'],
    ['demo-student-priya', 'demo-student-sarah'],
    ['demo-student-danial', 'demo-student-aiman']
  ];

  return pairs.map(([followerId, followingId]) => ({
    id: `${followerId}_${followingId}`,
    followerId,
    followingId,
    isPitchDemo: true,
    createdAt: now
  }));
}

/**
 * Generates initial demo wallet ledger entries & money requests
 */
export function generatePitchWalletData(baseDate = new Date()) {
  const getIso = (daysAgo, hoursAgo = 0) =>
    new Date(baseDate.getTime() - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();

  const wallets = {};
  PITCH_DEMO_USERS.forEach((u) => {
    wallets[u.id] = {
      userId: u.id,
      username: u.username,
      handle: u.handle,
      balance: typeof u.walletBalance === 'number' ? u.walletBalance : INITIAL_DEMO_WALLET_BALANCE,
      currency: 'RM',
      pinHash: '1234',
      pinSet: true,
      autoSyncTracker: true,
      dailyTransferredAmount: 12.50,
      dailyLimitDate: baseDate.toISOString().split('T')[0],
      isDemoWallet: true,
      isPitchDemo: true,
      createdAt: getIso(10),
      updatedAt: getIso(0, 2)
    };
  });

  const ledger = [
    {
      id: 'ledger-pitch-1',
      idempotencyKey: 'idem-pitch-topup-aiman',
      type: 'topup',
      senderId: 'DEMO_BANK_MAYBANK2U',
      senderName: 'Maybank2u / MAE (Demo FPX)',
      senderHandle: 'maybank2u',
      receiverId: 'demo-student-aiman',
      receiverName: 'Aiman Hafiz',
      receiverHandle: 'aiman_utp',
      amount: 50.00,
      currency: 'RM',
      note: 'Simulated Student Allowance Top-Up',
      status: 'completed',
      isDemo: true,
      isPitchDemo: true,
      createdAt: getIso(3, 5)
    },
    {
      id: 'ledger-pitch-2',
      idempotencyKey: 'idem-pitch-transfer-1',
      type: 'transfer',
      senderId: 'demo-student-aiman',
      senderName: 'Aiman Hafiz',
      senderHandle: 'aiman_utp',
      receiverId: 'demo-student-sarah',
      receiverName: 'Sarah Dania',
      receiverHandle: 'sarah_um',
      amount: 12.50,
      currency: 'RM',
      note: 'Kongsi kopi & pastri ZUS study group ☕',
      status: 'completed',
      isDemo: true,
      isPitchDemo: true,
      createdAt: getIso(0, 6)
    },
    {
      id: 'ledger-pitch-3',
      idempotencyKey: 'idem-pitch-transfer-2',
      type: 'transfer',
      senderId: 'demo-student-luqman',
      senderName: 'Luqman Hakim',
      senderHandle: 'luqman_uitm',
      receiverId: 'demo-student-aiman',
      receiverName: 'Aiman Hafiz',
      receiverHandle: 'aiman_utp',
      amount: 8.00,
      currency: 'RM',
      note: 'Bayar bahagian gelanggang futsal malam tadi ⚽',
      status: 'completed',
      isDemo: true,
      isPitchDemo: true,
      createdAt: getIso(1, 3)
    }
  ];

  const requests = [
    {
      id: 'req-pitch-1',
      requesterId: 'demo-student-sarah',
      requesterName: 'Sarah Dania',
      requesterHandle: 'sarah_um',
      requesterAvatar: 'preset-scholar',
      payerId: 'demo-student-aiman',
      payerName: 'Aiman Hafiz',
      payerHandle: 'aiman_utp',
      amount: 9.50,
      originalTotalAmount: 19.00,
      isSplitBill: true,
      currency: 'RM',
      note: 'Split Bill (50/50): Set Dim Sum Canning RM19.00',
      status: 'pending',
      isPitchDemo: true,
      createdAt: getIso(0, 1)
    },
    {
      id: 'req-pitch-2',
      requesterId: 'demo-student-aiman',
      requesterName: 'Aiman Hafiz',
      requesterHandle: 'aiman_utp',
      requesterAvatar: 'preset-techie',
      payerId: 'demo-student-sarah',
      payerName: 'Sarah Dania',
      payerHandle: 'sarah_um',
      amount: 6.00,
      originalTotalAmount: 12.00,
      isSplitBill: true,
      currency: 'RM',
      note: 'Split Bill (50/50): Sewa Gelanggang Badminton RM12.00',
      status: 'pending',
      isPitchDemo: true,
      createdAt: getIso(0, 2)
    }
  ];

  const notifications = [
    {
      id: 'notif-pitch-1',
      recipientId: 'demo-student-aiman',
      actorId: 'demo-student-sarah',
      actorName: 'Sarah Dania',
      actorHandle: 'sarah_um',
      actorAvatar: 'preset-scholar',
      type: 'wallet_request',
      title: 'Permintaan Kongsi Bil (Split Bill)',
      message: 'Sarah Dania (@sarah_um) meminta RM9.50 untuk "Split Bill (50/50): Set Dim Sum Canning RM19.00".',
      relatedId: 'req-pitch-1',
      amount: 9.50,
      read: false,
      isPitchDemo: true,
      createdAt: getIso(0, 1)
    },
    {
      id: 'notif-pitch-2',
      recipientId: 'demo-student-aiman',
      actorId: 'demo-student-luqman',
      actorName: 'Luqman Hakim',
      actorHandle: 'luqman_uitm',
      actorAvatar: 'preset-explorer',
      type: 'wallet_received',
      title: 'Wang Demo Diterima (+RM8.00)',
      message: 'Luqman Hakim (@luqman_uitm) menghantar RM8.00: "Bayar bahagian gelanggang futsal malam tadi ⚽".',
      relatedId: 'ledger-pitch-3',
      amount: 8.00,
      read: false,
      isPitchDemo: true,
      createdAt: getIso(1, 3)
    },
    {
      id: 'notif-pitch-3',
      recipientId: 'demo-student-aiman',
      actorId: 'demo-student-weilun',
      actorName: 'Chong Wei Lun',
      actorHandle: 'weilun_usm',
      actorAvatar: 'preset-scientist',
      type: 'follow',
      title: 'Pengikut Baharu',
      message: 'Chong Wei Lun (@weilun_usm) mula mengikuti profil pelajar anda.',
      relatedId: 'demo-student-weilun',
      read: false,
      isPitchDemo: true,
      createdAt: getIso(1, 5)
    },
    {
      id: 'notif-pitch-4',
      recipientId: 'demo-student-sarah',
      actorId: 'demo-student-aiman',
      actorName: 'Aiman Hafiz',
      actorHandle: 'aiman_utp',
      actorAvatar: 'preset-techie',
      type: 'wallet_received',
      title: 'Wang Demo Diterima (+RM12.50)',
      message: 'Aiman Hafiz (@aiman_utp) menghantar RM12.50: "Kongsi kopi & pastri ZUS study group ☕".',
      relatedId: 'ledger-pitch-2',
      amount: 12.50,
      read: false,
      isPitchDemo: true,
      createdAt: getIso(0, 6)
    },
    {
      id: 'notif-pitch-5',
      recipientId: 'demo-student-sarah',
      actorId: 'demo-student-aiman',
      actorName: 'Aiman Hafiz',
      actorHandle: 'aiman_utp',
      actorAvatar: 'preset-techie',
      type: 'wallet_request',
      title: 'Permintaan Kongsi Bil (Split Bill)',
      message: 'Aiman Hafiz (@aiman_utp) meminta RM6.00 untuk "Split Bill (50/50): Sewa Gelanggang Badminton RM12.00".',
      relatedId: 'req-pitch-2',
      amount: 6.00,
      read: false,
      isPitchDemo: true,
      createdAt: getIso(0, 2)
    }
  ];

  return { wallets, ledger, requests, notifications };
}

