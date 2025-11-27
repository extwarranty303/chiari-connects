'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, User as UserIcon, Activity, FileText, LogOut, Award } from 'lucide-react';
import Link from 'next/link';

import { useFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app/header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/app/footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileoverview This page serves as the user's personal dashboard.
 *
 * It provides a comprehensive overview of the user's account information and
 * a summary of their tracked symptom data. It now includes an editable form
 * for updating personal details and displays the user's earned community points.
 */

// Zod schema for the profile update form.
const profileSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  city: z.string().min(1, { message: 'City is required.' }),
  state: z.string().min(1, { message: 'State is required.' }),
  phoneNumber: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

/**
 * A dedicated component for the user profile form.
 * Encapsulates the form logic for updating user details.
 */
function UserProfileForm({ userProfile, userId }: { userProfile: UserProfile, userId: string }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: userProfile.firstName || '',
            lastName: userProfile.lastName || '',
            city: userProfile.city || '',
            state: userProfile.state || '',
            phoneNumber: userProfile.phoneNumber || '',
        },
    });

    const onSubmit = (values: ProfileFormValues) => {
        setIsSubmitting(true);
        const userRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userRef, values);
        
        // The update is non-blocking, so we can provide immediate feedback.
        // The real-time listener will update the UI automatically.
        toast({ title: 'Profile Updated', description: 'Your information has been saved.' });
        setIsSubmitting(false);
    };

    return (
        <Card className="glassmorphism">
            <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>Keep your personal details up to date. Your username cannot be changed.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" {...register('firstName')} />
                            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" {...register('lastName')} />
                            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" {...register('city')} />
                            {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Input id="state" {...register('state')} />
                            {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input id="phoneNumber" type="tel" {...register('phoneNumber')} />
                        {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label>Username</Label>
                        <Input value={userProfile.username} disabled />
                    </div>
                     <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={userProfile.email} disabled />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}


/**
 * The main component for the user profile page.
 * It handles authentication, fetches all necessary user and symptom data,
 * and renders a dashboard-like interface for the user.
 *
 * @returns {React.ReactElement} The rendered user profile page.
 */
export default function ProfilePage() {
  const { auth, firestore } = useFirebase();
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect unauthenticated users.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    auth.signOut().then(() => {
      router.push('/');
    });
  };

  const isLoading = isUserLoading || !userProfile;

  // Show a loading screen while data is being fetched.
  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userInitial = userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?');


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto grid gap-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              User Profile
            </h1>
            <p className="text-muted-foreground">Your personal dashboard and account overview.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: User Info & Actions */}
            <div className="lg:col-span-1 space-y-8">
              <Card className="glassmorphism">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.photoURL ?? ''} alt={userProfile?.username ?? 'User'} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{userProfile?.username ?? 'User'}</CardTitle>
                    <CardDescription>{userProfile?.email}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>
                      <p>Account created on:</p>
                      <p className="font-medium text-foreground">
                        {userProfile?.createdAt ? format(new Date(userProfile.createdAt), 'MMMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                     <div>
                        <p className="flex items-center gap-1"><Award className="w-4 h-4 text-amber-500" /> Community Points:</p>
                        <p className="font-medium text-foreground text-lg">{userProfile?.points ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Button asChild>
                    <Link href="/symptom-tracker">
                      <Activity className="mr-2 h-4 w-4" />
                      Go to Symptom Tracker
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/symptom-tracker/report">
                      <FileText className="mr-2 h-4 w-4" />
                      View Full Report
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Editable Profile Form */}
            <div className="lg:col-span-2">
                {userProfile && <UserProfileForm userProfile={userProfile} userId={user.uid} />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
