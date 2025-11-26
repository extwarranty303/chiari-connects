'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { AppHeader } from '@/components/app/header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * @fileoverview This page displays a list of public discussion posts.
 *
 * It serves as the community forum hub, fetching all posts from the `/discussions`
 * collection in Firestore and displaying them in a chronological list. It handles
 * loading and error states gracefully.
 */

// Defines the shape of a discussion post retrieved from Firestore.
interface DiscussionPost {
  id: string;
  title: string;
  content: string;
  username: string;
  userId: string;
  createdAt: string; 
}

/**
 * The main component for the Discussions page.
 * It fetches and renders all discussion posts for the community.
 *
 * @returns {React.ReactElement} The rendered discussions page.
 */
export default function DiscussionsPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect unauthenticated users.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Memoized query to fetch all discussion posts, ordered by creation date.
  const discussionsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'discussions'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: posts, isLoading, error } = useCollection<DiscussionPost>(discussionsQuery);

  // Show a loading screen while user auth or data is being fetched.
  if (isLoading || isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              Community Discussions
            </h1>
            <p className="text-muted-foreground">Ask questions, share experiences, and connect with others.</p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Discussions</AlertTitle>
              <AlertDescription>
                Could not load posts. Please check your connection or try again later.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && posts && posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post.id} className="hover:border-primary/50 transition-colors duration-200">
                  <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription>
                      Posted by <span className="font-semibold text-primary">{post.username}</span> • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-foreground/90">
                      {post.content}
                    </p>
                  </CardContent>
                   <CardFooter>
                      <Link href={`/discussions/${post.id}`} className="text-sm font-semibold text-primary hover:underline">
                        Read more &rarr;
                      </Link>
                   </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
             !isLoading && !error && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="font-medium">No discussions yet.</p>
                    <p className="text-sm mt-1">Be the first to start a conversation!</p>
                </div>
             )
          )}
        </div>
      </main>
    </div>
  );
}
