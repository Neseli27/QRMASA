import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { collections } from '../lib/paths';

const AuthContext = createContext(null);

/**
 * AuthProvider
 * -------------
 * - Firebase Auth oturumunu takip eder.
 * - /users/{uid} dokümanından rol (superadmin | venue_admin | waiter) ve venueId alır.
 * - Müşteri anonim ise rol olmaz; sadece Firebase Auth uid ile session tutulur.
 *
 * ÖNEMLİ: Rol bilgisi SADECE Firestore'dan okunur, client'ta güvenilmez.
 * Gerçek yetkilendirme Firestore Rules ve Cloud Functions tarafında yapılır.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // { role, venueId, displayName, ... }
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      // Önceki profile listener'ı kapat
      if (unsubProfile) {
        try { unsubProfile(); } catch (e) { /* sessiz */ }
        unsubProfile = null;
      }

      setUser(fbUser);
      setProfileLoaded(false);
      setProfile(null);

      // Kullanıcı yok → loading biter
      if (!fbUser) {
        setProfileLoaded(true);
        setLoading(false);
        return;
      }

      // Anonim kullanıcı → rol bilgisi yok, hızlıca biter
      if (fbUser.isAnonymous) {
        setProfileLoaded(true);
        setLoading(false);
        return;
      }

      // UID validation — boş uid doc() hatası verir
      if (!fbUser.uid || typeof fbUser.uid !== 'string' || fbUser.uid.length === 0) {
        console.warn('[Auth] Geçersiz uid:', fbUser);
        setProfileLoaded(true);
        setLoading(false);
        return;
      }

      // Rol dokümanını dinle
      try {
        const ref = doc(db, collections.users, fbUser.uid);
        unsubProfile = onSnapshot(
          ref,
          (snap) => {
            setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
            setProfileLoaded(true);
            setLoading(false);
          },
          (err) => {
            console.error('[Auth] users okuma hatası:', err);
            setProfile(null);
            setProfileLoaded(true);
            setLoading(false);
          }
        );
      } catch (e) {
        console.error('[Auth] doc() hata:', e);
        setProfileLoaded(true);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) {
        try { unsubProfile(); } catch (e) { /* sessiz */ }
      }
    };
  }, []);

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.error('[Auth] signOut hata:', e);
    }
  };

  const hasRole = (...roles) => profile?.role && roles.includes(profile.role);

  const value = {
    user,
    profile,
    profileLoaded,
    loading,
    signOut,
    hasRole,
    role: profile?.role || null,
    venueId: profile?.venueId || null,
    isAuthed: !!user && !user.isAnonymous,
    isAnon: !!user?.isAnonymous
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
