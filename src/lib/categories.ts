'use client';

import {
  Pill,
  Stethoscope,
  Brain,
  HeartHandshake,
  Briefcase,
  Users,
  Newspaper,
  MessageSquare,
  LucideIcon,
} from 'lucide-react';

export interface Category {
  slug: string;
  name: string;
  description: string;
  icon: React.ReactElement<LucideIcon>;
}

export const categories: Category[] = [
  { slug: 'symptom-management', name: 'Symptom Management', description: 'Share tips and strategies for managing daily symptoms.', icon: <Pill /> },
  { slug: 'diagnosis-newly-diagnosed', name: 'Diagnosis & Newly Diagnosed', description: 'A place for newcomers to ask questions and share their diagnosis journey.', icon: <Stethoscope /> },
  { slug: 'surgery-recovery', name: 'Surgery & Recovery', description: 'Discuss decompression surgery, recovery experiences, and tips.', icon: <Brain /> },
  { slug: 'mental-health-wellness', name: 'Mental Health & Wellness', description: 'Support for the emotional and mental challenges of living with a chronic condition.', icon: <HeartHandshake /> },
  { slug: 'daily-life-work', name: 'Daily Life & Work', description: 'Navigating work, hobbies, and daily routines with Chiari.', icon: <Briefcase /> },
  { slug: 'treatments-therapies', name: 'Treatments & Therapies', description: 'Discussing various treatments, from physical therapy to medication.', icon: <Pill /> },
  { slug: 'family-relationships', name: 'Family & Relationships', description: 'Guidance on explaining your condition and navigating relationships.', icon: <Users /> },
  { slug: 'research-news', name: 'Research & News', description: 'The latest news, research, and developments in Chiari treatment.', icon: <Newspaper /> },
];

export const categoryDetails: { [key: string]: { name: string; icon: React.ReactNode } } = categories.reduce((acc, category) => {
    acc[category.slug] = { name: category.name, icon: category.icon };
    return acc;
}, {} as { [key: string]: { name: string; icon: React.ReactNode } });

export const defaultCategory = { name: 'Discussions', icon: <MessageSquare /> };
