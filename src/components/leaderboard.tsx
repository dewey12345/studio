
"use client";

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LeaderboardEntry, RoundResult } from '@/lib/types';
import { authService } from '@/lib/auth';
import { GLOBAL_ROUND_HISTORY_KEY } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Trophy } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const calculateLeaderboard = () => {
      const allUsers = authService.getUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u.email]));
      
      const roundHistory: RoundResult[] = JSON.parse(localStorage.getItem(GLOBAL_ROUND_HISTORY_KEY) || '[]');
      const playerGains = new Map<string, number>();

      roundHistory.forEach(result => {
        result.bets.forEach(bet => {
            const currentGains = playerGains.get(bet.userId) || 0;
            if (result.winningNumber !== undefined && bet.payout) {
                 playerGains.set(bet.userId, currentGains + bet.payout - bet.amount);
            } else {
                 playerGains.set(bet.userId, currentGains - bet.amount);
            }
        })
      });

      const sortedLeaderboard: LeaderboardEntry[] = Array.from(playerGains.entries())
        .map(([userId, totalWinnings]) => ({
          userId,
          userName: userMap.get(userId) || 'Unknown User',
          totalWinnings,
        }))
        .sort((a, b) => b.totalWinnings - a.totalWinnings)
        .slice(0, 20); // Top 20 players

      setLeaderboard(sortedLeaderboard);
    };

    calculateLeaderboard();

    // Listen for changes to update leaderboard dynamically
    window.addEventListener('storage', calculateLeaderboard);
    return () => {
      window.removeEventListener('storage', calculateLeaderboard);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy />Leaderboard</CardTitle>
        <CardDescription>Top 20 players by total winnings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Total Winnings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <TableRow key={entry.userId}>
                  <TableCell className="font-bold">{index + 1}</TableCell>
                  <TableCell>{entry.userName}</TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${entry.totalWinnings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${entry.totalWinnings.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No game data available yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
