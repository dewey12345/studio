"use client";

import { ColorClashGame } from '@/components/color-clash-game';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Gamepad2 } from 'lucide-react';

interface UserDashboardProps {
    user: User;
}

export default function UserDashboard({ user }: UserDashboardProps) {
  return (
    <div className="space-y-6">
        <div className="space-y-1">
            <h1 className="text-3xl font-bold">Welcome, {user.email}!</h1>
            <p className="text-muted-foreground">Ready to play? Place your bets and win big in Color Clash.</p>
        </div>
        
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gamepad2/>Color Clash Game</CardTitle>
                <CardDescription>The round is active. Place your bets on Red, Green, or Violet.</CardDescription>
            </CardHeader>
            <CardContent>
                <ColorClashGame />
            </CardContent>
        </Card>
    </div>
  );
}
