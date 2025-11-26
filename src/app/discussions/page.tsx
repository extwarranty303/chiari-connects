'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/app/header';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Brain, Stethoscope, HeartHandshake, Briefcase, Pill, Users, Newspaper, MessageSquare } from 'lucide-react';

/**
 * @fileoverview This page serves as the main entry point for the community discussions, displaying a list of categories.
 *
 * It provides a directory of different forum categories, allowing users to navigate to the topic that interests them.
 * Each category is presented as a clickable card with an icon and a brief description.
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
  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              Community Forums
            </h1>
            <p className="text-muted-foreground">Choose a category to start browsing discussions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => (
              <Link href={`/discussions/${category.slug}`} key={category.slug}>
                <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 group flex flex-col h-full">
                  <CardHeader className="flex-row gap-4 items-center">
                    <div className="bg-primary/10 p-3 rounded-lg text-primary">
                        {category.icon}
                    </div>
                    <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <CardDescription className="text-foreground/80 mt-1">{category.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <div className="flex-grow" />
                  <div className="p-6 pt-0 text-right text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ArrowRight className="inline-block" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
