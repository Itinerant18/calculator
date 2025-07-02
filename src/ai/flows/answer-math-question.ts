'use server';

/**
 * @fileOverview This file defines a Genkit flow for answering complex mathematical and scientific questions.
 *
 * answerMathQuestion - A function that takes a question string as input and returns an answer string with LaTeX formatting.
 * AnswerMathQuestionInput - The input type for the answerMathQuestion function.
 * AnswerMathQuestionOutput - The return type for the answerMathQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerMathQuestionInputSchema = z.object({
  question: z.string().describe('The mathematical or scientific question to be answered.'),
});
export type AnswerMathQuestionInput = z.infer<typeof AnswerMathQuestionInputSchema>;

const AnswerMathQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question, formatted with LaTeX for equations.'),
});
export type AnswerMathQuestionOutput = z.infer<typeof AnswerMathQuestionOutputSchema>;

export async function answerMathQuestion(input: AnswerMathQuestionInput): Promise<AnswerMathQuestionOutput> {
  return answerMathQuestionFlow(input);
}

const answerMathQuestionPrompt = ai.definePrompt({
  name: 'answerMathQuestionPrompt',
  input: {schema: AnswerMathQuestionInputSchema},
  output: {schema: AnswerMathQuestionOutputSchema},
  prompt: `You are an expert in mathematics and science. Answer the following question accurately and display any equations using LaTeX formatting.\n\nQuestion: {{{question}}}`,
});

const answerMathQuestionFlow = ai.defineFlow(
  {
    name: 'answerMathQuestionFlow',
    inputSchema: AnswerMathQuestionInputSchema,
    outputSchema: AnswerMathQuestionOutputSchema,
  },
  async input => {
    const {output} = await answerMathQuestionPrompt(input);
    return output!;
  }
);
