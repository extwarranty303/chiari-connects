'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, collection, runTransaction, increment } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, AlertTriangle, ArrowLeft, Bookmark, Flag, Tags, Sparkles } from 'lucide-react';
import { useFirebase, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { AppHeader } from '@/components/app/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Footer } from '@/components/app/footer';
import Link from 'next/link';
import { summarizeDiscussion } from '@/ai/flows/ai-summarize-discussion';
import ReactMarkdown from 'react-markdown';
import { Skeleton } from '@/components/ui/skeleton';


/**
 * @fileoverview This page displays a single, detailed discussion post.
 *
 * It fetches a specific post from the `/discussions` collection using the ID from the URL.
 * It shows the full content, author, and date details, provides actions for bookmarking and
 * reporting, and marks the post as "read" in the user's localStorage.
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
  tags?: string[];
}

// Defines the shape of a bookmark document.
interface Bookmark {
    postId: string;
    userId: string;
    createdAt: string;
}

// Standard reasons for reporting a post.
const reportReasons = [
    { id: 'spam', label: 'Spam or Misleading' },
    { id: 'harassment', label: 'Harassment or Bullying' },
    { id: 'hate-speech', label: 'Hate Speech or Symbols' },
    { id: 'misinformation', label: 'Harmful Misinformation' },
    { id: 'impersonation', label: 'Impersonation' },
    { id: 'other', label: 'Other (violates community guidelines)' },
];

/**
 * The main component for displaying a single discussion post.
 *
 * @returns {React.ReactElement} The rendered post detail page.
 */
export default function PostPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [isReporting, setIsReporting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const [isSummaryPending, startSummaryTransition] = useTransition();
  const [summary, setSummary] = useState('');
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  // Mark the post as read in localStorage when the component mounts
  useEffect(() => {
    if (id) {
        try {
            const storedReadPosts = localStorage.getItem('readPosts');
            const readPosts = storedReadPosts ? new Set(JSON.parse(storedReadPosts)) : new Set();
            readPosts.add(id);
            localStorage.setItem('readPosts', JSON.stringify(Array.from(readPosts)));
        } catch (error) {
            console.error("Failed to update read posts in localStorage", error);
        }
    }
  }, [id]);

  // Memoized query to fetch the specific discussion post.
  const postRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'discussions', id);
  }, [firestore, id]);

  // Memoized query for the user's bookmark for this specific post.
  const bookmarkRef = useMemoFirebase(() => {
    if (!firestore || !user || !id) return null;
    return doc(firestore, 'users', user.uid, 'bookmarks', id);
  }, [firestore, user, id]);

  const { data: post, isLoading: isLoadingPost, error: postError } = useDoc<DiscussionPost>(postRef);
  const { data: bookmarkData, isLoading: isLoadingBookmark } = useDoc<Bookmark>(bookmarkRef);

  // Optimistic UI state for bookmarking
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    setIsBookmarked(!!bookmarkData);
  }, [bookmarkData]);


  const isLoading = isLoadingPost || isLoadingBookmark;

  /**
   * Toggles the bookmark status for the current post with an optimistic UI update.
   */
  const handleToggleBookmark = async () => {
    if (!user || !post || !bookmarkRef || !firestore) return;

    const currentlyBookmarked = isBookmarked;
    // Optimistically update the UI
    setIsBookmarked(!currentlyBookmarked);

    if (currentlyBookmarked) {
        // Delete the bookmark
        deleteDocumentNonBlocking(bookmarkRef);
        toast({ title: 'Bookmark removed.' });
    } else {
        // Create the bookmark
        const newBookmark: Bookmark = {
            postId: post.id,
            userId: user.uid,
            createdAt: new Date().toISOString(),
        };
        setDocumentNonBlocking(bookmarkRef, newBookmark, { merge: false });

        // Award points to the post author
        const authorRef = doc(firestore, 'users', post.userId);
        try {
            await runTransaction(firestore, async (transaction) => {
                const authorDoc = await transaction.get(authorRef);
                if (authorDoc.exists()) {
                    transaction.update(authorRef, { points: increment(5) });
                }
            });
            toast({ title: 'Post bookmarked!', description: "The author has been awarded 5 points." });
        } catch (error) {
            console.error("Failed to award points:", error);
            // Revert optimistic UI on failure
            setIsBookmarked(true);
            toast({ variant: "destructive", title: 'Error', description: "Could not bookmark post or award points." });
        }
    }
  };

  /**
   * Handles submitting a report for the current post.
   * Creates a report document in a subcollection of the post.
   */
  const handleReportSubmit = () => {
    if (!user || !post || !selectedReason || !firestore) {
        toast({ variant: 'destructive', title: 'Please select a reason for your report.' });
        return;
    }
    setIsReporting(true);
    const reportData = {
        postId: post.id,
        reporterId: user.uid,
        reason: selectedReason,
        createdAt: new Date().toISOString(),
    };
    const reportsCollectionRef = collection(firestore, 'discussions', post.id, 'reports');
    
    addDocumentNonBlocking(reportsCollectionRef, reportData)
        .then(() => {
            toast({ title: 'Report Submitted', description: 'Thank you for helping keep the community safe.' });
        })
        .finally(() => {
            setIsReporting(false);
            // The DialogClose component will handle closing the dialog
        });
  };

  /**
   * Handles the AI summarization of the post.
   */
  const handleSummarize = () => {
    if (!post) return;
    setShowSummaryDialog(true);
    setSummary(''); // Clear previous summary
    startSummaryTransition(async () => {
        try {
            const result = await summarizeDiscussion({
                title: post.title,
                content: post.content,
            });
            setSummary(result.summary);
        } catch (error) {
            console.error("Error summarizing post:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate a summary. Please try again.' });
            setSummary('Failed to generate summary.');
        }
    });
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userInitial = post?.username ? post.username.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {postError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Post</AlertTitle>
              <AlertDescription>
                Could not load the discussion post. It may have been deleted or there was a network issue.
              </AlertDescription>
            </Alert>
          )}

          {!isLoadingPost && !postError && post ? (
            <div>
              <Button variant="ghost" onClick={() => router.push(`/discussions/${post.category}`)} className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to {post.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Button>
              <Card className="glassmorphism">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-3xl font-bold">{post.title}</CardTitle>
                    <div className="flex gap-2 flex-shrink-0">
                        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" onClick={handleSummarize} aria-label="Summarize post">
                                    <Sparkles className="h-5 w-5" />
                                </Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>AI-Generated Summary</DialogTitle>
                                    <DialogDescription>A quick overview of the key points in this post.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 prose prose-sm dark:prose-invert max-w-none">
                                    {isSummaryPending ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-4/5" />
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                    ) : (
                                        <ReactMarkdown>{summary}</ReactMarkdown>
                                    )}
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button">Close</Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="icon" onClick={handleToggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}>
                            <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-primary text-primary' : ''}`} />
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" aria-label="Report post">
                                    <Flag className="h-5 w-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Report Post</DialogTitle>
                                    <DialogDescription>
                                        Please select the reason for reporting this post. Reports are reviewed by moderators.
                                    </DialogDescription>
                                </DialogHeader>
                                <RadioGroup onValueChange={setSelectedReason} className="my-4 space-y-2">
                                    {reportReasons.map(reason => (
                                        <div key={reason.id} className="flex items-center space-x-2">
                                            <RadioGroupItem value={reason.id} id={`reason-${reason.id}`} />
                                            <Label htmlFor={`reason-${reason.id}`}>{reason.label}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="secondary">Cancel</Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                        <Button onClick={handleReportSubmit} disabled={isReporting || !selectedReason}>
                                            {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Submit Report
                                        </Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                  </div>
                  <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pt-2">
                     <div className="flex items-center gap-2">
                       <Avatar className="h-6 w-6">
                         <AvatarFallback>{userInitial}</AvatarFallback>
                       </Avatar>
                       <span className="font-semibold text-primary">{post.username}</span>
                     </div>
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="capitalize">{post.category.replace(/-/g, ' ')}</span>
                     </div>
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
                     </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90">
                    {post.content}
                  </div>
                   {post.tags && post.tags.length > 0 && (
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <Tags className="h-4 w-4 text-muted-foreground"/>
                            {post.tags.map(tag => (
                                <Link key={tag} href={`/discussions/tag/${encodeURIComponent(tag)}`}>
                                    <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">{tag}</Badge>
                                </Link>
                            ))}
                        </div>
                   )}
                </CardContent>
              </Card>
            </div>
          ) : (
             !isLoadingPost && !postError && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="font-medium">Post not found.</p>
                    <p className="text-sm mt-1">This discussion may have been moved or deleted.</p>
                </div>
             )
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
