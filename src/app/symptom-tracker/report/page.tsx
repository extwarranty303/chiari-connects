'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { Loader2, Printer } from 'lucide-react';

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

/**
 * @fileoverview This page generates a professional, printable report of the user's logged symptoms.
 *
 * It fetches all symptom data for the current user, organizes it into a clean table format,
 * and provides a button to print the report or save it as a PDF. The page is designed to be
 * printer-friendly, hiding non-essential UI elements like buttons during printing.
 */

/**
 * Calculates a summary of the symptom data.
 * @param {SymptomData[]} symptoms - An array of symptom data objects.
 * @returns An object containing the total entries, unique symptoms, and average severity/frequency.
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
 * The main component for the Symptom Report page.
 * It handles user authentication, fetches and displays symptom data,
 * and manages the print functionality.
 *
 * @returns {React.ReactElement} The rendered symptom report page.
 */
export default function SymptomReportPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  // Create a memoized, ordered query for the symptoms
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
   * Triggers the browser's print dialog to print or save the report.
   */
  const handlePrint = () => {
    window.print();
  };

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
      {/* Header section, hidden on print */}
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

      {/* Main report content */}
      <main className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto bg-card p-6 sm:p-10 rounded-lg shadow-md border print:shadow-none print:border-none print:p-0">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Symptom History Report</h2>
              <p className="text-muted-foreground">
                Generated on {format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>
            <Icons.logo className="w-20 h-20 text-primary hidden sm:block" />
          </div>

          {isLoadingSymptoms && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {symptomsError && (
            <div className="text-center text-destructive py-10">
              <p>Error: Could not load symptom data.</p>
            </div>
          )}

          {!isLoadingSymptoms && symptoms && (
            <>
              {symptoms.length > 0 ? (
                <div className="space-y-8">
                  {/* Summary Section */}
                  <div>
                    <h3 className="text-xl font-semibold border-b pb-2 mb-4">Summary</h3>
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

                  {/* Detailed Log Section */}
                  <div>
                    <h3 className="text-xl font-semibold border-b pb-2 mb-4">Detailed Log</h3>
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
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No symptom data available to generate a report.</p>
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

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #fff;
            color: #000;
          }
          .print\:hidden {
            display: none;
          }
          .print\:shadow-none {
            box-shadow: none;
          }
           .print\:border-none {
            border: none;
          }
          .print\:p-0 {
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
