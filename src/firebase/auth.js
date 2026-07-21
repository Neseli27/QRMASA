import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, firebaseConfigurationError } from './config';

function requireAuth() {
  if (firebaseConfigurationError || !auth) {
    throw new Error(firebaseConfigurationError || 'Firebase Authentication başlatılamadı.');
  }
  return auth;
}

export function waitForAuthUser() {
  try {
    const firebaseAuth = requireAuth();
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        firebaseAuth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        reject,
      );
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

export async function ensureAnonymousCustomer() {
  const firebaseAuth = requireAuth();
  const currentUser = await waitForAuthUser();

  if (currentUser) return currentUser;

  const credential = await signInAnonymously(firebaseAuth);
  return credential.user;
}

export async function signInStaff(email, password) {
  const firebaseAuth = requireAuth();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error('E-posta ve şifre alanlarını doldurun.');
  }

  const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
  return credential.user;
}

export async function signInStaffWithGoogle() {
  const firebaseAuth = requireAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const credential = await signInWithPopup(firebaseAuth, provider);
  return credential.user;
}

export async function signOutStaff() {
  const firebaseAuth = requireAuth();
  await signOut(firebaseAuth);
}
