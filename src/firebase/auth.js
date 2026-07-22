import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, firebaseConfigurationError } from './config';

function requireAuth() {
  if (firebaseConfigurationError || !auth) {
    throw new Error(firebaseConfigurationError || 'Firebase Authentication başlatılamadı.');
  }
  return auth;
}

export function observeAuthState(onUser, onError) {
  const firebaseAuth = requireAuth();
  return onAuthStateChanged(firebaseAuth, onUser, onError);
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

export async function registerManagerAccount({ email, password, name }) {
  const firebaseAuth = requireAuth();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim();

  if (!normalizedEmail || !password) {
    throw new Error('E-posta ve şifre alanlarını doldurun.');
  }
  if (String(password).length < 6) {
    throw new Error('Şifre en az 6 karakter olmalıdır.');
  }

  const credential = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
  if (normalizedName) {
    await updateProfile(credential.user, { displayName: normalizedName });
  }
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

export async function sendManagerPasswordReset(email) {
  const firebaseAuth = requireAuth();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('E-posta adresini yazın.');
  await sendPasswordResetEmail(firebaseAuth, normalizedEmail);
}

export async function signOutStaff() {
  const firebaseAuth = requireAuth();
  await signOut(firebaseAuth);
}
