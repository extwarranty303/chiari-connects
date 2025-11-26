'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

/**
 * @fileoverview A client-side component that protects routes requiring admin privileges.
 *
 * It leverages the `useUser` hook to check the user's authentication state and custom claims.
 *
 * Key behaviors:
 * - If the user state is loading, it displays a full-page loader.
 * - If the user is not authenticated, it redirects them to the `/auth` page.
 * - If the user is authenticated but does not have the `isAdmin` claim, it redirects them to the home page (`/`).
 * - If the user is authenticated and is an admin, it renders the child components passed to it.
 *
 * This component ensures that sensitive admin areas are only accessible to authorized users.
 *
 * @param {{ children: React.ReactNode }} props - The child components to render if the user is a verified admin.
 * @returns {React.ReactElement | null} The child components for an admin, a loading indicator, or null during redirection.
 */
export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, isAdmin } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.replace('/auth');
    }
    
    // If loading is finished, there is a user, but they are not an admin, redirect home.
    if (!isUserLoading && user && !isAdmin) {
      router.replace('/');
    }
  }, [user, isUserLoading, isAdmin, router]);

  // While loading authentication state, show a full-page loader.
  if (isUserLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is authenticated and is an admin, render the children.
  if (user && isAdmin) {
    return <>{children}</>;
  }

  // Otherwise, render nothing while the redirect is in progress.
  return null;
}
