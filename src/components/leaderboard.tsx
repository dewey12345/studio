
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LeaderboardEntry, RoundResult } from '@/lib/types';
import { authService } from '@/lib/auth';
import { GLOBAL_ROUND_HISTORY_KEY } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Medal, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

function maskEmail(email: string): string {
    const atIndex = email.lastIndexOf('@');
    if (atIndex < 1) return email; // Not a valid email format, return as-is

    const localPart = email.substring(0, atIndex);
    const domain = email.substring(atIndex);

    if (localPart.length <= 4) {
        return `${localPart.slice(0, 1)}***${localPart.slice(-1)}${domain}`;
    }

    return `${localPart.slice(0, 2)}${'*'.repeat(localPart.length - 4)}${localPart.slice(-2)}${domain}`;
}

interface LeaderboardProps {
  isAdminView?: boolean;
}

export default function Leaderboard({ isAdminView = false }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const calculateLeaderboard = useCallback(() => {
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
      .slice(0, 10); // Top 10 players

    setLeaderboard(sortedLeaderboard);
  }, []);

  useEffect(() => {
    calculateLeaderboard(); // Initial calculation

    const intervalId = setInterval(calculateLeaderboard, 5 * 60 * 1000); // Refresh every 5 minutes

    // Listen for storage changes for more instant updates if other tabs are open
    window.addEventListener('storage', calculateLeaderboard);
    
    return () => {
      clearInterval(intervalId); // Cleanup interval
      window.removeEventListener('storage', calculateLeaderboard);
    };
  }, [calculateLeaderboard]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy />Leaderboard</CardTitle>
        <CardDescription>Top 10 players by total winnings. Updates automatically.</CardDescription>
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
              leaderboard.map((entry, index) => {
                const rank = index + 1;
                const displayName = isAdminView ? entry.userName : maskEmail(entry.userName);
                
                return (
                  <TableRow key={entry.userId} className={cn(
                      rank === 1 && "bg-yellow-500/10",
                      rank === 2 && "bg-slate-400/10",
                      rank === 3 && "bg-orange-600/10",
                  )}>
                    <TableCell>
                        <div className="flex items-center gap-2 font-bold">
                            {rank === 1 && <Medal className="text-yellow-500 h-5 w-5"/>}
                            {rank === 2 && <Medal className="text-slate-400 h-5 w-5"/>}
                            {rank === 3 && <Medal className="text-orange-600 h-5 w-5"/>}
                            <span>{rank}</span>
                        </div>
                    </TableCell>
                    <TableCell>{displayName}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${entry.totalWinnings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{entry.totalWinnings.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )
              })
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

    