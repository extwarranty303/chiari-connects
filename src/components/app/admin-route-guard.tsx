'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

/**
 * A client component that acts as a route guard for admin-only pages.
 * It checks the user's authentication status and admin role.
 * If the user is not an admin, they are redirected to the home page.
 *
 * @param {{ children: React.ReactNode }} props - The child components to render if the user is an admin.
 * @returns {React.ReactElement | null} The child components or a loading indicator.
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
  if (isUserLoading) {
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
