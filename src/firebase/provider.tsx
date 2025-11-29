'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { useUser, type UserAuthState } from './auth/use-user';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

// Combined state for the Firebase context
export type FirebaseContextState = {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  storage: FirebaseStorage | null;
} & Omit<UserAuthState, 'user'> & { user: User | null }; // Omit original user, and redefine with firebase User type


// Return type for useFirebase()
export interface FirebaseServicesAndUser extends FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const userAuthState = useUser();
  const context = useContext(FirebaseContext);

  // It's safe to assume context is defined here because AuthProvider is always a child of FirebaseProvider
  const augmentedContext = useMemo(() => ({
    ...context!,
    ...userAuthState
  }), [context, userAuthState]);

  return (
    <FirebaseContext.Provider value={augmentedContext}>
      {children}
    </FirebaseContext.Provider>
  );
}

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  // Memoize the context value
  const contextValue = useMemo((): Omit<FirebaseContextState, keyof UserAuthState | 'user' > => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: servicesAvailable ? storage : null,
    };
  }, [firebaseApp, firestore, auth, storage]);

  // Provide initial empty user state before AuthProvider hydrates it
  const fullContextValue = useMemo(() => ({
    ...contextValue,
    user: null,
    isUserLoading: true,
    userError: null,
    isAdmin: false,
    isModerator: false,
    userProfile: null,
    hasCompletedOnboarding: false,
  }), [contextValue]);

  return (
    <FirebaseContext.Provider value={fullContextValue}>
      <FirebaseErrorListener />
      <AuthProvider>{children}</AuthProvider>
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    ...context,
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

/** Hook to access Firebase Storage instance. */
export const useStorage = (): FirebaseStorage => {
    const { storage } = useFirebase();
    return storage;
}
