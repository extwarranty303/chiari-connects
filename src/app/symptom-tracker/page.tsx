'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, FileText, AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { AppHeader } from '@/components/app/header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useFirebase,
  useUser,
  useCollection,
  addDocumentNonBlocking,
  useMemoFirebase,
  deleteCollectionNonBlocking,
} from '@/firebase';
import { cn } from '@/lib/utils';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Footer } from '@/components/app/footer';


/**
 * @fileoverview This page allows users to track their symptoms over time.
 *
 * It provides a form to log new symptom entries (name, severity, frequency, date)
 * and displays a bar chart visualizing the history of the last 30 logged symptoms.
 * All data is securely stored and retrieved from the user's private space in Firestore.
 * It also includes options to view a detailed report and delete all user data.
 */

// Zod schema for validating the symptom logging form.
const symptomSchema = z.object({
  symptom: z.string().min(1, 'Symptom name is required.'),
  severity: z.coerce.number().min(1, 'Severity is required.').max(10),
  frequency: z.coerce.number().min(1, 'Frequency is required.').max(10),
  date: z.date({ required_error: 'Please select a date.' }),
});

type SymptomFormValues = z.infer<typeof symptomSchema>;

/**
 * Type definition for a single symptom data object retrieved from Firestore.
 * Extends the form values with Firestore-generated fields.
 */
export type SymptomData = SymptomFormValues & { id: string; userId: string, createdAt: string, date: string };


/**
 * The main component for the Symptom Tracker page.
 * It handles user authentication, data fetching for symptoms, form submission
 * for new symptoms, data deletion, and rendering the complete UI.
 *
 * @returns {React.ReactElement} The rendered symptom tracker page.
 */
export default function SymptomTrackerPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SymptomFormValues>({
    resolver: zodResolver(symptomSchema),
    defaultValues: {
      symptom: '',
      severity: 5,
      frequency: 5,
      date: new Date(),
    },
  });

  // Redirect unauthenticated users to the auth page.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Memoized Firestore query to fetch the last 30 symptoms for the current user, ordered by date.
  const symptomsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'symptoms'), orderBy('date', 'desc'), limit(30));
  }, [firestore, user]);

  const {
    data: symptoms,
    isLoading: isLoadingSymptoms,
    error: symptomsError,
  } = useCollection<SymptomData>(symptomsQuery);

  /**
   * Handles the form submission to log a new symptom.
   * It creates a new document in the user's `symptoms` subcollection in Firestore.
   * @param {SymptomFormValues} values - The validated form values.
   */
  const onSubmit = (values: SymptomFormValues) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to track symptoms.',
      });
      return;
    }

    setIsSubmitting(true);
    
    const newSymptom = {
      ...values,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      date: values.date.toISOString(),
    };

    const collectionRef = collection(firestore, 'users', user.uid, 'symptoms');

    addDocumentNonBlocking(collectionRef, newSymptom)
        .then((docRef) => {
            if(docRef) {
                 toast({
                    title: 'Symptom Logged!',
                    description: `${values.symptom} has been added to your tracker.`,
                });
                reset();
            }
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  /**
   * Handles the deletion of all symptom data for the current user after confirmation.
   * This is an irreversible action.
   */
  const handleDeleteAllSymptoms = () => {
    if (!user || !firestore) {
       toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to delete data.',
      });
      return;
    }
    setIsDeleting(true);
    const collectionRef = collection(firestore, 'users', user.uid, 'symptoms');
    deleteCollectionNonBlocking(collectionRef)
        .then(() => {
            toast({
                title: 'Data Deleted',
                description: 'All your symptom data has been successfully deleted.',
            });
        })
        .finally(() => {
            setIsDeleting(false);
        });
  };

  // Show a full-page loader while checking authentication.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Format and sort data for the chart (ascending by date).
  const formattedData =
    symptoms?.map(item => ({
      ...item,
      date: format(new Date(item.date), 'MMM d'),
    })).reverse() ?? []

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto grid gap-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Symptom Tracker
              </h1>
              <p className="text-muted-foreground mt-1">Log your symptoms daily to visualize patterns and create reports.</p>
            </div>
            <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting || !symptoms || symptoms.length === 0}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all
                        of your symptom data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllSymptoms}>
                        Yes, delete my data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button asChild>
                    <Link href="/symptom-tracker/report">
                        <FileText className="mr-2 h-4 w-4" />
                        View Report
                    </Link>
                </Button>
            </div>
          </div>


          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="glassmorphism">
                <CardHeader>
                  <CardTitle>Recent Symptom History</CardTitle>
                  <CardDescription>
                    Visualizing your last 30 symptom entries by severity and frequency.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    {isLoadingSymptoms ? (
                       <div className="flex items-center justify-center h-full">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                       </div>
                    ) : symptomsError ? (
                        <div className="flex items-center justify-center h-full">
                           <Alert variant="destructive" className="w-full">
                             <AlertTriangle className="h-4 w-4" />
                             <AlertTitle>Error</AlertTitle>
                             <AlertDescription>
                               Could not load symptom data. Please check your connection or try again later.
                             </AlertDescription>
                           </Alert>
                        </div>
                    ) : symptoms && symptoms.length > 0 ? (
                      <BarChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                            contentStyle={{
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                                backdropFilter: 'blur(10px)',
                                backgroundColor: 'hsla(var(--card), 0.6)'
                            }}
                        />
                        <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
                        <Bar
                          dataKey="severity"
                          fill="hsl(var(--primary))"
                          name="Severity (1-10)"
                        />
                        <Bar
                          dataKey="frequency"
                          fill="hsl(var(--accent))"
                          name="Frequency (1-10)"
                        />
                      </BarChart>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-lg">
                            <p className="font-medium">No symptoms logged yet.</p>
                            <p className="text-sm mt-1">Add a symptom using the form to see your chart!</p>
                        </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Log a New Symptom</CardTitle>
                  <CardDescription>
                    Fill out the form to add a new entry to your tracker.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="symptom">Symptom Name</Label>
                      <Input
                        id="symptom"
                        placeholder="e.g., Headache, Dizziness"
                        {...register('symptom')}
                        aria-invalid={errors.symptom ? 'true' : 'false'}
                        aria-describedby="symptom-error"
                      />
                      {errors.symptom && (
                        <p id="symptom-error" className="text-xs text-destructive">
                          {errors.symptom.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="severity">Severity (1-10)</Label>
                            <Controller
                                name="severity"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                                        <SelectTrigger id="severity" aria-label="Select severity">
                                            <SelectValue placeholder="Select severity" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[...Array(10)].map((_, i) => (
                                                <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                             {errors.severity && (
                                <p className="text-xs text-destructive">
                                {errors.severity.message}
                                </p>
                            )}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="frequency">Frequency (1-10)</Label>
                             <Controller
                                name="frequency"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                                        <SelectTrigger id="frequency" aria-label="Select frequency">
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[...Array(10)].map((_, i) => (
                                                <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                             {errors.frequency && (
                                <p className="text-xs text-destructive">
                                {errors.frequency.message}
                                </p>
                            )}
                        </div>
                    </div>


                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Controller
                        name="date"
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                                aria-label="Pick a date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 glassmorphism">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {errors.date && (
                        <p className="text-xs text-destructive">
                          {errors.date.message}
                        </p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Log Symptom
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
