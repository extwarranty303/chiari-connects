'use client';

import { useMemo } from 'react';

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

// Mock user since authentication is removed
const mockUser = {
  uid: 'anonymous-user',
  email: 'user@example.com',
  displayName: 'Anonymous User',
  photoURL: '',
};

const mockUserProfile: UserProfile = {
  id: 'anonymous-user',
  username: 'Anonymous',
  email: 'user@example.com',
  createdAt: new Date().toISOString(),
  points: 0,
  hasCompletedOnboarding: true,
};

export interface UserAuthState {
  user: any | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAdmin: boolean;
  isModerator: boolean;
  userProfile: UserProfile | null;
}

export function useUser(): UserAuthState {
  return useMemo(() => ({
    user: mockUser,
    userProfile: mockUserProfile,
    isUserLoading: false,
    userError: null,
    isAdmin: false,
    isModerator: false,
  }), []);
}
