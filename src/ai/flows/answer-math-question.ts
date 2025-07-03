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
  angleMode: z.enum(['deg', 'rad']).optional().describe('The angle mode for trigonometric calculations.'),
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
  prompt: `You are the computational engine for a powerful scientific calculator. Evaluate the following mathematical expression or answer the question. 
  
  Return ONLY the final numerical result or a simplified expression. Do not provide explanations, units, or any extra text unless the user's input is explicitly a question.
  
  The current angle mode for trigonometric functions is '{{{angleMode}}}'.

  Expression: {{{question}}}`,
});

const answerMathQuestionFlow = ai.defineFlow(
  {
    name: 'answerMathQuestionFlow',
    inputSchema: AnswerMathQuestionInputSchema,
    outputSchema: AnswerMathQuestionOutputSchema,
  },
  async input => {
    // For very simple results, the AI might return just a number. Convert it to a string.
    const {output} = await answerMathQuestionPrompt(input);
    const result = output!;
    result.answer = String(result.answer).trim();
    return result;
  }
);
