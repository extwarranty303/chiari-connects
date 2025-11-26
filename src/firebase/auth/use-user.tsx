'use client';

import { useState, useEffect } from 'react';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';
import { getDecodedIdToken, DecodedIdToken } from './user-claims';

export interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAdmin: boolean;
  isModerator: boolean;
}

/**
 * A custom hook to manage user authentication state and custom claims.
 * @param auth The Firebase Auth instance.
 * @returns An object with the user, loading state, error, and admin status.
 */
export function useUserAuthState(auth: Auth): UserAuthState {
  const [state, setState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
    isAdmin: false,
    isModerator: false,
  });

  useEffect(() => {
    setState(prevState => ({ ...prevState, isUserLoading: true }));

    const unsubscribe = onIdTokenChanged(
      auth,
      async (user: User | null) => {
        if (user) {
          try {
            const decodedToken: DecodedIdToken | null = await getDecodedIdToken(user, true);
            const isAdmin = decodedToken?.claims?.admin === true;
            const isModerator = decodedToken?.claims?.moderator === true;
            
            setState({ user, isUserLoading: false, userError: null, isAdmin, isModerator });
          } catch (error: any) {
            console.error("Error decoding ID token:", error);
            setState({ user, isUserLoading: false, userError: error, isAdmin: false, isModerator: false });
          }
        } else {
          setState({ user: null, isUserLoading: false, userError: null, isAdmin: false, isModerator: false });
        }
      },
      (error: Error) => {
        console.error("onIdTokenChanged error:", error);
        setState({ user: null, isUserLoading: false, userError: error, isAdmin: false, isModerator: false });
      }
    );

    return () => unsubscribe();
  }, [auth]);

  return state;
}

    