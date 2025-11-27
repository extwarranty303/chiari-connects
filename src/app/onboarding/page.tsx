'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';

import { useFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/app/logo';

/**
 * @fileoverview This page handles the mandatory onboarding process for new users.
 * It forces new users to choose a unique username and fill out required profile
 * information before they can access the rest of the application.
 */

// Schema for the onboarding form validation.
const onboardingSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  city: z.string().min(1, { message: 'City is required.' }),
  state: z.string().min(1, { message: 'State is required.' }),
  phoneNumber: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const { firestore } = useFirebase();
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      city: '',
      state: '',
      phoneNumber: '',
    },
  });

  // Effect to handle user state:
  // 1. If loading, do nothing.
  // 2. If not logged in, redirect to auth.
  // 3. If logged in AND has completed onboarding, redirect to home.
  // 4. If logged in and has NOT completed onboarding, pre-fill form with any available data.
  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!user) {
      router.replace('/auth');
    } else if (userProfile?.hasCompletedOnboarding) {
      router.replace('/');
    } else if (userProfile) {
      // Pre-fill form with data from Google or initial signup
      form.reset({
        username: userProfile.username?.startsWith('user') ? '' : userProfile.username, // Only show if not default
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        phoneNumber: userProfile.phoneNumber || '',
      });
    }
  }, [user, userProfile, isUserLoading, router, form]);


  /**
   * Handles the form submission to complete the user's profile.
   * @param {OnboardingFormValues} values - The validated form values.
   */
  const onSubmit = (values: OnboardingFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
      return;
    }
    setIsSubmitting(true);

    const userRef = doc(firestore, 'users', user.uid);
    const updatedData = {
      ...values,
      hasCompletedOnboarding: true, // This is the crucial flag
    };

    updateDocumentNonBlocking(userRef, updatedData);

    // The update is non-blocking. We show a toast and the useUser hook will
    // automatically redirect the user to the home page on the next state update.
    toast({
      title: 'Profile Complete!',
      description: 'Welcome to Chiari Connects!',
    });
    // Manually push to trigger the redirection logic in the useEffect
    router.push('/'); 
  };
  
  if (isUserLoading || !userProfile || userProfile.hasCompletedOnboarding) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
       <div className="absolute inset-0 z-0">
          <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]"></div>
          <div className="absolute bottom-[-20%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]"></div>
      </div>
       <div className="relative z-10 w-full max-w-md">
            <div className="flex flex-col items-center gap-4 mb-6 text-center">
                <Logo width={177.3} height={35.55} />
            </div>
            <Card className="glassmorphism">
                <CardHeader>
                    <CardTitle>Complete Your Profile</CardTitle>
                    <CardDescription>
                        Welcome! Please choose a username and complete your profile to continue.
                    </CardDescription>
                </CardHeader>
                 <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                       <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input id="username" placeholder="your_unique_username" {...form.register('username')} />
                          {form.formState.errors.username && (<p className="text-xs text-destructive">{form.formState.errors.username.message}</p>)}
                          <p className="text-xs text-muted-foreground">This cannot be changed later.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" placeholder="Jane" {...form.register('firstName')} />
                                {form.formState.errors.firstName && (<p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>)}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" placeholder="Doe" {...form.register('lastName')} />
                                {form.formState.errors.lastName && (<p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>)}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" placeholder="Anytown" {...form.register('city')} />
                                {form.formState.errors.city && (<p className="text-xs text-destructive">{form.formState.errors.city.message}</p>)}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input id="state" placeholder="CA" {...form.register('state')} />
                                {form.formState.errors.state && (<p className="text-xs text-destructive">{form.formState.errors.state.message}</p>)}
                            </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber">Phone Number</Label>
                          <Input id="phoneNumber" type="tel" placeholder="(555) 555-5555" {...form.register('phoneNumber')} />
                          {form.formState.errors.phoneNumber && (<p className="text-xs text-destructive">{form.formState.errors.phoneNumber.message}</p>)}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save and Continue
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    </div>
  );
}
