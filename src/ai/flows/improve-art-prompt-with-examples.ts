'use server';
/**
 * @fileOverview Flow to improve the AI's stick figure generation using prompt engineering.
 *
 * - improveArtPromptWithExamples - A function that enhances the AI art prompt.
 * - ImproveArtPromptWithExamplesInput - The input type for the improveArtPromptWithExamples function.
 * - ImproveArtPromptWithExamplesOutput - The return type for the improveArtPromptWithExamples function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveArtPromptWithExamplesInputSchema = z.object({
  sentence: z.string().describe('The user-defined sentence for generating stick figure art.'),
});
export type ImproveArtPromptWithExamplesInput = z.infer<typeof ImproveArtPromptWithExamplesInputSchema>;

const ImproveArtPromptWithExamplesOutputSchema = z.object({
  artPrompt: z.string().describe('The improved art prompt for stick figure generation.'),
});
export type ImproveArtPromptWithExamplesOutput = z.infer<typeof ImproveArtPromptWithExamplesOutputSchema>;

export async function improveArtPromptWithExamples(input: ImproveArtPromptWithExamplesInput): Promise<ImproveArtPromptWithExamplesOutput> {
  return improveArtPromptWithExamplesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveArtPromptWithExamplesPrompt',
  input: {schema: ImproveArtPromptWithExamplesInputSchema},
  output: {schema: ImproveArtPromptWithExamplesOutputSchema},
  prompt: `You are an AI prompt engineer, tasked with creating the best possible prompt for generating stick figure art based on a user-provided sentence.

  The goal is to create a prompt that consistently produces clear, appropriate, and fun stick figure illustrations.

  Here are some examples of good prompts and the sentences they are based on:

  Sentence: "A stick figure is celebrating a birthday with a cake."
  Prompt: "Generate a simple stick figure illustration of a stick figure celebrating a birthday, including a cake."

  Sentence: "Two stick figures are playing soccer in a park."
  Prompt: "Create a minimalist stick figure art piece showing two stick figures playing soccer in a park."

  Sentence: "A stick figure is reading a book under a tree."
  Prompt: "Draw a stick figure reading a book under a tree, in a clean and simple style."

  Now, based on the following user-defined sentence, create an improved art prompt:

  Sentence: {{{sentence}}}
  Prompt:`, 
});

const improveArtPromptWithExamplesFlow = ai.defineFlow(
  {
    name: 'improveArtPromptWithExamplesFlow',
    inputSchema: ImproveArtPromptWithExamplesInputSchema,
    outputSchema: ImproveArtPromptWithExamplesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {artPrompt: output!};
  }
);
