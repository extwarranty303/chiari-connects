'use server';
/**
 * @fileOverview This file contains a Genkit flow for analyzing user-reported symptom data.
 *
 * - analyzeSymptoms - A function that takes an array of symptom data and returns an AI-generated analysis.
 * - AnalyzeSymptomsInput - The input type for the analyzeSymptoms function.
 * - AnalyzeSymptomsOutput - The return type for the analyzeSymptoms function.
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

export type AnalyzeSymptomsInput = z.infer<typeof AnalyzeSymptomsInputSchema>;
const AnalyzeSymptomsInputSchema = z.object({
  symptoms: z.array(SymptomEntrySchema).describe('An array of symptom data objects reported by the user.'),
});

export type AnalyzeSymptomsOutput = z.infer<typeof AnalyzeSymptomsOutputSchema>;
const AnalyzeSymptomsOutputSchema = z.object({
  analysis: z.string().describe('A concise, professional analysis of the user\'s symptom patterns, trends, and key observations, formatted in Markdown and suitable for sharing with a healthcare provider. The tone should be objective and data-driven.'),
});

/**
 * An AI flow that analyzes a user's symptom data to identify patterns and generate a summary.
 * @param {AnalyzeSymptomsInput} input - The user's symptom data.
 * @returns {Promise<AnalyzeSymptomsOutput>} A promise that resolves to the AI-generated analysis.
 */
export async function analyzeSymptoms(
  input: AnalyzeSymptomsInput
): Promise<AnalyzeSymptomsOutput> {
  return analyzeSymptomsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSymptomsPrompt',
  input: {schema: AnalyzeSymptomsInputSchema},
  output: {schema: AnalyzeSymptomsOutputSchema},
  prompt: `You are a medical data analyst AI. Your task is to analyze a list of self-reported symptom data and generate a clear, objective summary formatted in Markdown for a patient to share with their doctor.

  **CRITICAL INSTRUCTIONS**:
  1.  **DO NOT PROVIDE ANY DIAGNOSIS, MEDICAL ADVICE, OR TREATMENT RECOMMENDATIONS.** Your analysis must be strictly observational and based ONLY on the data provided.
  2.  **Use Markdown Formatting**: Structure the output using Markdown. Use headings (e.g., '### Key Observations'), bullet points (e.g., '- Symptom: ...'), and bold text to improve readability.

  **Symptom Data to Analyze:**
  {{#each symptoms}}
  - Date: {{date}}, Symptom: {{symptom}}, Severity: {{severity}}/10, Frequency: {{frequency}}/10
  {{/each}}

  **Analysis Task:**
  Based on this data, provide a Markdown-formatted summary that includes:
  1.  **Key Observations**: Under a '### Key Observations' heading, mention the most frequently reported symptoms and the symptoms with the highest average severity. Use bullet points.
  2.  **Potential Trends**: Under a '### Potential Trends' heading, note if any symptoms appear to be increasing or decreasing in severity or frequency over time. Use bullet points.
  3.  **Co-occurrences**: Under a '### Co-occurrences' heading, point out if certain symptoms are often logged on the same or consecutive days. Use bullet points.

  Structure the output as a professional, easy-to-read summary. Start with a neutral introductory sentence. Maintain an objective and data-driven tone throughout.
  
  Analysis:`,
});

const analyzeSymptomsFlow = ai.defineFlow(
  {
    name: 'analyzeSymptomsFlow',
    inputSchema: AnalyzeSymptomsInputSchema,
    outputSchema: AnalyzeSymptomsOutputSchema,
  },
  async input => {
    // Ensure we don't call the AI with empty data.
    if (input.symptoms.length === 0) {
      return { analysis: "No symptom data was provided for analysis." };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
