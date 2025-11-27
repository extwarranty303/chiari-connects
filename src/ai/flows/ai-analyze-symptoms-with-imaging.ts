'use server';
/**
 * @fileOverview This file contains a Genkit flow for analyzing user-reported symptom data along with an uploaded medical image.
 *
 * - analyzeSymptomsWithImaging - A function that takes symptom data and an image data URI, returning an AI-generated analysis.
 * - AnalyzeSymptomsWithImagingInput - The input type for the function.
 * - AnalyzeSymptomsWithImagingOutput - The return type for the function.
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

export type AnalyzeSymptomsWithImagingInput = z.infer<
  typeof AnalyzeSymptomsWithImagingInputSchema
>;
const AnalyzeSymptomsWithImagingInputSchema = z.object({
  symptoms: z
    .array(SymptomEntrySchema)
    .describe('An array of symptom data objects reported by the user.'),
  imagingDataUri: z
    .string()
    .describe(
      "A medical image (e.g., an MRI scan) as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type AnalyzeSymptomsWithImagingOutput = z.infer<
  typeof AnalyzeSymptomsWithImagingOutputSchema
>;
const AnalyzeSymptomsWithImagingOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      "A concise, professional analysis combining clinically relevant observations from the medical imaging and the user's symptom patterns, formatted in Markdown. The tone must be objective and data-driven, focusing on abnormalities or key findings."
    ),
});

/**
 * An AI flow that analyzes symptom data and a medical image to generate a summary.
 * @param {AnalyzeSymptomsWithImagingInput} input - The user's symptom and imaging data.
 * @returns {Promise<AnalyzeSymptomsWithImagingOutput>} A promise that resolves to the AI-generated analysis.
 */
export async function analyzeSymptomsWithImaging(
  input: AnalyzeSymptomsWithImagingInput
): Promise<AnalyzeSymptomsWithImagingOutput> {
  return analyzeSymptomsWithImagingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSymptomsWithImagingPrompt',
  input: {schema: AnalyzeSymptomsWithImagingInputSchema},
  output: {schema: AnalyzeSymptomsWithImagingOutputSchema},
  prompt: `You are a medical data analyst AI. Your task is to analyze self-reported symptom data alongside a provided medical image (like an MRI) and generate a clear, objective summary formatted in Markdown for a patient to share with their doctor.

  **CRITICAL INSTRUCTIONS**:
  1.  **DO NOT PROVIDE A DIAGNOSIS, PROGNOSIS, OR MEDICAL ADVICE.** Your role is strictly observational.
  2.  **Focus on Key Findings and Abnormalities**: Do not describe normal anatomy. Describe only the clinically significant or abnormal findings in the image. For example, "The image shows the cerebellar tonsils extending 7mm below the foramen magnum." Do NOT say "The image shows a brain."
  3.  **Correlate, Do Not Conclude**: Relate the imaging findings to the symptom data observationally. For example, "The observed tonsillar ectopia may be relevant to the user's reports of headaches and dizziness." Do NOT say "The tonsillar ectopia is causing the headaches."
  4.  **Use Bullet Points for Everything**: Each distinct finding, symptom pattern, or correlation must be its own bullet point. Do not combine multiple points into one bullet. Ensure ample vertical spacing between sections.
  
  **Symptom Data:**
  {{#each symptoms}}
  - Date: {{date}}, Symptom: {{symptom}}, Severity: {{severity}}/10, Frequency: {{frequency}}/10
  {{/each}}

  **Medical Imaging:**
  {{media url=imagingDataUri}}

  **Analysis Task:**
  Generate a Markdown-formatted summary focusing on items that appear to be abnormal or are key findings. Include:
  1.  **Imaging Findings**: Under a '### Imaging Findings' heading, use bullet points to list each distinct anomaly observed in the image.
  2.  **Symptom Patterns**: Under a '### Symptom Patterns' heading, use bullet points to highlight the most severe/frequent symptoms and any observable trends. Each observation must be a separate bullet point.
  3.  **Potential Correlations**: Under a '### Potential Correlations' heading, use bullet points to objectively note each potential link between a specific imaging finding and a reported symptom. Do not claim causality.

  Start with a neutral introductory sentence.
  
  Analysis:`,
});

const analyzeSymptomsWithImagingFlow = ai.defineFlow(
  {
    name: 'analyzeSymptomsWithImagingFlow',
    inputSchema: AnalyzeSymptomsWithImagingInputSchema,
    outputSchema: AnalyzeSymptomsWithImagingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
