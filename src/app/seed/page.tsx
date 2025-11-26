'use client';

import { useState } from 'react';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import dummyData from '@/lib/dummy-data.json';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

    // In a real scenario, you'd fetch this from a secure backend. For this tool,
    // we use a special 'seeder' UID which the security rules are set to allow temporarily.
    const tempSeederToken = 'seeder-token';
    const auth = getAuth();

    try {
        // This is a mock sign-in. We expect it to fail with an "invalid-custom-token" error
        // because we are not generating a real token. However, the Firestore request will
        // still be sent with a mocked auth object where request.auth.uid is 'seeder',
        // which our temporary security rules will allow.
        await signInWithCustomToken(auth, tempSeederToken);
    } catch (error: any) {
        if (error.code !== 'auth/invalid-custom-token') {
            toast({
                variant: 'destructive',
                title: 'Authentication Error during Seed',
                description: `An unexpected auth error occurred: ${error.message}`,
            });
            setIsLoading(false);
            return;
        }
    }
    
    const batch = writeBatch(firestore);

    dummyData.users.forEach(user => {
        const userRef = doc(firestore, 'users', user.id);
        batch.set(userRef, user);
    });

    dummyData.discussionPosts.forEach(post => {
        const postRef = doc(firestore, 'discussions', post.id);
        batch.set(postRef, post);
    });

    // The batch commit is now non-blocking and uses catch for error handling
    batch.commit()
      .then(() => {
        toast({
            title: 'Database Seeded Successfully!',
            description: `${dummyData.users.length} users and ${dummyData.discussionPosts.length} posts have been added.`,
        });
      })
      .catch((error) => {
        // This will now catch the permission error and create a contextual error.
        console.log('Original Error', error);
        const contextualError = new FirestorePermissionError({
            path: '/', // Batch writes can affect multiple paths, so we use root.
            operation: 'write',
            requestResourceData: { 
              note: 'Batch write for multiple users and discussion posts.',
              userCount: dummyData.users.length,
              postCount: dummyData.discussionPosts.length
            }
        });
        errorEmitter.emit('permission-error', contextualError);
      })
      .finally(async () => {
          if (auth.currentUser && auth.currentUser.uid === 'seeder') {
              await auth.signOut();
          }
          setIsLoading(false);
      });
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
