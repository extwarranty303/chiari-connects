'use client';

import { useState, useEffect, useMemo } from 'react';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { getDecodedIdToken, DecodedIdToken } from './user-claims';
import { usePathname, useRouter } from 'next/navigation';

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
    // Wait until all user data loading is complete.
    if (isUserLoading) {
      return;
    }

    const isOnboardingPage = pathname === '/onboarding';
    
    // If we have a logged-in user and their profile data...
    if (user && userProfile) {
        const hasCompletedOnboarding = userProfile.hasCompletedOnboarding === true;
        
        // If user has NOT completed onboarding AND they are NOT on the onboarding page, redirect them there.
        if (!hasCompletedOnboarding && !isOnboardingPage) {
            router.replace('/onboarding');
            // We return here, but isUserLoading remains true from the parent scope for this render cycle,
            // preventing downstream components from rendering prematurely during the redirect.
            return;
        }
        // If user HAS completed onboarding AND they are somehow on the onboarding page, redirect them away.
        else if (hasCompletedOnboarding && isOnboardingPage) {
            router.replace('/');
            return;
        }
    }
    
  }, [user, userProfile, isUserLoading, pathname, router]);
  
  return useMemo(() => ({
    user,
    userProfile,
    isUserLoading,
    userError: authError,
    isAdmin: decodedToken?.claims?.admin === true,
    isModerator: decodedToken?.claims?.moderator === true,
  }), [user, userProfile, isUserLoading, authError, decodedToken]);
}
