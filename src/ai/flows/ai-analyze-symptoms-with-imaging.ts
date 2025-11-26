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
      'A concise, professional analysis combining observations from the medical imaging and the user\'s symptom patterns, formatted in Markdown. The tone must be objective and data-driven.'
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
  2.  **Describe, Do Not Interpret**: When analyzing the image, describe what you see in factual, anatomical terms. For example, "The image shows the cerebellar tonsils extending below the foramen magnum." Do NOT say "This image shows a Chiari malformation."
  3.  **Correlate, Do Not Conclude**: Relate the imaging observations to the symptom data observationally. For example, "The observed tonsillar ectopia may be relevant to the user's reports of headaches and dizziness." Do NOT say "The tonsillar ectopia is causing the headaches."
  4.  **Maintain Neutral, Objective Tone**: The output must be professional and data-driven, suitable for a healthcare provider.
  5.  **Use Markdown Formatting**: Structure the output using Markdown. Use headings (e.g., '### Imaging Observations'), bullet points (e.g., '- Symptom: ...'), and bold text to improve readability.

  **Symptom Data:**
  {{#each symptoms}}
  - Date: {{date}}, Symptom: {{symptom}}, Severity: {{severity}}/10, Frequency: {{frequency}}/10
  {{/each}}

  **Medical Imaging:**
  {{media url=imagingDataUri}}

  **Analysis Task:**
  Based on all provided data, generate a Markdown-formatted summary that includes:
  1.  **Imaging Observations**: Under a '### Imaging Observations' heading, describe notable anatomical features or anomalies in the image using precise, objective language.
  2.  **Symptom Patterns**: Under a '### Symptom Patterns' heading, mention the most frequent/severe symptoms and any apparent trends from the data log.
  3.  **Potential Correlations**: Under a '### Potential Correlations' heading, objectively note any potential links between the imaging observations and the reported symptoms without claiming causality.

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
