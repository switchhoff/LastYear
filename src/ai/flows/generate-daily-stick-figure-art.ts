'use server';
/**
 * @fileOverview Generates a stick figure art piece based on a user-provided sentence.
 *
 * - generateDailyStickFigureArt - A function that generates stick figure art.
 * - GenerateDailyStickFigureArtInput - The input type for the generateDailyStickFigureArt function.
 * - GenerateDailyStickFigureArtOutput - The return type for the generateDailyStickFigureArt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDailyStickFigureArtInputSchema = z.object({
  sentence: z.string().describe('The sentence to base the stick figure art on.'),
});
export type GenerateDailyStickFigureArtInput = z.infer<
  typeof GenerateDailyStickFigureArtInputSchema
>;

const GenerateDailyStickFigureArtOutputSchema = z.object({
  stickFigureArtDataUri: z
    .string()
    .describe(
      'A data URI containing the stick figure art, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.')
});
export type GenerateDailyStickFigureArtOutput = z.infer<
  typeof GenerateDailyStickFigureArtOutputSchema
>;

export async function generateDailyStickFigureArt(
  input: GenerateDailyStickFigureArtInput
): Promise<GenerateDailyStickFigureArtOutput> {
  return generateDailyStickFigureArtFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailyStickFigureArtPrompt',
  input: {schema: GenerateDailyStickFigureArtInputSchema},
  output: {schema: GenerateDailyStickFigureArtOutputSchema},
  prompt: `Create a stick figure art piece based on the following sentence: {{{sentence}}}. The art should be simple, clean, and easily recognizable as stick figures.`,
});

const generateDailyStickFigureArtFlow = ai.defineFlow(
  {
    name: 'generateDailyStickFigureArtFlow',
    inputSchema: GenerateDailyStickFigureArtInputSchema,
    outputSchema: GenerateDailyStickFigureArtOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: input.sentence + ", stick figure art",
    });

    return {
      stickFigureArtDataUri: media.url,
    };
  }
);
