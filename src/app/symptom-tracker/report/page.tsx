'use client';

import { useEffect, useState, useTransition, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { Loader2, Printer, BrainCircuit, AlertTriangle, Upload, File, X, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';


import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { type SymptomData } from '@/app/symptom-tracker/page';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { analyzeSymptoms } from '@/ai/flows/ai-analyze-symptoms';
import { analyzeSymptomsWithImaging } from '@/ai/flows/ai-analyze-symptoms-with-imaging';
import { analyzeSymptomsWithReport } from '@/ai/flows/ai-analyze-symptoms-with-report';
import { consolidateAnalyses } from '@/ai/flows/ai-consolidate-analyses';
import { generateDoctorQuestions } from '@/ai/flows/ai-generate-doctor-questions';
import { Logo } from '@/components/app/logo';

/**
 * @fileoverview This page generates a professional, printable report of the user's logged symptoms.
 *
 * It fetches all symptom data, organizes it into visual charts and summary tables,
 * and provides a button to print the report or save it as a PDF. It also includes an
 * AI-powered analysis of the symptom data, with an option to upload medical imaging and reports
 * for a more comprehensive summary.
 */

// Define types for previewing uploaded files
interface FilePreview {
    name: string;
    type: 'image' | 'document';
    url: string; // data URI
}

// Pre-defined color palette for the chart
const CHART_COLORS = {
  severity: 'hsl(var(--primary))',
  frequency: 'hsl(var(--accent))',
};


/**
 * Processes raw symptom data to prepare it for charting and summary tables.
 * @param {SymptomData[]} symptoms - An array of raw symptom data.
 * @returns An object containing data formatted for the chart and the summary table.
 */
function processSymptomData(symptoms: SymptomData[] | null) {
  if (!symptoms || symptoms.length === 0) {
    return { chartData: [], summaryData: [] };
  }

  const summaryMap = new Map<string, { severities: number[], frequencies: number[], count: number }>();
  
  // Group data by symptom name
  symptoms.forEach(s => {
    const entry = summaryMap.get(s.symptom) || { severities: [], frequencies: [], count: 0 };
    entry.severities.push(s.severity);
    entry.frequencies.push(s.frequency);
    entry.count += 1;
    summaryMap.set(s.symptom, entry);
  });
  
  const summaryData = Array.from(summaryMap.entries()).map(([symptom, data]) => {
    return {
      symptom,
      count: data.count,
      avgSeverity: (data.severities.reduce((a, b) => a + b, 0) / data.count).toFixed(1),
      avgFrequency: (data.frequencies.reduce((a, b) => a + b, 0) / data.count).toFixed(1),
    };
  });

  // Sort by date and convert map to array
  const chartData = [...symptoms].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(d => ({
      ...d,
      date: format(new Date(d.date), 'MMM d')
  }));

  return { chartData, summaryData };
}

/**
 * Splits a markdown string into sections based on top-level headings (###).
 * @param {string} markdownText - The markdown text to split.
 * @returns {Array<{title: string, content: string}>} An array of section objects.
 */
function splitMarkdownIntoSections(markdownText: string): Array<{ title: string; content: string }> {
    if (!markdownText) return [];
    
    // Split by lines that start with '### '
    const sections = markdownText.split(/(?=^###\s)/m);
    const finalSections: Array<{ title: string, content: string }> = [];

    for (const section of sections) {
        const trimmedSection = section.trim();
        if (!trimmedSection) continue;
        
        const firstLineEnd = trimmedSection.indexOf('\n');
        
        // Handle content that doesn't start with a heading (should be the first chunk)
        if (!trimmedSection.startsWith('###')) {
            finalSections.push({ title: 'AI-Generated Summary', content: trimmedSection });
            continue;
        }

        // If there's no newline, the whole section is the title.
        if (firstLineEnd === -1) {
            finalSections.push({ title: trimmedSection.replace(/^###\s*/, '').trim(), content: '' });
            continue;
        }

        const titleLine = trimmedSection.substring(0, firstLineEnd).replace(/^###\s*/, '').trim();
        const content = trimmedSection.substring(firstLineEnd + 1).trim();

        if (titleLine) {
            finalSections.push({ title: titleLine, content });
        }
    }
    
    if (finalSections.length === 0 && markdownText.trim()) {
        return [{ title: 'AI-Generated Summary', content: markdownText.trim() }];
    }

    return finalSections;
}

/**
 * A component that provides an AI-powered analysis of the user's symptom data.
 * The analysis is generated on-demand by calling a Genkit AI flow.
 */
function AiAnalysis({ symptoms, user, userProfile }: { symptoms: SymptomData[], user: any, userProfile: any }) {
    const [isAnalysisPending, startAnalysisTransition] = useTransition();
    const [analysis, setAnalysis] = useState('');
    const [doctorQuestions, setDoctorQuestions] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<FilePreview[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const analysisSections = useMemo(() => splitMarkdownIntoSections(analysis), [analysis]);

    const toDataURL = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
    });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            let currentFiles = [...uploadedFiles];
            let currentPreviews = [...previews];

            for (const file of newFiles) {
                const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                
                const isImage = allowedImageTypes.includes(file.type);
                const isDocument = allowedDocTypes.includes(file.type);

                if (isImage || isDocument) {
                    const dataUrl = await toDataURL(file);
                    currentFiles.push(file);
                    currentPreviews.push({ name: file.name, type: isImage ? 'image' : 'document', url: dataUrl });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Invalid File Type',
                        description: `File '${file.name}' was ignored. Please upload a valid image (JPG, PNG) or document (PDF, DOCX, TXT) file.`,
                    });
                }
            }
            setUploadedFiles(currentFiles);
            setPreviews(currentPreviews);
        }
        if(fileInputRef.current) fileInputRef.current.value = '';
    };
    
    const removeFile = (indexToRemove: number) => {
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    }


    const handleGenerateAnalysis = () => {
        startAnalysisTransition(async () => {
            setError('');
            setAnalysis('');
            setDoctorQuestions([]);
            
            try {
                const symptomInput = {
                    symptoms: symptoms.map(s => ({
                        symptom: s.symptom,
                        severity: s.severity,
                        frequency: s.frequency,
                        date: format(parseISO(s.date), 'yyyy-MM-dd')
                    }))
                };

                let individualAnalyses: string[] = [];

                if (symptoms.length > 0) {
                     const symptomAnalysisResult = await analyzeSymptoms(symptomInput);
                     individualAnalyses.push(symptomAnalysisResult.analysis);
                }

                if (previews.length > 0) {
                     const fileAnalysisPromises = previews.map(preview => {
                        if (preview.type === 'image') {
                            return analyzeSymptomsWithImaging({ ...symptomInput, imagingDataUri: preview.url });
                        } else {
                            return analyzeSymptomsWithReport({ ...symptomInput, reportDataUri: preview.url });
                        }
                    });
                    const fileAnalysisResults = await Promise.all(fileAnalysisPromises);
                    individualAnalyses.push(...fileAnalysisResults.map(res => res.analysis));
                }

                if (individualAnalyses.length === 0) {
                    setError("Please log symptoms or upload a document to generate an analysis.");
                    return;
                }

                // Consolidate the analyses into a single report
                const consolidationResult = await consolidateAnalyses({ 
                    analyses: individualAnalyses,
                    userName: userProfile?.username || user.displayName || 'the patient'
                });
                const finalReport = consolidationResult.consolidatedReport;
                setAnalysis(finalReport);

                // Now, automatically generate questions
                if (finalReport) {
                    const questionsResult = await generateDoctorQuestions({ analysis: finalReport });
                    setDoctorQuestions(questionsResult.questions);
                }

            } catch (e: any) {
                console.error("AI analysis or question generation failed:", e);
                setError(e.message || "An error occurred while generating the analysis. Please try again.");
            }
        });
    };
    
    return (
        <div className="page-break-inside-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div className="flex-grow">
                    <h3 className="text-xl font-semibold border-b pb-2 mb-2">AI-Generated Summary</h3>
                    <p className="text-sm text-muted-foreground">
                        This summary focuses on key findings from your symptom log and any uploaded documents to help prepare for your next medical appointment.
                    </p>
                </div>
                <div className="flex gap-2 print:hidden flex-shrink-0">
                    <Button onClick={handleGenerateAnalysis} disabled={isAnalysisPending}>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        {isAnalysisPending ? 'Analyzing...' : 'Generate AI Summary'}
                    </Button>
                </div>
            </div>
            
             <div className="print:hidden mt-4">
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.txt"
                    className="hidden"
                    multiple={true}
                />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isAnalysisPending}>
                    <Upload className="mr-2 h-4 w-4" />
                    Add Image or Document
                </Button>

                {previews.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Uploaded Files:</p>
                        {previews.map((preview, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 rounded-md border bg-muted/50">
                                {preview.type === 'image' ? <ImageIcon className="h-6 w-6 flex-shrink-0 text-muted-foreground" /> : <File className="h-6 w-6 flex-shrink-0 text-muted-foreground" />}
                                <div className="flex-grow">
                                    <p className="text-sm font-medium truncate">{preview.name}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
             </div>
             
             <div className="mt-4 grid grid-cols-1 gap-6">
                {isAnalysisPending && (
                    <Card className="glassmorphism">
                        <CardHeader><CardTitle>Analyzing...</CardTitle></CardHeader>
                        <CardContent>
                             <div className="space-y-4 p-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </CardContent>
                    </Card>
                )}
                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Analysis Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {analysisSections.length > 0 && analysisSections.map((section, index) => (
                    <Card key={index} className="glassmorphism page-break-inside-avoid">
                        <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
                        <CardContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{section.content}</ReactMarkdown>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                 {!isAnalysisPending && !analysis && !error && (
                    <div className="text-sm text-muted-foreground text-center py-10 border-2 border-dashed rounded-lg">
                        <p>Click "Generate AI Summary" to get an analysis of your symptom data.</p>
                        <p>You can optionally add images or documents first.</p>
                    </div>
                )}
             </div>

            {previews.filter(p => p.type === 'image').length > 0 && (
                <div className="mt-6 hidden print:block space-y-4 page-break-before page-break-inside-avoid">
                     <h3 className="font-semibold text-xl border-b pb-2 mb-4">Uploaded Imaging</h3>
                     {previews.filter(p => p.type === 'image').map((preview, index) => (
                        <div key={index} className="page-break-inside-avoid">
                            <p className="text-sm font-medium mb-2">{preview.name}</p>
                            <img src={preview.url} alt={`Uploaded image ${preview.name}`} className="max-w-full rounded-md border" style={{ maxHeight: '400px' }} />
                        </div>
                    ))}
                </div>
            )}


            {(isAnalysisPending || doctorQuestions.length > 0) && (
                 <Card className="glassmorphism mt-6 page-break-before page-break-inside-avoid">
                    <CardHeader><CardTitle>Questions for Your Doctor</CardTitle></CardHeader>
                    <CardContent>
                         {isAnalysisPending && doctorQuestions.length === 0 ? (
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ul className="list-disc pl-5 space-y-2">
                                    {doctorQuestions.map((q, i) => <li key={i}>{q}</li>)}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {(analysis || doctorQuestions.length > 0) && (
                <div className="mt-8 pt-4 border-t text-xs text-muted-foreground space-y-2">
                    <p><strong>Disclaimer:</strong> This summary includes mostly the items that were found to be wrong with the patient, based on the provided imaging, imaging reports, and symptom tracker information from the tool. This application and its AI-powered analyses are for informational purposes only and are not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. <strong>This application is not HIPAA compliant.</strong> Please do not store sensitive personal health information.</p>
                </div>
            )}
        </div>
    );
}

/**
 * The main component for the Symptom Report page.
 * It handles user authentication, fetches all symptom data from Firestore,
 * displays it in a structured format, and manages the print functionality.
 */
export default function SymptomReportPage() {
  const { firestore } = useFirebase();
  const { user, userProfile, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  const symptomsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'symptoms'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const {
    data: symptoms,
    isLoading: isLoadingSymptoms,
    error: symptomsError,
  } = useCollection<SymptomData>(symptomsQuery);

  const handlePrint = () => {
    window.print();
  };

  const { chartData, summaryData } = useMemo(
    () => processSymptomData(symptoms),
    [symptoms]
  );
  
  const isLoading = isUserLoading || isLoadingSymptoms;

  if (isLoading || !user || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const capitalize = (s: string) => {
    if (!s) return "";
    return s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  const displayName = capitalize(userProfile?.username || user.displayName || user.email || '');

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <header className="p-4 sm:p-8 flex justify-between items-center print:hidden border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Symptom History Report
        </h1>
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

      <main className="p-4 sm:p-8 flex-1">
        <div className="max-w-4xl mx-auto bg-card p-6 sm:p-10 rounded-lg shadow-md border print:shadow-none print:border-none print:p-0">
          
          <div className="mb-12 flex flex-col items-center">
             <Logo width={1182} height={237} />
             <div className="text-center mt-4">
                <h2 className="text-xl font-bold text-foreground">Symptom History Report</h2>
                <p className="text-muted-foreground">
                    Analysis for: {displayName}
                </p>
             </div>
          </div>

          {isLoading && (
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

          {!isLoading && symptoms && (
            <>
              {(symptoms.length > 0) ? (
                <div className="space-y-12">
                   <AiAnalysis symptoms={symptoms} user={user} userProfile={userProfile} />
                  
                  {symptoms.length > 0 && (
                    <div className="space-y-12">
                      <Card className="glassmorphism page-break-before page-break-inside-avoid">
                        <CardHeader>
                            <CardTitle>Symptom Progression</CardTitle>
                            <CardDescription>Severity and frequency of symptoms over time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                                  <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 10]} />
                                  <Tooltip
                                        contentStyle={{
                                            background: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: 'var(--radius)',
                                        }}
                                    />
                                  <Legend />
                                  <Bar dataKey="severity" fill={CHART_COLORS.severity} name="Severity (1-10)" />
                                  <Bar dataKey="frequency" fill={CHART_COLORS.frequency} name="Frequency (1-10)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="glassmorphism page-break-inside-avoid">
                        <CardHeader>
                            <CardTitle>Symptom Summary</CardTitle>
                             <CardDescription>An overview of all logged symptoms.</CardDescription>
                        </CardHeader>
                         <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Symptom</TableHead>
                                    <TableHead className="text-center">Times Logged</TableHead>
                                    <TableHead className="text-center">Avg. Severity (1-10)</TableHead>
                                    <TableHead className="text-center">Avg. Frequency (1-10)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summaryData.map(symptom => (
                                    <TableRow key={symptom.symptom}>
                                        <TableCell className="font-medium">{symptom.symptom}</TableCell>
                                        <TableCell className="text-center">{symptom.count}</TableCell>
                                        <TableCell className="text-center">{symptom.avgSeverity}</TableCell>
                                        <TableCell className="text-center">{symptom.avgFrequency}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
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
             <p className="mt-2">© 2024 Chiari Connects. All rights reserved.</p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          body {
            background-color: #fff;
            color: #000;
          }
          .print\\:hidden {
            display: none;
          }
          .print\\:block {
            display: block;
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
          .prose {
            color: #000;
          }
          .prose-headings\\:my-4 {
            margin-top: 1rem;
            margin-bottom: 1rem;
          }
          .prose-p\\:my-2 {
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
          }
          .page-break-before {
            break-before: page;
          }
          .page-break-inside-avoid {
            break-inside: avoid;
          }
          .recharts-legend-wrapper {
             display: none; /* Hide legend on print for cleaner look */
          }
          .recharts-wrapper {
             font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
