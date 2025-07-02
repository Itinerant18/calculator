'use server';
/**
 * @fileOverview An AI math assistant that can answer questions about math and science.
 *
 * - chatWithAiMathAssistant - A function that handles the chat with the AI math assistant.
 * - ChatWithAiMathAssistantInput - The input type for the chatWithAiMathAssistant function.
 * - ChatWithAiMathAssistantOutput - The return type for the chatWithAiMathAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatWithAiMathAssistantInputSchema = z.object({
  query: z.string().describe('The user query about math or science.'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The chat history.'),
});
export type ChatWithAiMathAssistantInput = z.infer<typeof ChatWithAiMathAssistantInputSchema>;

const ChatWithAiMathAssistantOutputSchema = z.object({
  response: z.string().describe('The AI assistant response to the user query.'),
});
export type ChatWithAiMathAssistantOutput = z.infer<typeof ChatWithAiMathAssistantOutputSchema>;

export async function chatWithAiMathAssistant(input: ChatWithAiMathAssistantInput): Promise<ChatWithAiMathAssistantOutput> {
  return chatWithAiMathAssistantFlow(input);
}

const chatWithAiMathAssistantPrompt = ai.definePrompt({
  name: 'chatWithAiMathAssistantPrompt',
  input: {schema: ChatWithAiMathAssistantInputSchema},
  output: {schema: ChatWithAiMathAssistantOutputSchema},
  prompt: `You are a helpful AI math assistant. You are able to answer questions about math and science, and output LaTeX.

  This is the chat history, with messages from the 'user' and the 'assistant'.
  {{#each history}}
  {{this.role}}: {{{this.content}}}
  {{/each}}

  User: {{{query}}}
  Assistant:`,
});

const chatWithAiMathAssistantFlow = ai.defineFlow(
  {
    name: 'chatWithAiMathAssistantFlow',
    inputSchema: ChatWithAiMathAssistantInputSchema,
    outputSchema: ChatWithAiMathAssistantOutputSchema,
  },
  async input => {
    const {output} = await chatWithAiMathAssistantPrompt(input);
    return output!;
  }
);
