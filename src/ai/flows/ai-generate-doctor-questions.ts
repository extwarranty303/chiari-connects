'use server';
/**
 * @fileOverview This file contains a Genkit flow for generating questions for a doctor based on a symptom analysis.
 *
 * - generateDoctorQuestions - A function that takes a symptom analysis and returns a list of questions.
 * - GenerateDoctorQuestionsInput - The input type for the function.
 * - GenerateDoctorQuestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateDoctorQuestionsInputSchema = z.object({
  analysis: z.string().describe("The AI-generated analysis of the user's symptoms and/or medical reports."),
});
export type GenerateDoctorQuestionsInput = z.infer<typeof GenerateDoctorQuestionsInputSchema>;

export const GenerateDoctorQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('A list of questions for the user to ask their doctor.'),
});
export type GenerateDoctorQuestionsOutput = z.infer<typeof GenerateDoctorQuestionsOutputSchema>;


/**
 * An AI flow that generates questions for a doctor based on a symptom analysis.
 * @param {GenerateDoctorQuestionsInput} input - The AI-generated symptom analysis.
 * @returns {Promise<GenerateDoctorQuestionsOutput>} A promise that resolves to a list of questions.
 */
export async function generateDoctorQuestions(
  input: GenerateDoctorQuestionsInput
): Promise<GenerateDoctorQuestionsOutput> {
  return generateDoctorQuestionsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateDoctorQuestionsPrompt',
  input: {schema: GenerateDoctorQuestionsInputSchema},
  output: {schema: GenerateDoctorQuestionsOutputSchema},
  prompt: `Based on the following medical symptom analysis, generate a list of 5-7 concise and relevant questions a patient could ask their doctor to better understand the findings and discuss next steps. The questions should be phrased neutrally and empower the patient to have a productive conversation.

  **CRITICAL INSTRUCTIONS**:
  1.  **DO NOT PROVIDE MEDICAL ADVICE OR INTERPRETATIONS.** The goal is to formulate questions, not answers.
  2.  **Focus on "What," "How," and "Next Steps":** Frame questions that encourage explanation (e.g., "What could be the reason for...?", "How does this finding relate to my symptoms?", "What are the next diagnostic or treatment steps we should consider?").
  3.  **Keep it Simple:** Avoid overly technical jargon. The questions should be easy for a patient to ask.

  **Symptom Analysis Provided:**
  {{{analysis}}}

  **Task:**
  Generate a list of 5-7 questions based on the analysis above.
  
  Questions:`,
});

const generateDoctorQuestionsFlow = ai.defineFlow(
  {
    name: 'generateDoctorQuestionsFlow',
    inputSchema: GenerateDoctorQuestionsInputSchema,
    outputSchema: GenerateDoctorQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
