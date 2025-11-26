'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageSquare, AlertTriangle, Pill, Stethoscope, Brain, HeartHandshake, Briefcase, Users, Newspaper } from 'lucide-react';
import Link from 'next/link';

import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { AppHeader } from '@/components/app/header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * @fileoverview This page displays a list of discussion posts within a specific category.
 *
 * It fetches all posts from the `/discussions` collection that match the category slug
 * from the URL and displays them in a chronological list. It handles loading and error states.
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

const categoryDetails: { [key: string]: { name: string; icon: React.ReactNode } } = {
  'symptom-management': { name: 'Symptom Management', icon: <Pill /> },
  'diagnosis-newly-diagnosed': { name: 'Diagnosis & Newly Diagnosed', icon: <Stethoscope /> },
  'surgery-recovery': { name: 'Surgery & Recovery', icon: <Brain /> },
  'mental-health-wellness': { name: 'Mental Health & Wellness', icon: <HeartHandshake /> },
  'daily-life-work': { name: 'Daily Life & Work', icon: <Briefcase /> },
  'treatments-therapies': { name: 'Treatments & Therapies', icon: <Pill /> },
  'family-relationships': { name: 'Family & Relationships', icon: <Users /> },
  'research-news': { name: 'Research & News', icon: <Newspaper /> },
};


/**
 * The main component for displaying posts within a category.
 * It fetches and renders discussion posts filtered by the category from the URL.
 *
 * @param {{ params: { category: string } }} props - The props containing the dynamic category slug.
 * @returns {React.ReactElement} The rendered category posts page.
 */
export default function CategoryPage({ params }: { params: { category: string } }) {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const { category } = params;
  const currentCategory = categoryDetails[category] || { name: 'Discussions', icon: <MessageSquare /> };


  // Redirect unauthenticated users.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Memoized query to fetch discussion posts for the specific category.
  const discussionsQuery = useMemoFirebase(() => {
    if (!firestore || !category) return null;
    return query(
      collection(firestore, 'discussions'),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, category]);

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
             <Button variant="ghost" onClick={() => router.push('/discussions')} className="mb-4">
                &larr; Back to Categories
             </Button>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <span className="text-primary">{currentCategory.icon}</span>
              {currentCategory.name}
            </h1>
            <p className="text-muted-foreground">Ask questions, share experiences, and connect with others.</p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Discussions</AlertTitle>
              <AlertDescription>
                Could not load posts for this category. Please check your connection or try again later.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && posts && posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post.id} className="hover:border-primary/50 transition-colors duration-200">
                   <Link href={`/discussions/post/${post.id}`} className="block">
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
                    <p className="font-medium">No discussions in this category yet.</p>
                    <p className="text-sm mt-1">Be the first to start a conversation!</p>
                </div>
             )
          )}
        </div>
      </main>
    </div>
  );
}
