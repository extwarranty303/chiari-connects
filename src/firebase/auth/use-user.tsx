'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';

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

export function useUser(): UserAuthState {
  const { auth } = useFirebase(); // ✅ Get auth from context
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
        
        const mockProfile: UserProfile = {
          id: user.uid,
          username: user.displayName || 'Anonymous',
          email: user.email || 'anonymous@example.com',
          createdAt: user.metadata.creationTime || new Date().toISOString(),
          hasCompletedOnboarding: true,
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
    if (!isUserLoading && !user && !['/auth', '/'].includes(pathname)) {
      router.push('/auth');
    }
    if (!isUserLoading && user && !hasCompletedOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
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