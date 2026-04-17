/**
 * Firebase Konfigürasyonu
 * ------------------------
 * Not: Firebase web config'teki apiKey "gizli" değildir (public), ama Security Rules
 * ve App Check ile koruma sağlıyoruz. Tüm .env değişkenleri VITE_ öneki ile başlamalı.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID
};

// Gerekli env değişkenlerinin varlığını kontrol et
const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
const missing = required.filter((k) => !firebaseConfig[k]);
if (missing.length > 0 && import.meta.env.PROD) {
  // Production'da eksik config ciddi bir hata
  console.error('[Firebase] Eksik konfigürasyon:', missing);
}

export const app = initializeApp(firebaseConfig);

// App Check — Bot koruması, sadece production'da aktif (dev'de debug token kullanılır)
if (import.meta.env.PROD && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } catch (e) {
    console.warn('[AppCheck] Başlatılamadı:', e);
  }
} else if (import.meta.env.DEV) {
  // Dev ortamında debug token kullan — browser console'da ilk çalıştırmada token görünür
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Firestore - offline cache ile (PWA deneyimi)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((e) =>
  console.warn('[Auth] Persistence ayarlanamadı:', e)
);

export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1'); // Türkiye'ye en yakın region
