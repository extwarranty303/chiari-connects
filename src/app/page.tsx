'use client';

import { Loader2, Activity, MessageSquare, Shield } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/header';
import { Footer } from '@/components/app/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useUser } from '@/firebase';

/**
 * @fileoverview This is the main homepage of the Chiari Connects application.
 * It serves as a welcome dashboard, providing quick access to the primary features 
 * of the platform: Symptom Tracking, Community Discussions, and the Admin Dashboard for privileged users.
 */

/**
 * The main homepage component for the application. It orchestrates the primary
 * user dashboard and the layout of navigation cards.
 *
 * @returns {React.ReactElement} The rendered main page.
 */
export default function MainPage() {
  const { user, isUserLoading, userProfile, isAdmin } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const welcomeName = userProfile?.username || 'User';

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader
        onUploadClick={() => {}}
        onDownloadClick={() => {}}
        showActions={false}
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome, {welcomeName}!
            </h1>
            <p className="text-muted-foreground mt-1">What would you like to do today?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Symptom Tracker Card */}
            <Link href="/symptom-tracker">
                <Card className="glassmorphism hover:border-primary/50 transition-all duration-200 group flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg text-primary mt-1">
                            <Activity />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">Symptom Tracker</CardTitle>
                            <CardDescription className="text-foreground/80 mt-1">Log your daily symptoms to track patterns and generate reports for your doctor.</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <span className="text-sm font-semibold text-primary flex items-center gap-2">
                        Go to Tracker <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </CardContent>
                </Card>
            </Link>

            {/* Discussions Card */}
             <Link href="/discussions">
                <Card className="glassmorphism hover:border-primary/50 transition-all duration-200 group flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg text-primary mt-1">
                            <MessageSquare />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">Community Forums</CardTitle>
                            <CardDescription className="text-foreground/80 mt-1">Connect with others, ask questions, and share your journey in our discussion forums.</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                   <CardContent className="mt-auto">
                    <span className="text-sm font-semibold text-primary flex items-center gap-2">
                        Browse Discussions <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </CardContent>
                </Card>
            </Link>

             {/* Admin Dashboard Card (only visible to admins) */}
            {isAdmin && (
              <Link href="/admin">
                <Card className="glassmorphism hover:border-destructive/50 transition-all duration-200 group flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="bg-destructive/10 p-3 rounded-lg text-destructive mt-1">
                            <Shield />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-lg">Admin Dashboard</CardTitle>
                            <CardDescription className="text-foreground/80 mt-1">Access administrative tools to manage users, moderate content, and view site analytics.</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                   <CardContent className="mt-auto">
                    <span className="text-sm font-semibold text-destructive flex items-center gap-2">
                        Go to Admin Panel <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
