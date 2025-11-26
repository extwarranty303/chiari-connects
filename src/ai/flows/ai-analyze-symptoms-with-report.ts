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

// Defines the shape of a single symptom entry for the AI prompt
const SymptomEntrySchema = z.object({
  symptom: z.string(),
  severity: z.number(),
  frequency: z.number(),
  date: z.string(),
});

export const AnalyzeSymptomsWithReportInputSchema = z.object({
  symptoms: z
    .array(SymptomEntrySchema)
    .describe('An array of symptom data objects reported by the user.'),
  reportText: z
    .string()
    .describe(
      'The full text content of a medical imaging report (e.g., an MRI report).'
    ),
});
export type AnalyzeSymptomsWithReportInput = z.infer<
  typeof AnalyzeSymptomsWithReportInputSchema
>;

export const AnalyzeSymptomsWithReportOutputSchema = z.object({
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

const prompt = ai.definePrompt({
  name: 'analyzeSymptomsWithReportPrompt',
  input: {schema: AnalyzeSymptomsWithReportInputSchema},
  output: {schema: AnalyzeSymptomsWithReportOutputSchema},
  prompt: `You are a medical data analyst AI. Your task is to analyze self-reported symptom data alongside a provided text from a medical report (like an MRI report) and generate a clear, objective summary for a patient to share with their doctor.

  **CRITICAL INSTRUCTIONS**:
  1.  **DO NOT PROVIDE A DIAGNOSIS, PROGNOSIS, OR MEDICAL ADVICE.** Your role is strictly observational and to summarize findings.
  2.  **Synthesize, Do Not Invent**: When analyzing the report text, extract and summarize the key findings written by the radiologist. Do not add your own interpretation of the findings.
  3.  **Correlate, Do Not Conclude**: Relate the findings from the report to the symptom data observationally. For example, "The report's finding of 'mild cerebellar tonsillar ectopia' may be relevant to the user's reports of headaches and dizziness." Do NOT say "The ectopia is causing the headaches."
  4.  **Maintain Neutral, Objective Tone**: The output must be professional and data-driven, suitable for a healthcare provider.

  **Symptom Data:**
  {{#each symptoms}}
  - Date: {{date}}, Symptom: {{symptom}}, Severity: {{severity}}/10, Frequency: {{frequency}}/10
  {{/each}}

  **Medical Report Text:**
  {{{reportText}}}

  **Analysis Task:**
  Based on all provided data, generate a summary that includes:
  1.  **Report Findings**: Summarize the key observations and conclusions mentioned in the medical report text.
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
    const {output} = await prompt(input);
    return output!;
  }
);
