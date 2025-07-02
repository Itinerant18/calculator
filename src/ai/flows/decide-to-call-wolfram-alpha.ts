// src/ai/flows/decide-to-call-wolfram-alpha.ts
'use server';

/**
 * @fileOverview A Genkit flow that determines whether to call Wolfram Alpha for a given math question.
 *
 * - shouldCallWolframAlpha - A function that determines whether to call Wolfram Alpha.
 * - ShouldCallWolframAlphaInput - The input type for the shouldCallWolframAlpha function.
 * - ShouldCallWolframAlphaOutput - The return type for the shouldCallWolframAlpha function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ShouldCallWolframAlphaInputSchema = z.object({
  question: z.string().describe('The math question to be answered.'),
});
export type ShouldCallWolframAlphaInput = z.infer<typeof ShouldCallWolframAlphaInputSchema>;

const ShouldCallWolframAlphaOutputSchema = z.object({
  shouldCall: z.boolean().describe('Whether or not Wolfram Alpha should be called.'),
  reason: z.string().describe('The reason for the decision.'),
});
export type ShouldCallWolframAlphaOutput = z.infer<typeof ShouldCallWolframAlphaOutputSchema>;

export async function shouldCallWolframAlpha(input: ShouldCallWolframAlphaInput): Promise<ShouldCallWolframAlphaOutput> {
  return shouldCallWolframAlphaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'shouldCallWolframAlphaPrompt',
  input: {schema: ShouldCallWolframAlphaInputSchema},
  output: {schema: ShouldCallWolframAlphaOutputSchema},
  prompt: `You are a math expert. Your job is to decide whether a given math question requires calling Wolfram Alpha for an accurate answer.\n\nQuestion: {{{question}}}\n\nConsider whether the question involves complex calculations, specialized knowledge, or access to real-time data that Wolfram Alpha can provide. If so, you should recommend calling Wolfram Alpha.\n\nRespond with a JSON object that contains a boolean field \"shouldCall\" indicating whether Wolfram Alpha should be called, and a string field \"reason\" explaining your decision.`,
});

const shouldCallWolframAlphaFlow = ai.defineFlow(
  {
    name: 'shouldCallWolframAlphaFlow',
    inputSchema: ShouldCallWolframAlphaInputSchema,
    outputSchema: ShouldCallWolframAlphaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
