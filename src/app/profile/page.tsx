'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, query, orderBy, doc, limit, where } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, User as UserIcon, Activity, FileText, LogOut, Award, Edit, MessageSquare, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { updateProfile } from 'firebase/auth';

import { useFirebase, useUser, useCollection, updateDocumentNonBlocking, uploadFile, useMemoFirebase, type UserProfile } from '@/firebase';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/app/header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/app/footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

/**
 * @fileoverview This page serves as the user's personal dashboard.
 *
 * It provides a comprehensive overview of the user's account information,
 * recent posts, and bookmarked discussions. It also includes an editable form
 * for updating personal details, displays community points, and allows profile picture uploads.
 */


// Zod schema for the profile update form.
const profileSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  city: z.string().min(1, { message: 'City is required.' }),
  state: z.string().min(1, { message: 'State is required.' }),
  phoneNumber: z.string().min(10, { message: 'Phone number must be at least 10 digits.' }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Interfaces for fetched data
interface DiscussionPost {
  id: string;
  title: string;
  category: string;
  createdAt: string;
}

interface BookmarkInfo {
    id: string;
    title: string;
    category: string;
}

/**
 * A dedicated component for the user profile form.
 */
function UserProfileForm({ userProfile, userId }: { userProfile: UserProfile, userId: string }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isAdmin, isModerator } = useUser();

    const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: userProfile.firstName || '',
            lastName: userProfile.lastName || '',
            city: userProfile.city || '',
            state: userProfile.state || '',
            phoneNumber: userProfile.phoneNumber || '',
        },
    });

    const onSubmit = (values: ProfileFormValues) => {
        setIsSubmitting(true);
        const userRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userRef, values);
        
        toast({ title: 'Profile Updated', description: 'Your information has been saved.' });
        setIsSubmitting(false);
    };
    
    const userRole = isAdmin ? 'Full Admin' : isModerator ? 'Moderator' : 'Standard User';

    return (
        <Card className="glassmorphism">
            <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>Keep your personal details up to date. Your username and role cannot be changed.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" {...register('firstName')} />
                            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" {...register('lastName')} />
                            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" {...register('city')} />
                            {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Input id="state" {...register('state')} />
                            {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input id="phoneNumber" type="tel" {...register('phoneNumber')} />
                        {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label>Username</Label>
                        <Input value={userProfile.username} disabled />
                    </div>
                     <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={userProfile.email} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>User Role</Label>
                        <Input value={userRole} disabled />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

/**
 * Component to display a list of the user's recent posts.
 */
function RecentPosts({ userId }: { userId: string }) {
    const { firestore } = useFirebase();
    const postsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'discussions'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(5));
    }, [firestore, userId]);
    const { data: posts, isLoading } = useCollection<DiscussionPost>(postsQuery);

    return (
        <Card className="glassmorphism">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare /> Your Recent Posts</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && <Loader2 className="animate-spin" />}
                {!isLoading && (!posts || posts.length === 0) && <p className="text-sm text-muted-foreground">You haven't made any posts yet.</p>}
                {posts && posts.length > 0 && (
                    <ul className="space-y-3">
                        {posts.map(post => (
                             <li key={post.id} className="text-sm">
                                <Link href={`/discussions/post/${post.id}`}>
                                    <div className="font-medium hover:underline text-primary">{post.title}</div>
                                </Link>
                                <div className="text-xs text-muted-foreground">
                                    in <Badge variant="secondary" className="mr-1">{post.category}</Badge>
                                    • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Component to display a list of the user's bookmarked posts.
 */
function BookmarkedPosts({ userId }: { userId: string }) {
    const { firestore } = useFirebase();

    // Query for bookmark document IDs
    const bookmarksQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'bookmarks'), orderBy('createdAt', 'desc'), limit(5));
    }, [firestore, userId]);
    
    const { data: bookmarks, isLoading: isLoadingBookmarks } = useCollection<{postId: string}>(bookmarksQuery);

    return (
        <Card className="glassmorphism">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bookmark /> Your Bookmarks</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoadingBookmarks && <Loader2 className="animate-spin" />}
                {!isLoadingBookmarks && (!bookmarks || bookmarks.length === 0) && <p className="text-sm text-muted-foreground">You haven't bookmarked any posts yet.</p>}
                {bookmarks && bookmarks.length > 0 && (
                    <ul className="space-y-3">
                        {bookmarks.map(bookmark => (
                             <li key={bookmark.id} className="text-sm">
                                <Link href={`/discussions/post/${bookmark.id}`}>
                                    <div className="font-medium hover:underline text-primary">View bookmarked post</div>
                                </Link>
                                <div className="text-xs text-muted-foreground">Post ID: {bookmark.id}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

export default function ProfilePage() {
  const { auth, firestore, storage } = useFirebase();
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    auth.signOut().then(() => {
      router.push('/');
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }
    const file = event.target.files[0];
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a JPG, PNG, or WEBP image.' });
      return;
    }
    
    setIsUploading(true);
    try {
      const filePath = `profile-pictures/${user.uid}`;
      const photoURL = await uploadFile(storage, filePath, file);
      
      // Update Firebase Auth user profile
      await updateProfile(user, { photoURL });

      // Update Firestore user document
      const userRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { photoURL });

      toast({ title: 'Profile Picture Updated!', description: 'Your new avatar has been saved.' });
    } catch (error) {
      console.error("Error uploading profile picture: ", error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not update your profile picture. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };


  const isLoading = isUserLoading || !userProfile;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userInitial = userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?');

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto grid gap-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              User Profile
            </h1>
            <p className="text-muted-foreground">Your personal dashboard and account overview.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <Card className="glassmorphism">
                <CardHeader className="items-center text-center">
                    <div className="relative group">
                        <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                            <AvatarImage src={user.photoURL ?? ''} alt={userProfile?.username ?? 'User'} />
                            <AvatarFallback className="text-4xl">{userInitial}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleAvatarClick}>
                           {isUploading ? (
                               <Loader2 className="h-8 w-8 animate-spin text-white" />
                           ) : (
                               <Edit className="h-8 w-8 text-white" />
                           )}
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg, image/png, image/webp" />

                  <div className="mt-4">
                    <CardTitle className="text-2xl">{userProfile?.username ?? 'User'}</CardTitle>
                    <CardDescription>{userProfile?.email}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-sm text-muted-foreground space-y-4">
                    <div>
                      <p>
                        Member since <span className="font-medium text-foreground">{userProfile?.createdAt ? format(new Date(userProfile.createdAt), 'MMMM d, yyyy') : 'N/A'}</span>
                      </p>
                    </div>
                     <div>
                        <p className="flex items-center justify-center gap-1"><Award className="w-4 h-4 text-amber-500" /> Community Points:</p>
                        <p className="font-medium text-foreground text-lg">{userProfile?.points ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
               <RecentPosts userId={user.uid} />

              <BookmarkedPosts userId={user.uid} />

              <Card className="glassmorphism">
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

            <div className="lg:col-span-2">
                {userProfile && <UserProfileForm userProfile={userProfile} userId={user.uid} />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
