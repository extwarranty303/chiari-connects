'use client';

import { useState } from 'react';
import { writeBatch, doc } from 'firebase/firestore';
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
   * It writes all the dummy users and discussion posts to Firestore in a single batch operation.
   * A special `isSeed: true` flag is added to each document, which is checked by a temporary
   * security rule to allow this unauthenticated write. This method is more secure than
   * relying on mock authentication.
   */
  const handleSeedDatabase = () => {
    setIsLoading(true);
    toast({ title: 'Starting database seed...' });

    const batch = writeBatch(firestore);

    // Add a special flag to each document for the security rule to check
    dummyData.users.forEach(user => {
        const userRef = doc(firestore, 'users', user.id);
        batch.set(userRef, { ...user, isSeed: true });
    });

    dummyData.discussionPosts.forEach(post => {
        const postRef = doc(firestore, 'discussions', post.id);
        batch.set(postRef, { ...post, isSeed: true });
    });

    // The batch commit is non-blocking and uses catch for error handling.
    batch.commit()
      .then(() => {
        toast({
            title: 'Database Seeded Successfully!',
            description: `${dummyData.users.length} users and ${dummyData.discussionPosts.length} posts have been added.`,
        });
      })
      .catch((error) => {
        // This will now catch the permission error and create a contextual error.
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
      .finally(() => {
          setIsLoading(false);
      });
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full glassmorphism">
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
