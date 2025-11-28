'use client';

import { useState, useEffect, useMemo } from 'react';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { getDecodedIdToken, DecodedIdToken } from './user-claims';
import { usePathname, useRouter } from 'next/navigation';

// ... (interfaces UserProfile, UserAuthState remain the same) ...

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

// REWRITTEN HOOK TO BE STABLE AND PREVENT RACE CONDITIONS
export function useUserAuthState(auth: Auth, firestore: Firestore): UserAuthState {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [decodedToken, setDecodedToken] = useState<DecodedIdToken | null>(null);
  
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Effect 1: Handle Authentication State Changes
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(
      auth,
      async (user) => {
        setIsLoadingUser(true);
        setAuthError(null);
        if (user) {
          try {
            const token = await getDecodedIdToken(user, true);
            setUser(user);
            setDecodedToken(token);
          } catch (error: any) {
            setAuthError(error);
            setUser(null);
            setDecodedToken(null);
          }
        } else {
          setUser(null);
          setDecodedToken(null);
        }
        setIsLoadingUser(false);
      },
      (error) => {
        setAuthError(error);
        setIsLoadingUser(false);
      }
    );
    return () => unsubscribe();
  }, [auth]);

  // Effect 2: Handle User Profile Fetching
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setIsLoadingProfile(false); // Not loading if no user
      return;
    }

    setIsLoadingProfile(true);
    const profileRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        const profile = snapshot.exists() ? (snapshot.data() as UserProfile) : null;
        setUserProfile(profile);
        // This is the crucial part: we are only done loading the profile
        // AFTER we get the first snapshot. If the profile doesn't exist yet,
        // this listener will fire again when it's created by the cloud function.
        setIsLoadingProfile(false);
      },
      (error) => {
        console.error("Error fetching user profile:", error);
        setAuthError(error);
        setUserProfile(null);
        setIsLoadingProfile(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]);

  const isUserLoading = isLoadingUser || isLoadingProfile;

  // Effect 3: Handle Redirection Logic
  useEffect(() => {
    // Don't redirect if we are still loading critical data.
    if (isUserLoading) {
      return;
    }

    const isOnboardingPage = pathname === '/onboarding';
    
    // If we have a user but their profile hasn't been created yet OR onboarding is not complete, redirect to onboarding.
    if (user && userProfile) {
        const hasCompletedOnboarding = userProfile.hasCompletedOnboarding === true;
        if (!hasCompletedOnboarding && !isOnboardingPage) {
            router.replace('/onboarding');
            // We return here to ensure no other logic runs, and the next render cycle will have the new pathname.
            return;
        }
        // If they have completed onboarding but are on the onboarding page, send them to the home page.
        else if (hasCompletedOnboarding && isOnboardingPage) {
            router.replace('/');
            return;
        }
    }
    
  }, [user, userProfile, isUserLoading, pathname, router]);
  
  // Memoize the final state to prevent unnecessary re-renders
  return useMemo(() => ({
    user,
    userProfile,
    isUserLoading,
    userError: authError,
    isAdmin: decodedToken?.claims?.admin === true,
    isModerator: decodedToken?.claims?.moderator === true,
  }), [user, userProfile, isUserLoading, authError, decodedToken]);
}
