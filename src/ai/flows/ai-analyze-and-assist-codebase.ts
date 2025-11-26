'use server';

/**
 * @fileOverview Provides AI-powered analysis and assistance for a given codebase.
 *
 * - analyzeAndAssistCodebase - Analyzes the given codebase and provides suggestions based on project requirements.
 * - AnalyzeAndAssistCodebaseInput - The input type for the analyzeAndAssistCodebase function.
 * - AnalyzeAndAssistCodebaseOutput - The return type for the analyzeAndAssistCodebase function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeAndAssistCodebaseInputSchema = z.object({
  codebase: z.string().describe('The entire codebase as a single string.'),
  projectRequirements: z
    .string()
    .describe('The requirements or desired functionalities of the project.'),
});
export type AnalyzeAndAssistCodebaseInput = z.infer<
  typeof AnalyzeAndAssistCodebaseInputSchema
>;

const AnalyzeAndAssistCodebaseOutputSchema = z.object({
  analysis: z.string().describe('An analysis of the codebase structure.'),
  suggestions: z.string().describe('Suggestions for improvements or refactoring.'),
  contextualAssistance: z
    .string()
    .describe('Contextual assistance based on the project requirements.'),
});
export type AnalyzeAndAssistCodebaseOutput = z.infer<
  typeof AnalyzeAndAssistCodebaseOutputSchema
>;

export async function analyzeAndAssistCodebase(
  input: AnalyzeAndAssistCodebaseInput
): Promise<AnalyzeAndAssistCodebaseOutput> {
  return analyzeAndAssistCodebaseFlow(input);
}

const analyzeAndAssistCodebasePrompt = ai.definePrompt({
  name: 'analyzeAndAssistCodebasePrompt',
  input: {schema: AnalyzeAndAssistCodebaseInputSchema},
  output: {schema: AnalyzeAndAssistCodebaseOutputSchema},
  prompt: `You are an AI-powered tool that analyzes a given codebase and provides contextual assistance based on project requirements and desired functionalities.

  Analyze the following codebase:
  \`\`\`\n  {{{codebase}}}\`\`\`

  Considering the following project requirements and desired functionalities:
  \`\`\`\n  {{{projectRequirements}}}\`\`\`

  Provide:
  1.  An analysis of the codebase structure.
  2.  Suggestions for improvements or refactoring.
  3.  Contextual assistance based on the project requirements.
  Make sure to give detailed explanations.
  `,
});

const analyzeAndAssistCodebaseFlow = ai.defineFlow(
  {
    name: 'analyzeAndAssistCodebaseFlow',
    inputSchema: AnalyzeAndAssistCodebaseInputSchema,
    outputSchema: AnalyzeAndAssistCodebaseOutputSchema,
  },
  async input => {
    const {output} = await analyzeAndAssistCodebasePrompt(input);
    return output!;
  }
);
