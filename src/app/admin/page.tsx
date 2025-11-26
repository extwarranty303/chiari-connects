'use client';

import { collection, query, orderBy, collectionGroup } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, User, MessageSquare, Activity, Download } from 'lucide-react';
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

/**
 * @fileoverview This is the main page for the Admin Dashboard.
 *
 * It provides a centralized interface for administrators to manage the application.
 * Key functionalities include:
 * - **Security**: Wrapped in an `AdminRouteGuard` to ensure only admins can access it.
 * - **Statistics**: Displays high-level site statistics like total users, posts, and symptom entries.
 * - **User Management**: Shows a table of all registered users with their details.
 * - **Content Moderation**: Displays a table of all discussion posts for easy monitoring.
 * - **Data Fetching**: Uses admin-specific queries to fetch all user and content data from Firestore.
 */

// Data-shape interfaces for clarity.
interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: string;
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


/**
 * The main component for the Admin Dashboard page.
 * It orchestrates data fetching and renders all the administrative modules.
 *
 * @returns {React.ReactElement} The rendered admin dashboard page.
 */
export default function AdminDashboardPage() {
  const { firestore } = useFirebase();

  // Memoized query to fetch all users.
  const allUsersQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  // Memoized query to fetch all discussion posts.
  const allDiscussionsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'discussions'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  // Memoized query to fetch all symptom documents (only for counting).
  const allSymptomsQuery = useMemoFirebase(() => {
    // This uses a collection group query to get all 'symptoms' from all users.
    return collectionGroup(firestore, 'symptoms');
  }, [firestore]);


  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(allUsersQuery);
  const { data: posts, isLoading: isLoadingPosts } = useCollection<DiscussionPost>(allDiscussionsQuery);
  const { data: symptoms, isLoading: isLoadingSymptoms } = useCollection<Symptom>(allSymptomsQuery);
  
  const isLoading = isLoadingUsers || isLoadingPosts || isLoadingSymptoms;

  return (
    <AdminRouteGuard>
      <div className="flex flex-col h-screen bg-background text-foreground font-body">
        <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
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
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
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
              <Card>
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
               <Card>
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
            </div>


            <div className="grid gap-8 md:grid-cols-1">
                {/* User Management Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>View and manage all registered users.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" disabled>
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
                                    <TableHead>Date Joined</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingUsers ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : users && users.length > 0 ? (
                                    users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.username}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">No users found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Content Moderation Table */}
                <Card>
                     <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Content Moderation</CardTitle>
                            <CardDescription>View and manage all discussion posts.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" disabled>
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
      </div>
    </AdminRouteGuard>
  );
}
