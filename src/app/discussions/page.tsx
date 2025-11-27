'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AppHeader } from '@/components/app/header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, Stethoscope, HeartHandshake, Briefcase, Pill, Users, Newspaper, MessageSquare, PlusCircle } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Footer } from '@/components/app/footer';

/**
 * @fileoverview This page serves as the main entry point for the community discussions, displaying a list of categories.
 *
 * It provides a directory of different forum categories, allowing users to navigate to the topic that interests them.
 * Each category is presented as a clickable card with an icon, a brief description, and a post count.
 */

// A static list of forum categories with metadata.
const categories = [
  { slug: 'symptom-management', name: 'Symptom Management', description: 'Share tips and strategies for managing daily symptoms.', icon: <Pill /> },
  { slug: 'diagnosis-newly-diagnosed', name: 'Diagnosis & Newly Diagnosed', description: 'A place for newcomers to ask questions and share their diagnosis journey.', icon: <Stethoscope /> },
  { slug: 'surgery-recovery', name: 'Surgery & Recovery', description: 'Discuss decompression surgery, recovery experiences, and tips.', icon: <Brain /> },
  { slug: 'mental-health-wellness', name: 'Mental Health & Wellness', description: 'Support for the emotional and mental challenges of living with a chronic condition.', icon: <HeartHandshake /> },
  { slug: 'daily-life-work', name: 'Daily Life & Work', description: 'Navigating work, hobbies, and daily routines with Chiari.', icon: <Briefcase /> },
  { slug: 'treatments-therapies', name: 'Treatments & Therapies', description: 'Discussing various treatments, from physical therapy to medication.', icon: <Pill /> },
  { slug: 'family-relationships', name: 'Family & Relationships', description: 'Guidance on explaining your condition and navigating relationships.', icon: <Users /> },
  { slug: 'research-news', name: 'Research & News', description: 'The latest news, research, and developments in Chiari treatment.', icon: <Newspaper /> },
];

/**
 * The main component for the Discussions landing page.
 * It renders a grid of available categories for users to browse.
 *
 * @returns {React.ReactElement} The rendered category browser page.
 */
export default function DiscussionsPage() {
    const { firestore } = useFirebase();

    // Query to get all posts, which we'll use for counting.
    const allPostsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'discussions');
    }, [firestore]);

    const { data: posts } = useCollection<{category: string}>(allPostsQuery);

    // Calculate post counts for each category
    const postCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        categories.forEach(cat => counts[cat.slug] = 0);
        if (posts) {
            for (const post of posts) {
                if (post.category in counts) {
                    counts[post.category]++;
                }
            }
        }
        return counts;
    }, [posts]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <MessageSquare className="w-8 h-8 text-primary" />
                Community Forums
                </h1>
                <p className="text-muted-foreground">Choose a category to start browsing discussions.</p>
            </div>
             <Button asChild>
                <Link href="/discussions/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Post
                </Link>
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => (
              <Link href={`/discussions/${category.slug}`} key={category.slug}>
                <Card className="glassmorphism hover:border-primary/50 transition-all duration-200 group flex flex-col h-full">
                  <CardHeader className="flex-grow">
                    <div className="flex flex-row gap-4 items-start">
                        <div className="bg-primary/10 p-3 rounded-lg text-primary mt-1">
                            {category.icon}
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <CardDescription className="text-foreground/80 mt-1">{category.description}</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <div className="p-6 pt-2 flex justify-between items-center text-sm text-muted-foreground">
                    <span>{postCounts?.[category.slug] ?? 0} Posts</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-primary">
                        <ArrowRight className="inline-block" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

    
