'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Tag, AlertTriangle, PlusCircle } from 'lucide-react';
import Link from 'next/link';

import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { AppHeader } from '@/components/app/header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/app/footer';

/**
 * @fileoverview This page displays a list of discussion posts filtered by a specific tag.
 *
 * It fetches all posts from the `/discussions` collection that contain the tag from the
 * URL in their `tags` array and displays them in a chronological list.
 */

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
 * The main component for displaying posts filtered by a tag.
 *
 * @returns {React.ReactElement} The rendered tag posts page.
 */
export default function TagPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());


  // Load read posts from localStorage on component mount
  useEffect(() => {
    try {
        const storedReadPosts = localStorage.getItem('readPosts');
        if (storedReadPosts) {
            setReadPosts(new Set(JSON.parse(storedReadPosts)));
        }
    } catch (error) {
        console.error("Failed to parse read posts from localStorage", error);
    }
  }, []);

  // Redirect unauthenticated users.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Memoized query to fetch discussion posts for the specific tag.
  const discussionsQuery = useMemoFirebase(() => {
    if (!firestore || !tag) return null;
    return query(
      collection(firestore, 'discussions'),
      where('tags', 'array-contains', tag),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, tag]);

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
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    &larr; Back
                </Button>
                <Button asChild>
                    <Link href="/discussions/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Post
                    </Link>
                </Button>
             </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Tag className="h-8 w-8 text-primary" />
              Posts tagged with "{tag}"
            </h1>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Discussions</AlertTitle>
              <AlertDescription>
                Could not load posts for this tag. Please check your connection or try again later.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && posts && posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <Card 
                  key={post.id} 
                  className={cn(
                    "glassmorphism hover:border-primary/50 transition-all duration-200",
                    readPosts.has(post.id) && "opacity-60 hover:opacity-100"
                  )}
                >
                   <Link href={`/discussions/post/${post.id}`} className="block">
                      <CardHeader>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{post.title}</CardTitle>
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
                          <span className="text-sm font-semibold text-primary hover:underline">
                            Read more &rarr;
                          </span>
                       </CardFooter>
                    </Link>
                </Card>
              ))}
            </div>
          ) : (
             !isLoading && !error && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="font-medium">No posts found with this tag.</p>
                    <p className="text-sm mt-1">Try searching for another tag or create a new post.</p>
                </div>
             )
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
