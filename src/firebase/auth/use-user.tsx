'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthState as useFirebaseAuthState } from 'react-firebase-hooks/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

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
  user: any | null;
  isUserLoading: boolean;
  userError: Error | undefined | null;
  isAdmin: boolean;
  isModerator: boolean;
  userProfile: UserProfile | null;
  hasCompletedOnboarding: boolean;
}

export function useUser(): UserAuthState {
  const { auth, firestore } = useFirebase();
  const [user, isFirebaseUserLoading, userError] = useFirebaseAuthState(auth);
  
  // This state now specifically tracks the loading of our combined user/profile/claims data
  const [isUserLoading, setIsUserLoading] = useState(true);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc<UserProfile>(userProfileRef);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  const hasCompletedOnboarding = userProfile?.hasCompletedOnboarding ?? false;

  useEffect(() => {
    // Start loading whenever the firebase user or profile starts loading
    setIsUserLoading(isFirebaseUserLoading || isProfileLoading);
    
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setIsAdmin(!!idTokenResult.claims.admin);
        setIsModerator(!!idTokenResult.claims.moderator);
      });
    } else {
      setIsAdmin(false);
      setIsModerator(false);
    }
  }, [user, isFirebaseUserLoading, isProfileLoading]);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until loading is fully complete before running any redirect logic
    if (isUserLoading) return;

    const isAuthPage = pathname === '/auth';
    const isOnboardingPage = pathname === '/onboarding';

    // If there's no user, they should be on the auth page.
    if (!user && !isAuthPage) {
      router.push('/auth');
      return;
    }
    
    if (user) {
      // If user exists but hasn't onboarded, they must be on the onboarding page.
      if (!hasCompletedOnboarding && !isOnboardingPage) {
        router.push('/onboarding');
        return;
      }
      // If user has onboarded, they should NOT be on the onboarding page.
      if (hasCompletedOnboarding && isOnboardingPage) {
        router.push('/');
        return;
      }
    }

  }, [user, isUserLoading, hasCompletedOnboarding, pathname, router]);

  return useMemo(() => ({
    user,
    isUserLoading, // Use our combined loading state
    userError: userError || profileError,
    isAdmin,
    isModerator,
    userProfile,
    hasCompletedOnboarding,
  }), [user, isUserLoading, userError, profileError, isAdmin, isModerator, userProfile, hasCompletedOnboarding]);
}
