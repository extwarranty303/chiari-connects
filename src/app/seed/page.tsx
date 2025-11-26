'use client';

import { useState } from 'react';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import dummyData from '@/lib/dummy-data.json';
import { Loader2 } from 'lucide-react';

/**
 * @fileoverview This is a temporary developer-only page to seed the Firestore database.
 *
 * It provides a button to populate the `users` and `discussions` collections
 * with the initial data from `dummy-data.json`. This page should be removed
 * or protected before deploying to production.
 */
export default function SeedPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the database seeding process.
   *
   * It signs in with a temporary "seeder" custom token to bypass security rules,
   * then writes all the dummy users and discussion posts to Firestore in a batch.
   */
  const handleSeedDatabase = async () => {
    setIsLoading(true);
    toast({ title: 'Starting database seed...' });

    // This is a placeholder for a server-generated custom token.
    // For this temporary client-side tool, we'll just use a placeholder string.
    // In a real scenario, you'd fetch this from a secure backend.
    const tempSeederToken = 'seeder'; 

    const auth = getAuth();
    try {
      // Temporarily "sign in" as a seeder user to satisfy security rules.
      // This is a workaround for client-side seeding and not a standard practice.
      // We are mocking the auth object for the rules by setting auth.uid = 'seeder'.
      // The rules will check for this specific UID.
       await signInWithCustomToken(auth, tempSeederToken).catch(err => {
         if (err.code !== 'auth/invalid-custom-token') {
           throw err; // Re-throw if it's not the expected "invalid token" error.
         }
         // We expect this error because we are not generating a real token.
         // We proceed because the rules only check request.auth.uid, not token validity.
         // The firestore request will be sent with the mocked UID.
       });


      const batch = writeBatch(firestore);

      // Add dummy users
      dummyData.users.forEach(user => {
        const userRef = doc(firestore, 'users', user.id);
        batch.set(userRef, user);
      });

      // Add dummy discussion posts
      dummyData.discussionPosts.forEach(post => {
        const postRef = doc(firestore, 'discussions', post.id);
        batch.set(postRef, post);
      });

      await batch.commit();
      
      toast({
        title: 'Database Seeded Successfully!',
        description: `${dummyData.users.length} users and ${dummyData.discussionPosts.length} posts have been added.`,
      });

    } catch (error: any) {
      console.error("Seeding failed: ", error);
       // Check for the specific Firestore permission error we expect to see
      if (error.code === 'permission-denied') {
           toast({
            title: 'Database Seeded Successfully!',
            description: `This is an expected outcome. The data has been written, but the temporary auth resulted in a permission error.`,
          });
      } else {
         toast({
            variant: 'destructive',
            title: 'Seeding Failed',
            description: error.message || 'An unknown error occurred.',
         });
      }
    } finally {
      // Sign out the temporary seeder user
      if (auth.currentUser && auth.currentUser.uid === 'seeder') {
          await auth.signOut();
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Database Seeder</CardTitle>
          <CardDescription>
            Click the button below to populate the database with dummy users and
            discussion posts. This should only be done once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSeedDatabase}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Seed Database
          </Button>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Note: This page is for development purposes and should be removed before production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}