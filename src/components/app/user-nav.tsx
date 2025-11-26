'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { LogOut, User as UserIcon, Loader2, LogIn, UserPlus, Activity } from 'lucide-react';
import Link from 'next/link';
import { doc } from 'firebase/firestore';


/**
 * @fileoverview UserNav component displays the user's avatar and a dropdown menu
 * for user-related actions like viewing the profile or logging out. If the user is not
 * authenticated, it shows Login and Sign Up buttons.
 *
 * It fetches the user's profile from Firestore to display their username.
 */

// Defines the shape of the user profile data stored in Firestore.
interface UserProfile {
  username: string;
}

/**
 * The main UserNav component. It handles different UI states based on
 * the user's authentication status (loading, authenticated, or not authenticated).
 *
 * @returns {React.ReactElement} A user navigation component.
 */
export function UserNav() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  // Memoized document reference to the user's profile in Firestore.
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  /**
   * Handles the user logout process by calling Firebase's signOut method.
   */
  const handleLogout = () => {
    auth.signOut();
  };
  
  // Display a loader while authentication or profile data is being fetched.
  if (isUserLoading || (user && isProfileLoading)) {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  }
  
  // If no user is authenticated, display Login and Sign Up buttons.
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/auth">
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Link>
        </Button>
        <Button asChild>
          <Link href="/auth">
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up
          </Link>
        </Button>
      </div>
    );
  }

  // Determine the fallback initial for the avatar.
  const userInitial = userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?');

  // Render the user avatar and dropdown menu for an authenticated user.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL ?? ''} alt={userProfile?.username ?? user.displayName ?? 'User'} />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {userProfile?.username ?? user.displayName ?? 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href="/symptom-tracker">
                <Activity className="mr-2 h-4 w-4" />
                <span>Symptom Tracker</span>
             </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    