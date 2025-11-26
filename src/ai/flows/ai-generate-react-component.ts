'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating React components from a textual description.
 *
 * The flow takes a component description as input and returns the generated React component code.
 * - generateReactComponent: A function that generates a React component based on a description.
 * - GenerateReactComponentInput: The input type for the generateReactComponent function.
 * - GenerateReactComponentOutput: The return type for the generateReactComponent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReactComponentInputSchema = z.object({
  componentDescription: z
    .string()
    .describe(
      'A detailed textual description of the React component to generate, including its functionality and appearance.'
    ),
});
export type GenerateReactComponentInput = z.infer<
  typeof GenerateReactComponentInputSchema
>;

const GenerateReactComponentOutputSchema = z.object({
  componentCode: z
    .string()
    .describe('The generated React component code as a string.'),
});
export type GenerateReactComponentOutput = z.infer<
  typeof GenerateReactComponentOutputSchema
>;

export async function generateReactComponent(
  input: GenerateReactComponentInput
): Promise<GenerateReactComponentOutput> {
  return generateReactComponentFlow(input);
}

const generateReactComponentPrompt = ai.definePrompt({
  name: 'generateReactComponentPrompt',
  input: {schema: GenerateReactComponentInputSchema},
  output: {schema: GenerateReactComponentOutputSchema},
  prompt: `You are a React code generation expert. Generate React code, including basic structure and functionality, based on the user's description.

Component Description: {{{componentDescription}}}

Ensure the generated code is well-structured, readable, and follows React best practices. Adhere to the requested color, typography, and UI style guidelines. Only respond with valid code.
`,
});

const generateReactComponentFlow = ai.defineFlow(
  {
    name: 'generateReactComponentFlow',
    inputSchema: GenerateReactComponentInputSchema,
    outputSchema: GenerateReactComponentOutputSchema,
  },
  async input => {
    const {output} = await generateReactComponentPrompt(input);
    return output!;
  }
);
