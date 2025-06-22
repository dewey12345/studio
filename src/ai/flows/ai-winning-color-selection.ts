'use server';
/**
 * @fileOverview This file defines a Genkit flow for determining the winning color in a color trading game using AI.
 *
 * - aiWinningColorSelection - A function that determines the winning color based on the least amount bet.
 * - AiWinningColorSelectionInput - The input type for the aiWinningColorSelection function.
 * - AiWinningColorSelectionOutput - The return type for the aiWinningColorSelection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiWinningColorSelectionInputSchema = z.object({
  redBetTotal: z.number().describe('The total amount bet on Red.'),
  greenBetTotal: z.number().describe('The total amount bet on Green.'),
  violetBetTotal: z.number().describe('The total amount bet on Violet.'),
});
export type AiWinningColorSelectionInput = z.infer<typeof AiWinningColorSelectionInputSchema>;

const AiWinningColorSelectionOutputSchema = z.object({
  winningColor: z
    .enum(['Red', 'Green', 'Violet'])
    .describe('The winning color determined by the AI.'),
});
export type AiWinningColorSelectionOutput = z.infer<typeof AiWinningColorSelectionOutputSchema>;

export async function aiWinningColorSelection(input: AiWinningColorSelectionInput): Promise<AiWinningColorSelectionOutput> {
  return aiWinningColorSelectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiWinningColorSelectionPrompt',
  input: {schema: AiWinningColorSelectionInputSchema},
  output: {schema: AiWinningColorSelectionOutputSchema},
  prompt: `Determine the winning color for a color trading game based on the following betting totals:

Red: {{redBetTotal}}
Green: {{greenBetTotal}}
Violet: {{violetBetTotal}}

The winning color is the color with the least amount bet on it. Return the winning color. In the event of a tie, randomly pick one of the tied colors.

Return the winning color as a JSON object.
`,
});

const aiWinningColorSelectionFlow = ai.defineFlow(
  {
    name: 'aiWinningColorSelectionFlow',
    inputSchema: AiWinningColorSelectionInputSchema,
    outputSchema: AiWinningColorSelectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
