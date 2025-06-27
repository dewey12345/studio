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
import { Bet, Difficulty } from '@/lib/types';
import { getPayoutsByNumber, getNumberDetails } from '@/lib/game-logic';

const AiDetermineWinnerInputSchema = z.object({
  bets: z.array(z.any()).describe("A list of all bets placed in the round."),
  difficulty: z.enum(['easy', 'moderate', 'hard']).describe("The difficulty level for the round."),
});
export type AiDetermineWinnerInput = z.infer<typeof AiDetermineWinnerInputSchema>;

const AiDetermineWinnerOutputSchema = z.object({
  winningNumber: z.number().min(0).max(9).describe('The winning number (0-9) determined by the AI.'),
});
export type AiDetermineWinnerOutput = z.infer<typeof AiDetermineWinnerOutputSchema>;

export async function aiDetermineWinner(input: AiDetermineWinnerInput): Promise<AiDetermineWinnerOutput> {
  return aiDetermineWinnerFlow(input);
}

// We perform the logic in TypeScript and only ask the AI to pick based on a summary.
// This is more reliable and faster than sending all data to the model.
const aiDetermineWinnerFlow = ai.defineFlow(
  {
    name: 'aiDetermineWinnerFlow',
    inputSchema: AiDetermineWinnerInputSchema,
    outputSchema: AiDetermineWinnerOutputSchema,
  },
  async ({ bets, difficulty }) => {
    
    if (difficulty === 'moderate') {
      const winningNumber = Math.floor(Math.random() * 10);
      return { winningNumber };
    }

    const totalPayouts = getPayoutsByNumber(bets as Bet[]);
    
    let prompt;
    let chosenNumber: number;

    if (difficulty === 'easy') {
      // Find the number with the minimum payout (easiest for the house, user wins least)
      let minPayout = Infinity;
      let numbersWithMinPayout: number[] = [];

      totalPayouts.forEach((payout, number) => {
        if (payout < minPayout) {
          minPayout = payout;
          numbersWithMinPayout = [number];
        } else if (payout === minPayout) {
          numbersWithMinPayout.push(number);
        }
      });
      // If there's a tie, pick one randomly
      chosenNumber = numbersWithMinPayout[Math.floor(Math.random() * numbersWithMinPayout.length)];

    } else { // Hard difficulty
        // Find the number that results in the highest payout, then select a number that avoids it.
        // This is a simple interpretation of "hard" for the user.
        let maxPayout = -1;
        let numbersWithMaxPayout: number[] = [];

        totalPayouts.forEach((payout, number) => {
            if (payout > maxPayout) {
                maxPayout = payout;
                numbersWithMaxPayout = [number];
            } else if (payout === maxPayout) {
                numbersWithMaxPayout.push(number);
            }
        });
        
        const possibleWinners = [0,1,2,3,4,5,6,7,8,9].filter(n => !numbersWithMaxPayout.includes(n));

        if(possibleWinners.length > 0) {
            chosenNumber = possibleWinners[Math.floor(Math.random() * possibleWinners.length)];
        } else {
            // If all numbers result in the same max payout, just pick one randomly.
            chosenNumber = Math.floor(Math.random() * 10);
        }
    }

    return { winningNumber: chosenNumber };
  }
);
