
'use server';
/**
 * @fileOverview This file defines a Genkit flow for determining the winning number in a betting game using AI.
 *
 * - aiDetermineWinner - A function that determines the winning number based on bets and difficulty.
 * - AiDetermineWinnerInput - The input type for the aiDetermineWinner function.
 * - AiDetermineWinnerOutput - The return type for the aiDetermineWinner function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generate } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { Bet, Difficulty } from '@/lib/types';
import { getPayoutsByNumber, getNumberDetails } from '@/lib/game-logic';

const AiDetermineWinnerInputSchema = z.object({
  bets: z.array(z.any()).describe("A list of all bets placed in the round."),
  difficulty: z.enum(['easy', 'moderate', 'hard']).describe("The difficulty level for the round."),
  apiKey: z.string().optional().describe("The Google AI API Key provided by the admin."),
});
export type AiDetermineWinnerInput = z.infer<typeof AiDetermineWinnerInputSchema>;

const AiDetermineWinnerOutputSchema = z.object({
  winningNumber: z.number().min(0).max(9).int().describe('The winning number (0-9) determined by the AI.'),
});
export type AiDetermineWinnerOutput = z.infer<typeof AiDetermineWinnerOutputSchema>;

export async function aiDetermineWinner(input: AiDetermineWinnerInput): Promise<AiDetermineWinnerOutput> {
  return aiDetermineWinnerFlow(input);
}

const aiDetermineWinnerFlow = ai.defineFlow(
  {
    name: 'aiDetermineWinnerFlow',
    inputSchema: AiDetermineWinnerInputSchema,
    outputSchema: AiDetermineWinnerOutputSchema,
  },
  async ({ bets, difficulty, apiKey }) => {
    
    const totalPayouts = getPayoutsByNumber(bets as Bet[]);
    
    let payoutsSummary = "Total Payout by Winning Number:\n";
    totalPayouts.forEach((payout, number) => {
        payoutsSummary += ` - If winning number is ${number}, total payout is ₹${payout.toFixed(2)}\n`;
    });

    const prompt = `
        You are the game master for a betting game called Color Clash. Your task is to select a single winning number from 0 to 9.

        Here is a summary of the total payout that will be required for each possible winning number:
        ${payoutsSummary}

        The current game difficulty is: '${difficulty}'. You must choose a number based on this difficulty.

        - If difficulty is 'easy', you MUST choose a number that results in the LOWEST possible total payout for the players. This is the best outcome for the house.
        - If difficulty is 'moderate', you should choose a number RANDOMLY to create a fair and unpredictable game. Do not try to minimize or maximize payouts.
        - If difficulty is 'hard', you MUST choose a number that results in one of the HIGHEST possible total payouts. This gives players a better chance to win big.

        Review the payouts and the difficulty, then make your decision.
    `;
    
    try {
        const { output } = await generate({
            model: googleAI({ apiKey })('gemini-pro'),
            prompt: prompt,
            output: {
                schema: AiDetermineWinnerOutputSchema,
            },
        });
        
        return output!;

    } catch (e: any) {
        console.error("Genkit AI call failed:", e);
        // Fallback to random if AI fails
        const winningNumber = Math.floor(Math.random() * 10);
        return { winningNumber };
    }
  }
);
