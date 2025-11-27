'use client';

import { useState, useEffect } from 'react';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { getDecodedIdToken, DecodedIdToken } from './user-claims';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  points?: number;
  hasCompletedOnboarding?: boolean;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  phoneNumber?: string;
  photoURL?: string;
  roles?: {
    admin?: boolean;
    moderator?: boolean;
  };
}

export interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAdmin: boolean;
  isModerator: boolean;
  userProfile: UserProfile | null;
}

/**
 * A custom hook to manage user authentication state, custom claims, and user profile data.
 * @param auth The Firebase Auth instance.
 * @param firestore The Firestore instance.
 * @returns An object with the user, loading state, error, roles, and profile data.
 */
export function useUserAuthState(auth: Auth, firestore: Firestore): UserAuthState {
  const [state, setState] = useState<UserAuthState>({
    user: auth.currentUser, // Start with the current user if available
    isUserLoading: true,
    userError: null,
    isAdmin: false,
    isModerator: false,
    userProfile: null,
  });

  const router = useRouter();

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const idTokenUnsubscribe = onIdTokenChanged(
      auth,
      async (user: User | null) => {
        // First, cancel any existing profile listener
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }

        if (user) {
          try {
            const decodedToken: DecodedIdToken | null = await getDecodedIdToken(user, true);
            const isAdmin = decodedToken?.claims?.admin === true;
            const isModerator = decodedToken?.claims?.moderator === true;
            
            // Set up a real-time listener for the user's profile document.
            const profileRef = doc(firestore, 'users', user.uid);
            profileUnsubscribe = onSnapshot(profileRef, 
              (profileSnap) => {
                const userProfile = profileSnap.exists() ? profileSnap.data() as UserProfile : null;
                
                // --- Onboarding Redirection Logic ---
                if (profileSnap.exists() && userProfile?.hasCompletedOnboarding === false) {
                    router.replace('/onboarding');
                    // Keep loading true while we redirect
                    setState({ user, isUserLoading: true, userError: null, isAdmin, isModerator, userProfile });
                } else {
                    setState({ user, isUserLoading: false, userError: null, isAdmin, isModerator, userProfile });
                }
              },
              (profileError) => {
                console.error("Error fetching user profile:", profileError);
                setState({ user, isUserLoading: false, userError: profileError, isAdmin, isModerator, userProfile: null });
              }
            );

          } catch (error: any) {
            console.error("Error decoding ID token:", error);
            setState({ user, isUserLoading: false, userError: error, isAdmin: false, isModerator: false, userProfile: null });
          }
        } else {
          // No user, clear all state
          setState({ user: null, isUserLoading: false, userError: null, isAdmin: false, isModerator: false, userProfile: null });
        }
      },
      (error: Error) => {
        console.error("onIdTokenChanged error:", error);
        setState({ user: null, isUserLoading: false, userError: error, isAdmin: false, isModerator: false, userProfile: null });
      }
    );

    return () => {
      idTokenUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [auth, firestore, router]);

  return state;
}
