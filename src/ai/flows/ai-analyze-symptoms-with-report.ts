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
export type AnalyzeSymptomsWithReportInput = z.infer<
  typeof AnalyzeSymptomsWithReportInputSchema
>;

const AnalyzeSymptomsWithReportOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      'A concise, professional analysis combining findings from the medical report and the user\'s symptom patterns. The tone must be objective and data-driven.'
    ),
});
export type AnalyzeSymptomsWithReportOutput = z.infer<
  typeof AnalyzeSymptomsWithReportOutputSchema
>;

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
  prompt: `You are a medical data analyst AI. Your task is to analyze self-reported symptom data alongside a provided medical report and generate a clear, objective summary for a patient to share with their doctor.

  **CRITICAL INSTRUCTIONS**:
  1.  **DO NOT PROVIDE A DIAGNOSIS, PROGNOSIS, OR MEDICAL ADVICE.** Your role is strictly observational and to summarize findings.
  2.  **Synthesize, Do Not Invent**: When analyzing the report, extract and summarize the key findings written by the radiologist. If the text is from a PDF, extract the relevant clinical information. Do not add your own interpretation of the findings.
  3.  **Correlate, Do Not Conclude**: Relate the findings from the report to the symptom data observationally. For example, "The report's finding of 'mild cerebellar tonsillar ectopia' may be relevant to the user's reports of headaches and dizziness." Do NOT say "The ectopia is causing the headaches."
  4.  **Maintain Neutral, Objective Tone**: The output must be professional and data-driven, suitable for a healthcare provider.

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
  Based on all provided data, generate a summary that includes:
  1.  **Report Findings**: Summarize the key observations and conclusions mentioned in the medical report.
  2.  **Symptom Patterns**: Mention the most frequent/severe symptoms and any apparent trends from the data log.
  3.  **Potential Correlations**: Objectively note any potential links between the report's findings and the reported symptoms without claiming causality.

  Structure the output as a professional, easy-to-read summary. Start with a neutral introductory sentence and use bullet points for clarity.
  
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
