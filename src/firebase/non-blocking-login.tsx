'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth) {
  // Returns a promise that can be caught by the caller for UI updates
  return signInAnonymously(authInstance);
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string) {
  // Returns a promise that can be caught by the caller for UI updates
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string) {
    // Returns a promise that can be caught by the caller for UI updates
  return signInWithEmailAndPassword(authInstance, email, password);
}

/** Initiate Google Sign-In with a popup (non-blocking). */
export function initiateGoogleSignIn(authInstance: Auth) {
  const provider = new GoogleAuthProvider();
  // This ensures that even if a user has selected a different Google account in the past,
  // they are always prompted to choose, which is crucial for account linking scenarios.
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  // Returns a promise that can be caught by the caller for UI updates
  return signInWithPopup(authInstance, provider);
}

    