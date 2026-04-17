/**
 * QRMasa — Firestore & Storage Path Yardımcıları
 * -----------------------------------------------
 * Tüm path üretimi buradan yapılır. Manuel string birleştirme YAPMA,
 * böylece gelecekte rename gerekirse tek yerden değiştirilebilir.
 */

// ─── Firestore top-level koleksiyonlar ──────────────
export const collections = {
  users: 'users',              // Kullanıcı rolleri: { role, venueId, email, displayName }
  venues: 'venues',            // İşletmeler (ana entite)
  slugIndex: 'slug_index',     // slug → venueId hızlı arama
  superadmin: 'superadmin',    // Global konfigürasyon

  // Venue subcollection isimleri (venueCol helper ile kullanılır)
  sub: {
    categories: 'categories',
    menuItems: 'menu_items',
    tables: 'tables',
    staff: 'staff',
    sessions: 'sessions',
    orders: 'orders',
    customers: 'customers',
    loyaltyTransactions: 'loyalty_transactions',
    campaigns: 'campaigns',
    notifications: 'notifications'
  }
};

/**
 * Venue subcollection path builder.
 * Örnek: venueCol(venueId, 'menu_items') → 'venues/{id}/menu_items'
 */
export function venueCol(venueId, subName) {
  return `${collections.venues}/${venueId}/${subName}`;
}

export function venueDoc(venueId, subName, docId) {
  return `${collections.venues}/${venueId}/${subName}/${docId}`;
}

// ─── Storage path'leri ─────────────────────────────
export const storagePaths = {
  /** Venue logo, favicon, PWA icon */
  branding: (venueId, fileName) => `venues/${venueId}/branding/${fileName}`,

  /** Menü ürün görselleri */
  menuItem: (venueId, itemId, fileName) => `venues/${venueId}/menu/${itemId}/${fileName}`,

  /** Kategori görselleri */
  category: (venueId, catId, fileName) => `venues/${venueId}/categories/${catId}/${fileName}`,

  /** Kampanya görselleri */
  campaign: (venueId, campaignId, fileName) => `venues/${venueId}/campaigns/${campaignId}/${fileName}`
};
