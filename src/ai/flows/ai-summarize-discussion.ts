'use server';
/**
 * @fileOverview This file contains a Genkit flow for summarizing a discussion post.
 *
 * - summarizeDiscussion - A function that takes post content and returns a summary.
 * - SummarizeDiscussionInput - The input type for the function.
 * - SummarizeDiscussionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDiscussionInputSchema = z.object({
  title: z.string().describe("The title of the discussion post."),
  content: z.string().describe('The full text content of the discussion post to be summarized.'),
});
export type SummarizeDiscussionInput = z.infer<typeof SummarizeDiscussionInputSchema>;

const SummarizeDiscussionOutputSchema = z.object({
  summary: z.string().describe('A concise, bullet-pointed summary of the key points, questions, and sentiments in the post.'),
});
export type SummarizeDiscussionOutput = z.infer<typeof SummarizeDiscussionOutputSchema>;


/**
 * An AI flow that generates a summary of a discussion post.
 * @param {SummarizeDiscussionInput} input - The title and content of the post.
 * @returns {Promise<SummarizeDiscussionOutput>} A promise that resolves to the summary.
 */
export async function summarizeDiscussion(
  input: SummarizeDiscussionInput
): Promise<SummarizeDiscussionOutput> {
  return summarizeDiscussionFlow(input);
}


const prompt = ai.definePrompt({
  name: 'summarizeDiscussionPrompt',
  input: {schema: SummarizeDiscussionInputSchema},
  output: {schema: SummarizeDiscussionOutputSchema},
  prompt: `You are a helpful community assistant for a health forum. Your task is to summarize a discussion post to help users quickly understand its main points.

  **CRITICAL INSTRUCTIONS**:
  1.  **Identify Key Information**: Extract the most important information, such as the main question being asked, the primary symptoms or experiences described, and the overall sentiment or goal of the post (e.g., seeking advice, sharing a success story).
  2.  **Use Bullet Points**: Structure the summary using clear, concise bullet points.
  3.  **Remain Neutral**: Do not add your own opinions, advice, or interpretations. Stick to the information provided in the post.

  **Post Title:** {{title}}
  **Post Content:**
  {{{content}}}

  **Task:**
  Generate a bullet-point summary of the post above.
  
  Summary:`,
});

const summarizeDiscussionFlow = ai.defineFlow(
  {
    name: 'summarizeDiscussionFlow',
    inputSchema: SummarizeDiscussionInputSchema,
    outputSchema: SummarizeDiscussionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
