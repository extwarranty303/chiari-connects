'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';

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
  userError: Error | null;
  isAdmin: boolean;
  isModerator: boolean;
  userProfile: UserProfile | null;
  hasCompletedOnboarding: boolean;
}

const auth = getAuth();

export function useUser(): UserAuthState {
  const [user, isUserLoading, userError] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setIsAdmin(!!idTokenResult.claims.admin);
        setIsModerator(!!idTokenResult.claims.moderator);
        // This is a mock user profile. In a real app, you would fetch this from Firestore.
        const mockProfile: UserProfile = {
          id: user.uid,
          username: user.displayName || 'Anonymous',
          email: user.email || 'anonymous@example.com',
          createdAt: user.metadata.creationTime || new Date().toISOString(),
          hasCompletedOnboarding: true, // Assume true for this mock
          roles: {
            admin: !!idTokenResult.claims.admin,
            moderator: !!idTokenResult.claims.moderator,
          }
        };
        setUserProfile(mockProfile);
        setHasCompletedOnboarding(mockProfile.hasCompletedOnboarding || false);
      });
    } else {
      setIsAdmin(false);
      setIsModerator(false);
      setUserProfile(null);
      setHasCompletedOnboarding(false);
    }
  }, [user]);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to auth page
    // unless they are already on a public page.
    if (!isUserLoading && !user && !['/auth', '/'].includes(pathname)) {
      router.push('/auth');
    }
    // If the user is logged in but hasn't completed onboarding, force them to the onboarding page.
    if (!isUserLoading && user && !hasCompletedOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
    // If the user IS onboarded and tries to visit the onboarding page, send them to the homepage.
    if (!isUserLoading && user && hasCompletedOnboarding && pathname === '/onboarding') {
      router.push('/');
    }

  }, [user, isUserLoading, hasCompletedOnboarding, pathname, router]);


  return useMemo(() => ({
    user,
    isUserLoading,
    userError,
    isAdmin,
    isModerator,
    userProfile,
    hasCompletedOnboarding,
  }), [user, isUserLoading, userError, isAdmin, isModerator, userProfile, hasCompletedOnboarding]);
}
