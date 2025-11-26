'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, doc, runTransaction, increment } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { useFirebase, useUser, addDocumentNonBlocking } from '@/firebase';
import { AppHeader } from '@/components/app/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileoverview This page allows authenticated users to create a new discussion post.
 *
 * It provides a form for entering a title, content, and selecting a category.
 * On successful submission, it creates a new post in the `/discussions` collection,
 * awards the user points for their contribution, and redirects them to the new post.
 */

// A static list of forum categories for the form dropdown.
const categories = [
  { slug: 'symptom-management', name: 'Symptom Management' },
  { slug: 'diagnosis-newly-diagnosed', name: 'Diagnosis & Newly Diagnosed' },
  { slug: 'surgery-recovery', name: 'Surgery & Recovery' },
  { slug: 'mental-health-wellness', name: 'Mental Health & Wellness' },
  { slug: 'daily-life-work', name: 'Daily Life & Work' },
  { slug: 'treatments-therapies', name: 'Treatments & Therapies' },
  { slug: 'family-relationships', name: 'Family & Relationships' },
  { slug: 'research-news', name: 'Research & News' },
];

// Zod schema for validating the new post form.
const postSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  content: z.string().min(20, 'Content must be at least 20 characters long.'),
  category: z.string().min(1, 'Please select a category.'),
  tags: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

/**
 * The main component for the Create Post page.
 * It handles form state, submission, and interaction with Firestore.
 *
 * @returns {React.ReactElement} The rendered create post page.
 */
export default function CreatePostPage() {
  const { firestore } = useFirebase();
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: '', content: '', category: '', tags: '' },
  });

  // Redirect unauthenticated users.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  /**
   * Handles the form submission to create a new discussion post.
   * This function creates the post, awards points to the user in a transaction,
   * and then redirects to the newly created post.
   * @param {PostFormValues} values - The validated form values.
   */
  const onSubmit = async (values: PostFormValues) => {
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'You must be logged in to create a post.' });
      return;
    }
    setIsSubmitting(true);

    const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const newPostData = {
      title: values.title,
      content: values.content,
      category: values.category,
      tags: tagsArray,
      userId: user.uid,
      username: userProfile.username,
      createdAt: new Date().toISOString(),
    };

    try {
      // Create the new post document.
      const newPostRef = await addDocumentNonBlocking(collection(firestore, 'discussions'), newPostData);
      
      if (!newPostRef) {
        throw new Error("Failed to create post document reference.");
      }

      // Award points to the user in a secure transaction.
      const userRef = doc(firestore, 'users', user.uid);
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
          transaction.update(userRef, { points: increment(10) });
        }
      });
      
      toast({
        title: 'Post Created!',
        description: 'You have been awarded 10 points.',
      });

      // Redirect to the new post's page.
      router.push(`/discussions/post/${newPostRef.id}`);

    } catch (error) {
      console.error('Error creating post:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create your post. Please try again.' });
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || !user) {
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
        <div className="max-w-3xl mx-auto">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle>Create a New Discussion Post</CardTitle>
              <CardDescription>Share your experience, ask a question, or start a conversation with the community.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter a descriptive title for your post"
                    {...register('title')}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Write the main body of your post here..."
                    className="min-h-[200px]"
                    {...register('content')}
                  />
                  {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.slug} value={cat.slug}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags (optional)</Label>
                        <Input
                            id="tags"
                            placeholder="e.g., headache, surgery, recovery"
                            {...register('tags')}
                        />
                        <p className="text-xs text-muted-foreground">Separate tags with a comma.</p>
                    </div>
                </div>
                
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Post
                    </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
