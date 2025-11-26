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
import { Calendar as CalendarIcon, Loader2, FileText } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import {
  useFirebase,
  useUser,
  useCollection,
  addDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import { cn } from '@/lib/utils';
import { collection } from 'firebase/firestore';

/**
 * @fileoverview This page allows users to track their symptoms over time.
 *
 * It provides a form to log new symptom entries and displays a chart
 * visualizing the history of logged symptoms, including their severity and frequency.
 * All data is securely stored and retrieved from the user's personal Firestore document space.
 */

const symptomSchema = z.object({
  symptom: z.string().min(1, 'Symptom name is required.'),
  severity: z.coerce.number().min(1, 'Severity is required.').max(10),
  frequency: z.coerce.number().min(1, 'Frequency is required.').max(10),
  date: z.date({ required_error: 'Please select a date.' }),
});

type SymptomFormValues = z.infer<typeof symptomSchema>;
export type SymptomData = SymptomFormValues & { id: string; userId: string, createdAt: string, date: string };


/**
 * The main component for the Symptom Tracker page.
 * It handles user authentication, data fetching for symptoms,
 * form submission for new symptoms, and rendering the UI.
 *
 * @returns {React.ReactElement} The rendered symptom tracker page.
 */
export default function SymptomTrackerPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  const symptomsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'symptoms');
  }, [firestore, user]);

  const {
    data: symptoms,
    isLoading: isLoadingSymptoms,
    error: symptomsError,
  } = useCollection<SymptomData>(symptomsQuery);

  /**
   * Handles the form submission to log a new symptom.
   * @param {SymptomFormValues} values - The validated form values.
   */
  const onSubmit = (values: SymptomFormValues) => {
    if (!user) {
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
        .then(() => {
            toast({
                title: 'Symptom Logged!',
                description: `${values.symptom} has been added to your tracker.`,
            });
            reset();
        })
        .catch(() => {
            // Error is handled by the global error emitter in non-blocking-updates
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formattedData =
    symptoms?.map(item => ({
      ...item,
      date: format(new Date(item.date), 'MMM d'),
    })) ?? [];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto grid gap-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Symptom Tracker
            </h1>
            <Button asChild>
                <Link href="/symptom-tracker/report">
                    <FileText className="mr-2 h-4 w-4" />
                    View Report
                </Link>
            </Button>
          </div>


          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-card/60 backdrop-blur-xl border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle>Symptom History</CardTitle>
                  <CardDescription>
                    Visualize your symptom severity and frequency over time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    {isLoadingSymptoms ? (
                       <div className="flex items-center justify-center h-full">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                       </div>
                    ) : symptomsError ? (
                        <div className="flex items-center justify-center h-full text-destructive">
                            <p>Error loading symptom data.</p>
                        </div>
                    ) : symptoms && symptoms.length > 0 ? (
                      <BarChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                            contentStyle={{
                                background: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)',
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
                         <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>No symptoms logged yet. Add one to see your chart!</p>
                        </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-card/60 backdrop-blur-xl border-white/20 shadow-lg">
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
                      />
                      {errors.symptom && (
                        <p className="text-xs text-destructive">
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
                                        <SelectTrigger>
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
                                        <SelectTrigger>
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
                      <Label htmlFor="date">Date</Label>
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
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
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
    </div>
  );
}
