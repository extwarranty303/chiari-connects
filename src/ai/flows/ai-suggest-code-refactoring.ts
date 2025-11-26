'use server';
/**
 * @fileOverview This file contains a Genkit flow for suggesting code refactoring and improvements for React code.
 *
 * - suggestCodeRefactoring - A function that takes React code as input and returns refactoring suggestions.
 * - SuggestCodeRefactoringInput - The input type for the suggestCodeRefactoring function.
 * - SuggestCodeRefactoringOutput - The return type for the suggestCodeRefactoring function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCodeRefactoringInputSchema = z.object({
  reactCode: z
    .string()
    .describe('The React code to be refactored and improved.'),
});
export type SuggestCodeRefactoringInput = z.infer<typeof SuggestCodeRefactoringInputSchema>;

const SuggestCodeRefactoringOutputSchema = z.object({
  refactoringSuggestions: z
    .string()
    .describe('AI-powered suggestions for refactoring and improving the React code.'),
});
export type SuggestCodeRefactoringOutput = z.infer<typeof SuggestCodeRefactoringOutputSchema>;

export async function suggestCodeRefactoring(
  input: SuggestCodeRefactoringInput
): Promise<SuggestCodeRefactoringOutput> {
  return suggestCodeRefactoringFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCodeRefactoringPrompt',
  input: {schema: SuggestCodeRefactoringInputSchema},
  output: {schema: SuggestCodeRefactoringOutputSchema},
  prompt: `You are an AI expert in React code refactoring and optimization. Analyze the following React code and provide suggestions for improvements, modernization, and best practices. Explain why these improvements are helpful.

React Code:
\`\`\`
{{{reactCode}}}
\`\`\`

Refactoring Suggestions:`,
});

const suggestCodeRefactoringFlow = ai.defineFlow(
  {
    name: 'suggestCodeRefactoringFlow',
    inputSchema: SuggestCodeRefactoringInputSchema,
    outputSchema: SuggestCodeRefactoringOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
