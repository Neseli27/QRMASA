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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      // Önceki profile listener'ı kapat
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(fbUser);

      if (fbUser && !fbUser.isAnonymous) {
        // QRMasa rol dokümanını dinle — rol değişikliğinde anında yansısın
        const ref = doc(db, collections.userRoles, fbUser.uid);
        unsubProfile = onSnapshot(
          ref,
          (snap) => {
            setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
            setLoading(false);
          },
          (err) => {
            console.error('[Auth] users okuma hatası:', err);
            setProfile(null);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
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
