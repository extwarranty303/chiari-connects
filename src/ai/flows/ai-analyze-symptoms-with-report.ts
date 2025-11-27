'use server';
/**
 * @fileOverview This file contains a Genkit flow for analyzing user-reported symptom data along with a text-based medical report.
 *
 * - analyzeSymptomsWithReport - A function that takes symptom data and report text, returning an AI-generated analysis.
 * - AnalyzeSymptomsWithReportInput - The input type for the function.
 * - AnalyzeSymptomsWithReportOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import mammoth from 'mammoth';

// Defines the shape of a single symptom entry for the AI prompt
const SymptomEntrySchema = z.object({
  symptom: z.string(),
  severity: z.number(),
  frequency: z.number(),
  date: z.string(),
});

export type AnalyzeSymptomsWithReportInput = z.infer<
  typeof AnalyzeSymptomsWithReportInputSchema
>;
const AnalyzeSymptomsWithReportInputSchema = z.object({
  symptoms: z
    .array(SymptomEntrySchema)
    .describe('An array of symptom data objects reported by the user.'),
  reportDataUri: z
    .string()
    .describe(
      "The content of a medical imaging report (e.g., an MRI report) as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type AnalyzeSymptomsWithReportOutput = z.infer<
  typeof AnalyzeSymptomsWithReportOutputSchema
>;
const AnalyzeSymptomsWithReportOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      "A concise, professional analysis combining clinically relevant findings from the medical report and the user's symptom patterns, formatted in Markdown. The tone must be objective and data-driven, focusing on abnormalities or key findings."
    ),
});

/**
 * An AI flow that analyzes symptom data and a medical report to generate a summary.
 * @param {AnalyzeSymptomsWithReportInput} input - The user's symptom and report data.
 * @returns {Promise<AnalyzeSymptomsWithReportOutput>} A promise that resolves to the AI-generated analysis.
 */
export async function analyzeSymptomsWithReport(
  input: AnalyzeSymptomsWithReportInput
): Promise<AnalyzeSymptomsWithReportOutput> {
  return analyzeSymptomsWithReportFlow(input);
}

// Helper to extract text from various file types encoded in a data URI
async function extractTextFromDataUri(dataUri: string): Promise<string> {
    const match = dataUri.match(/^data:(.+?);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid data URI format.");
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (mimeType.includes('pdf')) {
        // Gemini can often extract text from PDFs directly
        return `A PDF document was provided. The AI will attempt to extract its content.`;
    } else if (mimeType.includes('officedocument.wordprocessingml.document')) {
        // DOCX file
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
    } else if (mimeType.includes('msword')) {
         // DOC file
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
    } else if (mimeType.startsWith('text/')) {
        // Plain text file
        return buffer.toString('utf-8');
    } else {
       throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
    }
}


const prompt = ai.definePrompt({
  name: 'analyzeSymptomsWithReportPrompt',
  input: {
    schema: z.object({
      symptoms: z.array(SymptomEntrySchema),
      reportText: z.string(), // Text extracted from the document
      reportMedia: z.string().optional(), // Original data URI for media-capable models
    })
  },
  output: {schema: AnalyzeSymptomsWithReportOutputSchema},
  prompt: `You are a medical data analyst AI. Your task is to analyze self-reported symptom data alongside a provided medical report and generate a clear, objective summary formatted in Markdown for a patient to share with their doctor.

  **CRITICAL INSTRUCTIONS**:
  1.  **DO NOT PROVIDE A DIAGNOSIS, PROGNOSIS, OR MEDICAL ADVICE.** Your role is strictly observational and to summarize findings.
  2.  **Synthesize and Summarize Key Findings**: Do not simply copy the report. Extract and summarize only the most important findings, particularly abnormalities, from the radiologist's report.
  3.  **Correlate, Do Not Conclude**: Relate the key findings from the report to the symptom data observationally. For example, "The report's finding of 'mild cerebellar tonsillar ectopia' may be relevant to the user's reports of headaches and dizziness." Do NOT say "The ectopia is causing the headaches."
  4.  **Maintain Neutral, Objective Tone**: The output must be professional and data-driven.
  5.  **Use Markdown for Readability**: Structure the output with ample spacing. Use headings (e.g., '### Key Report Findings'), bullet points, and bold text.

  **Symptom Data:**
  {{#each symptoms}}
  - Date: {{date}}, Symptom: {{symptom}}, Severity: {{severity}}/10, Frequency: {{frequency}}/10
  {{/each}}

  **Medical Report Content:**
  {{#if reportMedia}}
    {{media url=reportMedia}}
  {{else}}
    {{{reportText}}}
  {{/if}}

  **Analysis Task:**
  Generate a Markdown-formatted summary focusing on items that appear to be abnormal or are key findings. Include:
  1.  **Key Report Findings**: Under a '### Key Report Findings' heading, summarize only the most significant observations and conclusions from the medical report.
  2.  **Symptom Patterns**: Under a '### Symptom Patterns' heading, highlight the most severe/frequent symptoms.
  3.  **Potential Correlations**: Under a '### Potential Correlations' heading, objectively note potential links between the report's findings and the reported symptoms without claiming causality.

  Start with a neutral introductory sentence. Ensure there is clear separation between sections.
  
  Analysis:`,
});

const analyzeSymptomsWithReportFlow = ai.defineFlow(
  {
    name: 'analyzeSymptomsWithReportFlow',
    inputSchema: AnalyzeSymptomsWithReportInputSchema,
    outputSchema: AnalyzeSymptomsWithReportOutputSchema,
  },
  async input => {
    
    const mimeType = input.reportDataUri.match(/^data:(.+?);base64,(.*)$/)?.[1];
    
    // For PDFs, pass the data URI directly to the model.
    if (mimeType?.includes('pdf')) {
      const { output } = await prompt({
        symptoms: input.symptoms,
        reportText: '',
        reportMedia: input.reportDataUri,
      });
      return output!;
    }

    // For other document types, extract text first.
    const reportText = await extractTextFromDataUri(input.reportDataUri);
    const { output } = await prompt({
        symptoms: input.symptoms,
        reportText: reportText,
    });
    return output!;
  }
);
