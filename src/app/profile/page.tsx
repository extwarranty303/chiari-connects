'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, User as UserIcon, Activity, FileText, LogOut } from 'lucide-react';
import Link from 'next/link';

import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { type SymptomData } from '@/app/symptom-tracker/page';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app/header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * @fileoverview This page serves as the user's personal dashboard.
 *
 * It provides a comprehensive overview of the user's account information and
 * a summary of their tracked symptom data. It also offers quick links to
 * key sections of the application, such as the Symptom Tracker and the full report.
 */

// Defines the shape of the user profile data stored in Firestore.
interface UserProfile {
  username: string;
  email: string;
  createdAt: string;
}

/**
 * Calculates a statistical summary from an array of symptom data.
 * @param {SymptomData[]} symptoms - The array of symptom data objects.
 * @returns An object with summary statistics (total entries, unique symptoms, avg severity/frequency).
 */
function getSymptomSummary(symptoms: SymptomData[] | null) {
  if (!symptoms || symptoms.length === 0) {
    return { totalEntries: 0, uniqueSymptoms: 0, avgSeverity: 0, avgFrequency: 0 };
  }

  const totalEntries = symptoms.length;
  const uniqueSymptoms = new Set(symptoms.map(s => s.symptom.toLowerCase())).size;
  const totalSeverity = symptoms.reduce((sum, s) => sum + s.severity, 0);
  const totalFrequency = symptoms.reduce((sum, s) => sum + s.frequency, 0);

  return {
    totalEntries,
    uniqueSymptoms,
    avgSeverity: (totalSeverity / totalEntries).toFixed(1),
    avgFrequency: (totalFrequency / totalEntries).toFixed(1),
  };
}

/**
 * The main component for the user profile page.
 * It handles authentication, fetches all necessary user and symptom data,
 * and renders a dashboard-like interface for the user.
 *
 * @returns {React.ReactElement} The rendered user profile page.
 */
export default function ProfilePage() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect unauthenticated users.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Memoized query for the user's profile document.
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // Memoized query for all of the user's symptoms.
  const symptomsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'symptoms'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: symptoms, isLoading: isLoadingSymptoms } = useCollection<SymptomData>(symptomsQuery);

  const handleLogout = () => {
    auth.signOut();
    router.push('/auth');
  };

  const isLoading = isUserLoading || isProfileLoading || isLoadingSymptoms;

  // Show a loading screen while data is being fetched.
  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const summary = getSymptomSummary(symptoms);
  const userInitial = userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?');


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto grid gap-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              User Profile
            </h1>
            <p className="text-muted-foreground">Your personal dashboard and account overview.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: User Info & Actions */}
            <div className="lg:col-span-1 space-y-8">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.photoURL ?? ''} alt={userProfile?.username ?? 'User'} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{userProfile?.username ?? 'User'}</CardTitle>
                    <CardDescription>{userProfile?.email}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Account created on:</p>
                    <p className="font-medium text-foreground">
                      {userProfile?.createdAt ? format(new Date(userProfile.createdAt), 'MMMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Button asChild>
                    <Link href="/symptom-tracker">
                      <Activity className="mr-2 h-4 w-4" />
                      Go to Symptom Tracker
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/symptom-tracker/report">
                      <FileText className="mr-2 h-4 w-4" />
                      View Full Report
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Symptom Summary */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Symptom Data at a Glance</CardTitle>
                  <CardDescription>A summary of all your logged symptom data.</CardDescription>
                </CardHeader>
                <CardContent>
                  {symptoms && symptoms.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-muted/50 p-6 rounded-lg">
                        <p className="text-3xl font-bold">{summary.totalEntries}</p>
                        <p className="text-sm text-muted-foreground">Total Entries</p>
                      </div>
                      <div className="bg-muted/50 p-6 rounded-lg">
                        <p className="text-3xl font-bold">{summary.uniqueSymptoms}</p>
                        <p className="text-sm text-muted-foreground">Unique Symptoms</p>
                      </div>
                      <div className="bg-muted/50 p-6 rounded-lg">
                        <p className="text-3xl font-bold">{summary.avgSeverity}</p>
                        <p className="text-sm text-muted-foreground">Avg. Severity</p>
                      </div>
                      <div className="bg-muted/50 p-6 rounded-lg">
                        <p className="text-3xl font-bold">{summary.avgFrequency}</p>
                        <p className="text-sm text-muted-foreground">Avg. Frequency</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p className="font-medium">No symptom data found.</p>
                      <p className="text-sm mt-1">Start by logging your symptoms in the tracker.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
