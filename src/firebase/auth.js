import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, firebaseConfigurationError } from './config';

export function ensureAnonymousCustomer() {
  if (firebaseConfigurationError || !auth) {
    return Promise.reject(new Error(firebaseConfigurationError || 'Firebase Authentication başlatılamadı.'));
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
        return;
      }

      try {
        const credential = await signInAnonymously(auth);
        resolve(credential.user);
      } catch (error) {
        reject(error);
      }
    }, reject);
  });
}
