import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut
} from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * useAuthActions — Auth işlemleri için hook
 * Loading + error state yönetir, basit çağrılar sunar.
 */
export function useAuthActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signInWithEmail = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { user: cred.user, error: null };
    } catch (e) {
      const message = translateAuthError(e.code);
      setError(message);
      return { user: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      return { user: cred.user, error: null };
    } catch (e) {
      const message = translateAuthError(e.code);
      setError(message);
      return { user: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.error('[Auth] signOut:', e);
    }
  };

  return { signInWithEmail, signInWithGoogle, signOut, loading, error, setError };
}

/**
 * Firebase Auth hata kodlarını Türkçeye çevirir
 */
function translateAuthError(code) {
  const messages = {
    'auth/invalid-email': 'Geçersiz e-posta adresi',
    'auth/user-disabled': 'Hesap devre dışı bırakılmış',
    'auth/user-not-found': 'Böyle bir hesap bulunamadı',
    'auth/wrong-password': 'Hatalı şifre',
    'auth/invalid-credential': 'E-posta veya şifre hatalı',
    'auth/too-many-requests': 'Çok fazla deneme — birazdan tekrar dene',
    'auth/network-request-failed': 'İnternet bağlantısı sorunu',
    'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı',
    'auth/popup-blocked': 'Pop-up tarayıcı tarafından engellendi',
    'auth/operation-not-allowed': 'Bu giriş yöntemi aktif değil',
    'auth/email-already-in-use': 'Bu e-posta zaten kullanımda',
    'auth/weak-password': 'Şifre çok zayıf (en az 6 karakter)'
  };
  return messages[code] || 'Bir şeyler ters gitti. Tekrar dene.';
}
