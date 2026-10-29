/**
 * Multi-language labels & translation dictionary for KampusKash (KiroKash)
 * Supports English ('en') and Bahasa Melayu ('ms') across Auth, Spot Jimat,
 * Social Profiles, Notifications, Demo Wallet, and Pitch Mode.
 */
import { SPOT_FEED_NAME, DEMO_WALLET_BADGE_TEXT, PAY_SECTION_NAME } from '../config/appConstants.js';

export const AUTH_LABELS = {
  en: {
    // Authentication
    continueWithGoogle: 'Continue with Google',
    continueWithMicrosoft: 'Continue with Microsoft',
    orWithEmail: 'OR WITH EMAIL & PASSWORD',
    backToHome: 'Back to home',
    signInWithOriginal: (method) =>
      `An account with this email already exists using ${method}. Please sign in with ${method} so we can link your Microsoft account.`,

    // Navigation & Page Titles
    spotFeedTitle: SPOT_FEED_NAME,
    spotFeedPageTitle: `${SPOT_FEED_NAME} (Student Spots)`,
    payNavLabel: PAY_SECTION_NAME,
    payPageTitle: `${PAY_SECTION_NAME} — QR & Instant Transfer`,
    scanQrBtnLabel: 'Scan QR',
    scanPayBtnLabel: 'Scan / Pay',
    scanTabLabel: 'Scan QR',
    myQrTabLabel: 'My QR',
    transferTabLabel: 'Transfer',
    requestTabLabel: 'Request',
    addMoneyBtnLabel: 'Add money',
    sendShortcutLabel: 'Send',
    receiveShortcutLabel: 'Receive',
    kampusKashAccountLabel: 'KampusKash',
    favouritesLabel: 'Favourites',
    recentRecipientsLabel: 'Recent Recipients',
    pendingRequestsLabel: 'Pending Requests',
    recentActivityLabel: 'Recent Activity',
    seeAllLabel: 'See all',
    brightnessBoostLabel: 'Brightness boost',

    // Spot Jimat Feed
    spotFeedSubtitle: 'Budget makan, thrift, sports, study spots & student promos across campus',
    shareSpotBtn: 'Share Spot',
    editSpotBtn: 'Edit Spot',
    deleteSpotBtn: 'Delete Spot',
    reportSpotBtn: 'Report',
    saveSpotBtn: 'Save',
    savedSpotBtn: 'Saved',
    tabExplore: 'Explore',
    tabFollowing: 'Following',
    tabSaved: 'Saved Bookmarks',
    sortTrending: 'Trending this week',
    sortNewest: 'Newest',
    sortNearest: 'Nearest to me',
    sortCheapest: 'Cheapest',
    budgetAll: 'All Budgets',
    budgetUnder5: 'Under RM5',
    budget5To15: 'RM5 to RM15',
    budget15To30: 'RM15 to RM30',
    budget30Plus: 'RM30 and above',
    studentPriceBadge: 'Student Price',
    studentPriceToggle: 'Has special Student Price / Student ID discount',
    uploadPhotoLabel: 'Spot Photo (JPEG, PNG, WebP up to 5MB — auto-compressed)',
    shortTipLabel: 'Short Student Tip',
    mapLinkLabel: 'Google Maps / Waze Link or Coordinates',
    locationFallbackNotice: 'Location permission was denied or unavailable. Showing spots near default campus coordinates.',
    loadMoreSpots: 'Load More Spots',
    emptyFollowingTitle: 'No spots from people you follow yet',
    emptyFollowingSub: 'Follow fellow students in Explore to see their latest campus spots here.',
    offlineFeedNotice: 'You are currently offline. Viewing cached campus spots — posting and live updates will resume when online.',

    // Social Layer & Profiles
    publicProfileTitle: 'Student Public Profile',
    followBtn: 'Follow',
    followingBtn: 'Following',
    unfollowBtn: 'Unfollow',
    followersLabel: 'Followers',
    followingLabel: 'Following',
    postsLabel: 'Spots',
    savedTabPrivateNote: 'Only visible to you',
    blockUserBtn: 'Block User',
    unblockUserBtn: 'Unblock User',
    reportUserBtn: 'Report User',
    sendMoneyProfileBtn: 'Send Money',
    splitBillProfileBtn: 'Split with Friend',
    privacyGuaranteeTitle: 'Strict Financial Privacy Guarantee',
    privacyGuaranteeBody: 'Your financial data (account balances, monthly budgets, tracker transactions, savings goals, and wallet history) is ALWAYS strictly private and NEVER appears on your public student profile.',
    notificationsTitle: 'Notifications',
    markAllReadBtn: 'Mark all read',
    noNotifications: 'No notifications yet. Follow friends or share a spot!',

    // Demo Wallet
    demoModeBadge: DEMO_WALLET_BADGE_TEXT,
    walletFirstUseTitle: 'Welcome to KampusKash Demo Wallet',
    walletFirstUseBody: 'This wallet is a simulation built for the KampusKash pitch. All balances (starting with RM100.00 demo credit), top-ups, transfers, and QR payments use simulated credits — no real money or bank accounts are charged.',
    walletBalanceLabel: 'Available Demo Balance',
    topUpBtn: 'Top Up',
    sendMoneyBtn: 'Send Money',
    requestMoneyBtn: 'Request Money',
    splitWithFriendBtn: 'Split Bill (50/50)',
    myQrBtn: 'My QR & Pay Code',
    pasteCodeBtn: 'Paste Code to Pay',
    autoSyncTrackerLabel: 'Auto-log transfers to Finance Tracker ("Transfer" category)',
    setPinTitle: 'Set Your 4-Digit Demo PIN',
    enterPinTitle: 'Enter 4-Digit Demo PIN to Confirm',
    limitPerTransferNote: 'Max per transfer: RM200.00 • Daily limit: RM500.00',
    viewWalletReceipt: 'View Wallet Receipt',
    offlineWalletNotice: 'You are offline. Live wallet transfers and top-ups require an internet connection to verify atomic ledger integrity.',

    // Pitch Mode
    pitchModeTitle: 'Pitch Mode (Developer & Demo Tools)',
    loadDemoDataBtn: 'Load Demo Data (8 Users, 28 Spots & Wallet Ledger)',
    resetDemoDataBtn: 'Reset Demo Data',
    quickSwitchAccountLabel: 'Quick Account Switcher (Live Recording)'
  },
  ms: {
    // Authentication
    continueWithGoogle: 'Teruskan dengan Google',
    continueWithMicrosoft: 'Teruskan dengan Microsoft',
    orWithEmail: 'ATAU DENGAN EMEL & KATA LALUAN',
    backToHome: 'Kembali ke laman utama',
    signInWithOriginal: (method) =>
      `Akaun dengan emel ini sudah wujud menggunakan ${method}. Sila log masuk dengan ${method} untuk memautkan akaun Microsoft anda.`,

    // Navigation & Page Titles
    spotFeedTitle: SPOT_FEED_NAME,
    spotFeedPageTitle: `${SPOT_FEED_NAME} (Port Pelajar)`,
    payNavLabel: 'Bayar',
    payPageTitle: `${PAY_SECTION_NAME} — Imbas QR & Pindahan Segera`,
    scanQrBtnLabel: 'Imbas QR',
    scanPayBtnLabel: 'Imbas / Bayar',
    scanTabLabel: 'Imbas QR',
    myQrTabLabel: 'QR Saya',
    transferTabLabel: 'Pindah Wang',
    requestTabLabel: 'Minta Wang',
    addMoneyBtnLabel: 'Tambah nilai',
    sendShortcutLabel: 'Hantar',
    receiveShortcutLabel: 'Terima',
    kampusKashAccountLabel: 'KampusKash',
    favouritesLabel: 'Kegemaran',
    recentRecipientsLabel: 'Penerima Terkini',
    pendingRequestsLabel: 'Permintaan Menunggu',
    recentActivityLabel: 'Aktiviti Terkini',
    seeAllLabel: 'Lihat semua',
    brightnessBoostLabel: 'Tingkat kecerahan',

    // Spot Jimat Feed
    spotFeedSubtitle: 'Port makan, thrift, sukan, study spot & diskaun pelajar seluruh kampus',
    shareSpotBtn: 'Kongsi Spot',
    editSpotBtn: 'Edit Spot',
    deleteSpotBtn: 'Padam Spot',
    reportSpotBtn: 'Lapor',
    saveSpotBtn: 'Simpan',
    savedSpotBtn: 'Disimpan',
    tabExplore: 'Teroka (Explore)',
    tabFollowing: 'Diikuti (Following)',
    tabSaved: 'Simpanan Saya',
    sortTrending: 'Trending Minggu Ini',
    sortNewest: 'Terkini',
    sortNearest: 'Paling Dekat',
    sortCheapest: 'Paling Murah',
    budgetAll: 'Semua Bajet',
    budgetUnder5: 'Bawah RM5',
    budget5To15: 'RM5 hingga RM15',
    budget15To30: 'RM15 hingga RM30',
    budget30Plus: 'RM30 ke atas',
    studentPriceBadge: 'Harga Pelajar',
    studentPriceToggle: 'Ada diskaun Harga Pelajar / Kad Matrik',
    uploadPhotoLabel: 'Foto Spot (JPEG, PNG, WebP sehingga 5MB — dimampatkan automatik)',
    shortTipLabel: 'Tip Ringkas Pelajar',
    mapLinkLabel: 'Pautan Google Maps / Waze atau Koordinat',
    locationFallbackNotice: 'Akses lokasi ditolak atau tidak tersedia. Menampilkan spot berhampiran koordinat kampus.',
    loadMoreSpots: 'Muat Lagi Spot',
    emptyFollowingTitle: 'Tiada spot daripada rakan yang diikuti lagi',
    emptyFollowingSub: 'Ikuti pelajar lain di tab Explore untuk melihat perkongsian mereka di sini.',
    offlineFeedNotice: 'Anda sedang luar talian (offline). Memaparkan spot tersimpan.',

    // Social Layer & Profiles
    publicProfileTitle: 'Profil Awam Pelajar',
    followBtn: 'Ikuti',
    followingBtn: 'Diikuti',
    unfollowBtn: 'Nyahikut',
    followersLabel: 'Pengikut',
    followingLabel: 'Mengikuti',
    postsLabel: 'Spot',
    savedTabPrivateNote: 'Hanya dilihat oleh anda',
    blockUserBtn: 'Sekat Pengguna',
    unblockUserBtn: 'Nyahsekat',
    reportUserBtn: 'Lapor Pengguna',
    sendMoneyProfileBtn: 'Hantar Wang',
    splitBillProfileBtn: 'Kongsi Bil (Split)',
    privacyGuaranteeTitle: 'Jaminan Privasi Kewangan Pelajar',
    privacyGuaranteeBody: 'Data kewangan anda (baki akaun, bajet bulanan, rekod transaksi, sasaran simpanan, dan sejarah dompet) adalah SENTIASA peribadi dan TIDAK PERNAH dipaparkan pada profil awam anda.',
    notificationsTitle: 'Notifikasi',
    markAllReadBtn: 'Tanda semua dibaca',
    noNotifications: 'Tiada notifikasi lagi.',

    // Demo Wallet
    demoModeBadge: DEMO_WALLET_BADGE_TEXT,
    walletFirstUseTitle: 'Selamat Datang ke Dompet Demo KampusKash',
    walletFirstUseBody: 'Dompet ini adalah simulasi khas untuk pembentangan KampusKash. Semua baki (bermula RM100.00 kredit demo), tambah nilai, dan pemindahan adalah simulasi tanpa wang sebenar.',
    walletBalanceLabel: 'Baki Demo Tersedia',
    topUpBtn: 'Tambah Nilai',
    sendMoneyBtn: 'Hantar Wang',
    requestMoneyBtn: 'Minta Wang',
    splitWithFriendBtn: 'Bahagi Bil (50/50)',
    myQrBtn: 'Kod QR Saya',
    pasteCodeBtn: 'Tampal Kod Bayaran',
    autoSyncTrackerLabel: 'Rekod pemindahan secara automatik ke Penjejak Kewangan (kategori "Transfer")',
    setPinTitle: 'Tetapkan PIN Demo 4-Digit Anda',
    enterPinTitle: 'Masukkan PIN Demo 4-Digit',
    limitPerTransferNote: 'Had setiap transaksi: RM200.00 • Had harian: RM500.00',
    viewWalletReceipt: 'Lihat Resit Dompet',
    offlineWalletNotice: 'Anda sedang luar talian. Pemindahan dompet memerlukan sambungan internet.',

    // Pitch Mode
    pitchModeTitle: 'Mod Pitch (Alatan Demo & Pembentangan)',
    loadDemoDataBtn: 'Muat Data Demo (8 Pelajar, 28 Spot & Transaksi Dompet)',
    resetDemoDataBtn: 'Reset Data Demo',
    quickSwitchAccountLabel: 'Penukar Akaun Pantas (Rakaman Langsung)'
  }
};

export function getAuthLabel(key, lang = 'en', ...args) {
  const dict = AUTH_LABELS[lang] || AUTH_LABELS.en;
  const value = dict[key] || AUTH_LABELS.en[key] || key;
  if (typeof value === 'function') {
    return value(...args);
  }
  return value;
}

export const t = getAuthLabel;
