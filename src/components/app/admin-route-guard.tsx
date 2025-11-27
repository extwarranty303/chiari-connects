'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

/**
 * @fileoverview A client-side component that protects routes requiring admin or moderator privileges.
 *
 * It leverages the `useUser` hook to check the user's authentication state and custom claims.
 *
 * Key behaviors:
 * - If the user state is loading, it displays a full-page loader.
 * - If the user is not authenticated, it redirects them to the `/auth` page.
 * - If the user is authenticated but does not have `isAdmin` or `isModerator` claims, it redirects them to the home page (`/`).
 * - If the user is an admin or moderator, it renders the child components.
 *
 * This component ensures that sensitive admin areas are only accessible to authorized users.
 *
 * @param {{ children: React.ReactNode }} props - The child components to render if the user is a verified admin or moderator.
 * @returns {React.ReactElement | null} The child components, a loading indicator, or null during redirection.
 */
export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, isAdmin, isModerator } = useUser();
  const router = useRouter();

  const isAuthorized = isAdmin || isModerator;

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.replace('/auth');
    }
    
    // If loading is finished, there is a user, but they are not authorized, redirect home.
    if (!isUserLoading && user && !isAuthorized) {
      router.replace('/');
    }
  }, [user, isUserLoading, isAuthorized, router]);

  // While loading authentication state or if not authorized, show a full-page loader.
  if (isUserLoading || !isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is authenticated and is an admin or moderator, render the children.
  if (user && isAuthorized) {
    return <>{children}</>;
  }

  // Otherwise, render nothing while the redirect is in progress.
  return null;
}
