'use server';
/**
 * @fileOverview This file contains a Genkit flow for consolidating multiple medical analyses into a single, cohesive report.
 *
 * - consolidateAnalyses - A function that takes multiple analysis strings and synthesizes them.
 * - ConsolidateAnalysesInput - The input type for the function.
 * - ConsolidateAnalysesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ConsolidateAnalysesInputSchema = z.object({
    analyses: z.array(z.string()).describe('An array of individual analysis strings, each from a separate medical document or image.'),
    userName: z.string().describe("The patient's name to personalize the report."),
});
export type ConsolidateAnalysesInput = z.infer<typeof ConsolidateAnalysesInputSchema>;


const ConsolidateAnalysesOutputSchema = z.object({
  consolidatedReport: z
    .string()
    .describe(
      "A single, cohesive Markdown report that synthesizes all provided analyses. It must have a 'Key Correlations' section at the top, followed by other relevant sections like 'Imaging Findings' and 'Symptom Patterns'."
    ),
});
export type ConsolidateAnalysesOutput = z.infer<typeof ConsolidateAnalysesOutputSchema>;


/**
 * An AI flow that synthesizes multiple analysis documents into one report.
 * @param {ConsolidateAnalysesInput} input - The analyses to consolidate and the user's name.
 * @returns {Promise<ConsolidateAnalysesOutput>} A promise that resolves to the consolidated report.
 */
export async function consolidateAnalyses(
  input: ConsolidateAnalysesInput
): Promise<ConsolidateAnalysesOutput> {
  return consolidateAnalysesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'consolidateAnalysesPrompt',
  input: {schema: ConsolidateAnalysesInputSchema},
  output: {schema: ConsolidateAnalysesOutputSchema},
  prompt: `You are a medical data analyst AI. Your task is to synthesize multiple, separate analysis reports about a patient named {{userName}} into a single, clear, and cohesive Markdown document.

  **CRITICAL INSTRUCTIONS**:
  1.  **Synthesize, Do Not Repeat**: Do not just concatenate the reports. Read all of them, understand the findings, and create a unified summary. Combine related points from different reports.
  2.  **Prioritize Correlations**: Create a top-level section called '### Key Correlations'. This section is the most important. It must summarize all potential links between symptoms and findings mentioned across ALL the provided reports.
  3.  **Merge Other Sections**: Combine information for other common sections like 'Imaging Findings' and 'Symptom Patterns'. If multiple reports mention imaging, synthesize them into a single 'Imaging Findings' section.
  4.  **Maintain Neutral, Objective Tone**: The output must be professional, data-driven, and suitable for a healthcare provider. Do not provide a diagnosis or medical advice.
  5.  **Use Markdown for Readability**: Use headings (e.g., '### Key Correlations'), bullet points, and bold text. Ensure ample vertical space between sections.

  **Individual Analysis Reports to Consolidate:**
  {{#each analyses}}
  ---
  {{{this}}}
  ---
  {{/each}}

  **Consolidation Task:**
  Generate a single, unified Markdown report for {{userName}}. It must begin with a "### Key Correlations" section that summarizes the most important connections identified across all reports. Following that, include other synthesized sections as appropriate.
  
  Consolidated Report:`,
});

const consolidateAnalysesFlow = ai.defineFlow(
  {
    name: 'consolidateAnalysesFlow',
    inputSchema: ConsolidateAnalysesInputSchema,
    outputSchema: ConsolidateAnalysesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
