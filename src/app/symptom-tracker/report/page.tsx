'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { Loader2, Printer, BrainCircuit, AlertTriangle, Upload } from 'lucide-react';

import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { type SymptomData } from '@/app/symptom-tracker/page';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/app/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { analyzeSymptoms, AnalyzeSymptomsInput } from '@/ai/flows/ai-analyze-symptoms';
import { analyzeSymptomsWithImaging, AnalyzeSymptomsWithImagingInput } from '@/ai/flows/ai-analyze-symptoms-with-imaging';


/**
 * @fileoverview This page generates a professional, printable report of the user's logged symptoms.
 *
 * It fetches all symptom data for the current user, organizes it into a clean table,
 * and provides a button to print the report or save it as a PDF. The page is designed to be
 * printer-friendly, hiding non-essential UI elements during printing. It also includes an
 * AI-powered analysis of the symptom data, with an option to upload medical imaging for a more
 * comprehensive summary.
 */

/**
 * Calculates a statistical summary of the provided symptom data.
 * @param {SymptomData[]} symptoms - An array of symptom data objects.
 * @returns An object containing the total entries, number of unique symptoms, and average severity/frequency.
 */
function getReportSummary(symptoms: SymptomData[]) {
  if (!symptoms || symptoms.length === 0) {
    return {
      totalEntries: 0,
      uniqueSymptoms: 0,
      avgSeverity: 0,
      avgFrequency: 0,
    };
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
 * A component that provides an AI-powered analysis of the user's symptom data.
 * It allows for optional medical imaging uploads to generate a more comprehensive summary.
 * The analysis is generated on-demand by calling a Genkit AI flow.
 *
 * @param {{symptoms: SymptomData[]}} props - The user's symptom data.
 * @returns {React.ReactElement} The AI analysis section component.
 */
function AiAnalysis({ symptoms }: { symptoms: SymptomData[] }) {
    const [isPending, startTransition] = useTransition();
    const [analysis, setAnalysis] = useState('');
    const [error, setError] = useState('');
    const [imagingFile, setImagingFile] = useState<File | null>(null);
    const [imagingPreview, setImagingPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    /**
     * Converts a File object to a Base64 encoded data URI.
     * @param {File} file The file to convert.
     * @returns {Promise<string>} A promise that resolves with the data URI string.
     */
    const toDataURL = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
    });

    /**
     * Handles the change event from the file input, validating the file type
     * and setting the state for the selected image.
     * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event.
     */
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                setImagingFile(file);
                setImagingPreview(URL.createObjectURL(file));
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Invalid File Type',
                    description: 'Please upload a valid image file.',
                });
            }
        }
    };

    /**
     * Triggers the AI analysis flow. It prepares the input data (symptoms and optional imaging)
     * and calls the appropriate AI flow, then displays the result or an error message.
     */
    const handleGenerateAnalysis = () => {
        startTransition(async () => {
            setError('');
            setAnalysis('');
            try {
                // Prepare the base symptom input for the AI flow.
                const symptomInput: AnalyzeSymptomsInput = {
                    symptoms: symptoms.map(s => ({
                        symptom: s.symptom,
                        severity: s.severity,
                        frequency: s.frequency,
                        date: format(parseISO(s.date), 'yyyy-MM-dd')
                    }))
                };

                let result;
                if (imagingFile) {
                    // If an image is provided, use the imaging analysis flow.
                    const imagingDataUri = await toDataURL(imagingFile);
                    const imagingInput: AnalyzeSymptomsWithImagingInput = {
                        ...symptomInput,
                        imagingDataUri: imagingDataUri,
                    };
                    result = await analyzeSymptomsWithImaging(imagingInput);
                } else {
                    // Otherwise, use the text-only symptom analysis flow.
                    result = await analyzeSymptoms(symptomInput);
                }

                setAnalysis(result.analysis);
            } catch (e) {
                console.error("AI analysis failed:", e);
                setError("An error occurred while generating the analysis. Please try again.");
            }
        });
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-xl font-semibold border-b pb-2 mb-4 flex-grow">AI-Generated Summary</h3>
                <div className="flex gap-2 print:hidden -mt-4 sm:mt-0">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                        <Upload className="mr-2 h-4 w-4" />
                        {imagingFile ? 'Change Image' : 'Upload Imaging'}
                    </Button>
                    <Button onClick={handleGenerateAnalysis} disabled={isPending || symptoms.length === 0}>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        {isPending ? 'Analyzing...' : 'Generate AI Summary'}
                    </Button>
                </div>
            </div>
             <div className="mt-4 bg-muted/50 p-4 rounded-lg min-h-[150px] print:bg-white print:border print:border-gray-200">
                {imagingPreview && (
                    <div className="mb-4 print:hidden">
                        <p className="text-sm font-medium mb-2">Imaging Preview:</p>
                        <img src={imagingPreview} alt="Imaging preview" className="max-w-full rounded-md max-h-48" />
                    </div>
                 )}
                {isPending && (
                     <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                )}
                {error && (
                    <div className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <p>{error}</p>
                    </div>
                )}
                {analysis && (
                    <div className="whitespace-pre-wrap font-sans text-sm">{analysis}</div>
                )}
                {!isPending && !analysis && !error && (
                    <p className="text-sm text-muted-foreground text-center pt-10">
                        Optionally upload medical imaging, then click the button to generate an AI-powered summary of your symptom data.
                    </p>
                )}
             </div>
        </div>
    );
}

/**
 * The main component for the Symptom Report page.
 * It handles user authentication, fetches all symptom data from Firestore,
 * displays it in a structured format, and manages the print functionality.
 *
 * @returns {React.ReactElement} The rendered symptom report page.
 */
export default function SymptomReportPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect unauthenticated users.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Create a memoized, ordered query for all of the user's symptoms.
  const symptomsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'symptoms'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const {
    data: symptoms,
    isLoading: isLoadingSymptoms,
    error: symptomsError,
  } = useCollection<SymptomData>(symptomsQuery);

  /**
   * Triggers the browser's print dialog to print or save the report as a PDF.
   */
  const handlePrint = () => {
    window.print();
  };

  // Show a full-page loader while checking authentication.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const summary = getReportSummary(symptoms || []);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header section, hidden from print output. */}
      <header className="p-4 sm:p-8 flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Symptom Report</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            Back to Tracker
          </Button>
          <Button onClick={handlePrint} disabled={!symptoms || symptoms.length === 0}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </header>

      {/* Main report content, styled for screen and print. */}
      <main className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto bg-card p-6 sm:p-10 rounded-lg shadow-md border print:shadow-none print:border-none print:p-0">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Symptom History Report</h2>
              <p className="text-muted-foreground">
                Generated on {format(new Date(), 'MMMM d, yyyy')} for {user.displayName || user.email}
              </p>
            </div>
            <Icons.logo className="w-20 h-20 text-primary hidden sm:block print:hidden" />
          </div>

          {isLoadingSymptoms && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {symptomsError && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Could not load symptom data. Please try again later.</AlertDescription>
            </Alert>
          )}

          {!isLoadingSymptoms && symptoms && (
            <>
              {symptoms.length > 0 ? (
                <div className="space-y-12">
                   {/* AI Analysis Section */}
                   <AiAnalysis symptoms={symptoms} />
                  
                  {/* Summary Statistics Section */}
                  <div>
                    <h3 className="text-xl font-semibold border-b pb-2 mb-4">Data Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-2xl font-bold">{summary.totalEntries}</p>
                            <p className="text-sm text-muted-foreground">Total Entries</p>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-2xl font-bold">{summary.uniqueSymptoms}</p>
                            <p className="text-sm text-muted-foreground">Unique Symptoms</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-2xl font-bold">{summary.avgSeverity}</p>
                            <p className="text-sm text-muted-foreground">Avg. Severity</p>
                        </div>
                         <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-2xl font-bold">{summary.avgFrequency}</p>
                            <p className="text-sm text-muted-foreground">Avg. Frequency</p>
                        </div>
                    </div>
                  </div>

                  {/* Detailed Log Table Section */}
                  <div>
                    <h3 className="text-xl font-semibold border-b pb-2 mb-4">Detailed Log</h3>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-1/4">Date</TableHead>
                            <TableHead>Symptom</TableHead>
                            <TableHead className="text-center">Severity (1-10)</TableHead>
                            <TableHead className="text-center">Frequency (1-10)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {symptoms.map(symptom => (
                            <TableRow key={symptom.id}>
                                <TableCell>{format(parseISO(symptom.date), 'PPP')}</TableCell>
                                <TableCell className="font-medium">{symptom.symptom}</TableCell>
                                <TableCell className="text-center">{symptom.severity}</TableCell>
                                <TableCell className="text-center">{symptom.frequency}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <h3 className="text-lg font-medium">No Data to Report</h3>
                  <p className="text-muted-foreground mt-2">
                    Once you start logging symptoms, you can generate a report here.
                  </p>
                   <Button variant="outline" className="mt-4" onClick={() => router.push('/symptom-tracker')}>
                      Go to Symptom Tracker
                   </Button>
                </div>
              )}
            </>
          )}

          <div className="mt-12 pt-6 border-t text-xs text-muted-foreground text-center">
            <p>
              <strong>Disclaimer:</strong> This report is a log of self-reported data and is intended for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </main>

      {/* Print-specific styles to hide UI elements and optimize layout for printing. */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #fff;
            color: #000;
          }
          .print\\:hidden {
            display: none;
          }
          .print\\:shadow-none {
            box-shadow: none;
          }
           .print\\:border-none {
            border: none;
          }
          .print\\:p-0 {
            padding: 0;
          }
          .print\\:bg-white {
            background-color: #fff;
          }
          .print\\:border {
            border-width: 1px;
          }
          .print\\:border-gray-200 {
            border-color: #e5e7eb;
          }
        }
      `}</style>
    </div>
  );
}

    