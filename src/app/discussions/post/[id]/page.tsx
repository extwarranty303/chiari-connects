'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, MessageSquare, AlertTriangle, User, Calendar, ArrowLeft } from 'lucide-react';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { AppHeader } from '@/components/app/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

/**
 * @fileoverview This page displays a single, detailed discussion post.
 *
 * It fetches a specific post from the `/discussions` collection using the ID from the URL.
 * It shows the full content of the post, along with author and date details.
 */

// Defines the shape of a discussion post retrieved from Firestore.
interface DiscussionPost {
  id: string;
  title: string;
  content: string;
  username: string;
  userId: string;
  createdAt: string; 
  category: string;
}

/**
 * The main component for displaying a single discussion post.
 *
 * @param {{ params: { id: string } }} props - The props containing the dynamic post ID.
 * @returns {React.ReactElement} The rendered post detail page.
 */
export default function PostPage({ params }: { params: { id: string } }) {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect unauthenticated users.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Memoized query to fetch the specific discussion post.
  const postRef = useMemoFirebase(() => {
    if (!firestore || !params.id) return null;
    return doc(firestore, 'discussions', params.id);
  }, [firestore, params.id]);

  const { data: post, isLoading, error } = useDoc<DiscussionPost>(postRef);

  // Show a loading screen while auth or data is being fetched.
  if (isLoading || isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userInitial = post?.username ? post.username.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Post</AlertTitle>
              <AlertDescription>
                Could not load the discussion post. It may have been deleted or there was a network issue.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && post ? (
            <div>
              <Button variant="ghost" onClick={() => router.push(`/discussions/${post.category}`)} className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to {post.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl font-bold">{post.title}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pt-2">
                     <div className="flex items-center gap-2">
                       <Avatar className="h-6 w-6">
                         <AvatarFallback>{userInitial}</AvatarFallback>
                       </Avatar>
                       <span className="font-semibold text-primary">{post.username}</span>
                     </div>
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
                     </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90">
                    {post.content}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
             !isLoading && !error && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="font-medium">Post not found.</p>
                    <p className="text-sm mt-1">This discussion may have been moved or deleted.</p>
                </div>
             )
          )}
        </div>
      </main>
    </div>
  );
}