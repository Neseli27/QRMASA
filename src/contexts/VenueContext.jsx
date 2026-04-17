import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { collections } from '../lib/paths';
import { hexToRgbTriplet } from '../lib/utils';

const VenueContext = createContext(null);

/**
 * VenueProvider
 * --------------
 * Aktif mekânın (venues/{venueId}) brand bilgisini, ayarlarını ve feature
 * toggle'larını realtime dinler. Branding değişince:
 *   - CSS değişkenleri (--brand-rgb vb.) güncellenir
 *   - document.title, favicon ve theme-color meta tag'i yenilenir
 *
 * Sonuç: müşteri tarafında uygulama, o işletmenin kendi uygulamasıymış gibi görünür.
 */
export function VenueProvider({ venueId, children }) {
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Venue dokümanını realtime dinle
  useEffect(() => {
    if (!venueId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, collections.venues, venueId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError('Mekan bulunamadı');
          setVenue(null);
        } else {
          setVenue({ id: snap.id, ...snap.data() });
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[Venue] realtime hata:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [venueId]);

  // Branding değişince CSS variables & meta tag'leri güncelle
  useEffect(() => {
    if (!venue?.branding) return;
    const b = venue.branding;
    const root = document.documentElement;

    if (b.primaryColor) root.style.setProperty('--brand-rgb', hexToRgbTriplet(b.primaryColor));
    if (b.softColor) root.style.setProperty('--brand-soft-rgb', hexToRgbTriplet(b.softColor));
    if (b.accentColor) root.style.setProperty('--brand-accent-rgb', hexToRgbTriplet(b.accentColor));

    // theme-color meta
    const themeMeta = document.getElementById('app-theme-color');
    if (themeMeta && b.primaryColor) themeMeta.setAttribute('content', b.primaryColor);

    // favicon
    const favicon = document.getElementById('app-favicon');
    if (favicon && b.favicon) favicon.setAttribute('href', b.favicon);

    // document.title
    if (b.name) document.title = b.name;
  }, [venue]);

  const getFeature = useCallback(
    (key, defaultValue = false) => {
      if (!venue?.features) return defaultValue;
      return venue.features[key] ?? defaultValue;
    },
    [venue]
  );

  const value = { venue, loading, error, getFeature, venueId };
  return <VenueContext.Provider value={value}>{children}</VenueContext.Provider>;
}

export function useVenue() {
  const ctx = useContext(VenueContext);
  if (!ctx) throw new Error('useVenue VenueProvider içinde kullanılmalı');
  return ctx;
}
