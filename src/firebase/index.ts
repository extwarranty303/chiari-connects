'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, UserCredential } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        // Additional metadata available on first login with a credential
        const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;

        if (!userSnap.exists() && isNewUser) {
            // This case handles new user creation.
            const providerId = user.providerData?.[0]?.providerId;
            let newUserDoc;

            if (providerId === 'google.com') {
                 // User signed up with Google.
                 const username = user.displayName?.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Math.random().toString().substring(2, 8)}`;
                 const [firstName, lastName] = user.displayName?.split(' ') || ['', ''];

                 newUserDoc = {
                    id: user.uid,
                    email: user.email,
                    username: username,
                    firstName: firstName || '',
                    lastName: lastName || '',
                    city: '', // Google does not provide these
                    state: '',
                    phoneNumber: user.phoneNumber || '',
                    photoURL: user.photoURL || '',
                    createdAt: new Date().toISOString(),
                    points: 0,
                };
            } else {
                // For email/password, we assume the data is captured elsewhere and won't have it here.
                // The signup form logic in `auth/page.tsx` is now the primary source for creating the user doc.
                // This block is a fallback in case that flow is interrupted.
                 newUserDoc = {
                    id: user.uid,
                    email: user.email,
                    username: user.email?.split('@')[0] || `user${Math.random().toString().substring(2, 8)}`,
                    firstName: '',
                    lastName: '',
                    city: '',
                    state: '',
                    phoneNumber: '',
                    photoURL: '',
                    createdAt: new Date().toISOString(),
                    points: 0,
                };
            }
            
            // Use non-blocking write with contextual error handling
            setDoc(userRef, newUserDoc, { merge: true })
              .catch(error => {
                const contextualError = new FirestorePermissionError({
                  path: userRef.path,
                  operation: 'create',
                  requestResourceData: newUserDoc
                });
                errorEmitter.emit('permission-error', contextualError);
              });
        }
    }
  });


  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './auth/user-claims';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
