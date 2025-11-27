'use client';

import { collection, query, orderBy, collectionGroup } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, User, MessageSquare, Activity, Download, ShieldAlert, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { AppHeader } from '@/components/app/header';
import AdminRouteGuard from '@/components/app/admin-route-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/app/footer';

/**
 * @fileoverview This is the main page for the Admin Dashboard.
 *
 * It provides a centralized interface for administrators to manage the application.
 * Key functionalities include:
 * - **Security**: Wrapped in an `AdminRouteGuard` to ensure only admins can access it.
 * - **Statistics**: Displays high-level site statistics like total users, posts, and symptom entries.
 * - **User Management**: Shows a table of all registered users with their details and roles.
 * - **Content Moderation**: Displays tables for all discussion posts and user-submitted reports.
 * - **Data Export**: Allows admins to export user and post data as CSV files.
 * - **Data Fetching**: Uses admin-specific queries to fetch all user, content, and report data.
 */

// Data-shape interfaces for clarity.
interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  roles?: {
    admin?: boolean;
    moderator?: boolean;
  };
}

interface DiscussionPost {
  id: string;
  title: string;
  username: string;
  category: string;
  createdAt: string;
}

interface Symptom {
  id: string;
}

interface PostReport {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
}


/**
 * Converts an array of objects to a CSV string and triggers a download.
 * @param {string} filename - The desired name of the downloaded file (e.g., 'users.csv').
 * @param {any[]} rows - The array of data objects to convert.
 */
function exportToCsv(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) {
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          let field = row[header];
          // Handle cases where the field might contain a comma or quote
          if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}


/**
 * The main component for the Admin Dashboard page.
 * It orchestrates data fetching and renders all the administrative modules.
 *
 * @returns {React.ReactElement} The rendered admin dashboard page.
 */
export default function AdminDashboardPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // Memoized query to fetch all users.
  const allUsersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  // Memoized query to fetch all discussion posts.
  const allDiscussionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'discussions'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  // Memoized query to fetch all symptom documents (only for counting).
  const allSymptomsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collectionGroup(firestore, 'symptoms');
  }, [firestore]);
  
  // Memoized query to fetch all reports from the 'reports' subcollection group.
  const allReportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'reports'), orderBy('createdAt', 'desc'));
  }, [firestore]);


  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(allUsersQuery);
  const { data: posts, isLoading: isLoadingPosts } = useCollection<DiscussionPost>(allDiscussionsQuery);
  const { data: symptoms, isLoading: isLoadingSymptoms } = useCollection<Symptom>(allSymptomsQuery);
  const { data: reports, isLoading: isLoadingReports } = useCollection<PostReport>(allReportsQuery);
  
  const isLoading = isLoadingUsers || isLoadingPosts || isLoadingSymptoms || isLoadingReports;

  /**
   * Handles the export of user data to a CSV file.
   */
  const handleExportUsers = () => {
    if (users) {
      exportToCsv(`chiari-connects-users-${new Date().toISOString().split('T')[0]}.csv`, users.map(({ id, username, email, createdAt }) => ({ id, username, email, createdAt })));
      toast({ title: 'User data export started.' });
    } else {
      toast({ variant: 'destructive', title: 'No user data to export.' });
    }
  };

  /**
   * Handles the export of post data to a CSV file.
   */
  const handleExportPosts = () => {
    if (posts) {
      exportToCsv(`chiari-connects-posts-${new Date().toISOString().split('T')[0]}.csv`, posts.map(({ id, title, username, category, createdAt }) => ({ id, title, username, category, createdAt })));
      toast({ title: 'Post data export started.' });
    } else {
      toast({ variant: 'destructive', title: 'No post data to export.' });
    }
  };
  
  /**
   * Placeholder function for making a user a moderator.
   * This would typically call a Firebase Cloud Function to set custom claims.
   * @param {string} userId - The ID of the user to make a moderator.
   */
  const handleMakeModerator = (userId: string) => {
    // In a production app, this would trigger a Firebase Cloud Function.
    // For example:
    // const makeModerator = httpsCallable(functions, 'makeModerator');
    // makeModerator({ userId: userId }).then(...).catch(...);
    toast({
        title: 'Feature In Development',
        description: `Would assign moderator role to user: ${userId}. This requires a server-side function to set custom claims securely.`,
    });
  };


  return (
    <AdminRouteGuard>
      <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <AppHeader onUploadClick={() => { }} onDownloadClick={() => { }} showActions={false} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto grid gap-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage users, view reports, and moderate content.
              </p>
            </div>
            
             {/* High-level Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="glassmorphism">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : users?.length ?? 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="glassmorphism">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                     {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : posts?.length ?? 0}
                  </div>
                </CardContent>
              </Card>
               <Card className="glassmorphism">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Symptom Entries</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                   <div className="text-2xl font-bold">
                     {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : symptoms?.length ?? 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="glassmorphism">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Reports</CardTitle>
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                   <div className="text-2xl font-bold">
                     {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : reports?.length ?? 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Moderation Queue */}
            <Card className="glassmorphism">
                <CardHeader>
                    <CardTitle>Moderation Queue</CardTitle>
                    <CardDescription>Review posts that have been reported by the community.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reported Post ID</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Reported By (UID)</TableHead>
                                <TableHead>Date Reported</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingReports ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : reports && reports.length > 0 ? (
                                reports.map(report => (
                                    <TableRow key={report.id}>
                                        <TableCell className="font-mono text-xs">{report.postId}</TableCell>
                                        <TableCell>{report.reason}</TableCell>
                                        <TableCell className="font-mono text-xs">{report.reporterId}</TableCell>
                                        <TableCell>{format(new Date(report.createdAt), 'MMM d, yyyy, h:mm a')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/discussions/post/${report.postId}`} target="_blank">
                                                    <FileText className="mr-2 h-4 w-4" /> View Post
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No active reports.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>


            <div className="grid gap-8 md:grid-cols-1">
                {/* User Management Table */}
                <Card className="glassmorphism">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>View and manage all registered users.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExportUsers} disabled={isLoadingUsers || !users || users.length === 0}>
                           <Download className="mr-2 h-4 w-4" />
                           Export Users
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Date Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingUsers ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : users && users.length > 0 ? (
                                    users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.username}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                {user.roles?.admin ? (
                                                    <Badge variant="destructive">Admin</Badge>
                                                ) : user.roles?.moderator ? (
                                                    <Badge variant="secondary">Moderator</Badge>
                                                ) : (
                                                    <Badge variant="outline">User</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    disabled={!!user.roles?.moderator || !!user.roles?.admin}
                                                    onClick={() => handleMakeModerator(user.id)}
                                                >
                                                  {user.roles?.moderator ? (
                                                    <>
                                                      <CheckCircle className="mr-2 h-4 w-4" />
                                                      Moderator
                                                    </>
                                                  ) : user.roles?.admin ? (
                                                      'Admin'
                                                  ) : (
                                                     'Make Moderator'
                                                  )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">No users found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Content Moderation Table */}
                <Card className="glassmorphism">
                     <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>All Discussion Posts</CardTitle>
                            <CardDescription>A view of all posts across the community.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExportPosts} disabled={isLoadingPosts || !posts || posts.length === 0}>
                           <Download className="mr-2 h-4 w-4" />
                           Export Posts
                        </Button>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Date Posted</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingPosts ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : posts && posts.length > 0 ? (
                                    posts.map(post => (
                                        <TableRow key={post.id}>
                                            <TableCell className="font-medium">{post.title}</TableCell>
                                            <TableCell>{post.username}</TableCell>
                                            <TableCell>{post.category}</TableCell>
                                            <TableCell>{format(new Date(post.createdAt), 'MMM d, yyyy')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">No posts found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AdminRouteGuard>
  );
}
