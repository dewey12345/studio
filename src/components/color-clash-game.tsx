"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { aiWinningColorSelection } from '@/ai/flows/ai-winning-color-selection';
import type { Bet, RoundResult, Color, Totals } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { History, Palette, Redo, Shield, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROUND_DURATION = 30;
const POST_ROUND_DELAY = 5;

const COLOR_CONFIG: Record<Color, { odds: number; className: string; textColor: string; borderColor: string; display: string }> = {
  Red: { odds: 2, className: 'bg-red-500 hover:bg-red-600', textColor: 'text-red-500', borderColor: 'border-red-500', display: 'Red' },
  Green: { odds: 2, className: 'bg-green-500 hover:bg-green-600', textColor: 'text-green-500', borderColor: 'border-green-500', display: 'Green' },
  Violet: { odds: 10, className: 'bg-violet-500 hover:bg-violet-600', textColor: 'text-violet-500', borderColor: 'border-violet-500', display: 'Violet' },
};

export function ColorClashGame() {
  const [timer, setTimer] = useState(ROUND_DURATION);
  const [isRoundInProgress, setIsRoundInProgress] = useState(true);
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState('10');
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [betHistory, setBetHistory] = useState<RoundResult[]>([]);
  const [isAiMode, setIsAiMode] = useState(true);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const { toast } = useToast();

  const totals = useMemo<Totals>(() => {
    return currentBets.reduce(
      (acc, bet) => {
        acc[bet.color] += bet.amount;
        return acc;
      },
      { Red: 0, Green: 0, Violet: 0 }
    );
  }, [currentBets]);

  const handleRoundEnd = useCallback(async (manualWinner?: Color) => {
    setIsRoundInProgress(false);

    let winningColor: Color;

    if (manualWinner) {
      winningColor = manualWinner;
    } else if (isAiMode) {
      try {
        const result = await aiWinningColorSelection({
          redBetTotal: totals.Red,
          greenBetTotal: totals.Green,
          violetBetTotal: totals.Violet,
        });
        winningColor = result.winningColor;
      } catch (error) {
        console.error("AI failed to select a winner:", error);
        toast({ title: "AI Error", description: "Could not determine winner, selecting randomly.", variant: "destructive" });
        const colors: Color[] = ['Red', 'Green', 'Violet'];
        winningColor = colors[Math.floor(Math.random() * colors.length)];
      }
    } else {
      // If not AI mode and no manual winner, something is wrong. We'll wait.
      return;
    }

    let totalPayout = 0;
    const winningBets: Bet[] = [];
    currentBets.forEach(bet => {
      if (bet.color === winningColor) {
        const payout = bet.amount * COLOR_CONFIG[bet.color].odds;
        totalPayout += payout;
        winningBets.push({ ...bet, payout });
      }
    });

    setBalance(prev => prev + totalPayout);
    const result: RoundResult = { winningColor, bets: currentBets, totalPayout, winningBets };
    setBetHistory(prev => [result, ...prev]);
    setRoundResult(result);
  }, [isAiMode, totals, currentBets, toast]);

  useEffect(() => {
    if (!isRoundInProgress) return;

    if (timer === 0) {
      handleRoundEnd();
      return;
    }

    const intervalId = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timer, isRoundInProgress, handleRoundEnd]);

  const startNewRound = () => {
    setTimer(ROUND_DURATION);
    setCurrentBets([]);
    setIsRoundInProgress(true);
    setRoundResult(null);
  };
  
  useEffect(() => {
    if (roundResult) {
      const timeoutId = setTimeout(startNewRound, POST_ROUND_DELAY * 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [roundResult]);


  const handleBet = (color: Color) => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Bet", description: "Please enter a positive number.", variant: "destructive" });
      return;
    }
    if (amount > balance) {
      toast({ title: "Insufficient Funds", description: "You do not have enough balance to place this bet.", variant: "destructive" });
      return;
    }
    if (!isRoundInProgress) {
      toast({ title: "Round Over", description: "Please wait for the next round to start.", variant: "destructive" });
      return;
    }

    setBalance(prev => prev - amount);
    setCurrentBets(prev => [...prev, { color, amount }]);
  };

  const renderHistoryTable = (results: RoundResult[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Round</TableHead>
          <TableHead>Winning Color</TableHead>
          <TableHead>Your Bets</TableHead>
          <TableHead className="text-right">Payout</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.length > 0 ? results.map((result, index) => {
          const userBetsOnRound = result.bets.map(b => `${b.amount} on ${b.color}`).join(', ');
          const userPayoutOnRound = result.winningBets.reduce((acc, bet) => acc + (bet.payout || 0), 0);
          return (
            <TableRow key={index} className={cn("border-l-4", result.winningColor && COLOR_CONFIG[result.winningColor].borderColor)}>
              <TableCell>{betHistory.length - index}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-white text-xs ${COLOR_CONFIG[result.winningColor].className}`}>
                  {result.winningColor}
                </span>
              </TableCell>
              <TableCell>{userBetsOnRound || 'None'}</TableCell>
              <TableCell className="text-right font-mono">{userPayoutOnRound > 0 ? `+${userPayoutOnRound.toFixed(2)}` : '0.00'}</TableCell>
            </TableRow>
          )
        }) : <TableRow><TableCell colSpan={4} className="text-center">No history yet.</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline">Color Clash</h1>
        </div>
        <Card className="min-w-[200px]">
          <CardHeader className="flex flex-row items-center justify-between p-3 space-y-0">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold font-mono">${balance.toFixed(2)}</div>
          </CardContent>
        </Card>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <main className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-muted-foreground">{isRoundInProgress ? 'Round ends in' : 'Next round starts in'}</p>
              <div className="relative w-full h-4 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-linear"
                  style={{ width: `${(timer / (isRoundInProgress ? ROUND_DURATION : POST_ROUND_DELAY)) * 100}%`}}
                />
              </div>
              <p className="text-6xl font-bold font-mono">{timer}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                <Label htmlFor="betAmount" className="sr-only">Bet Amount</Label>
                <Input
                  id="betAmount"
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Bet amount"
                  className="text-center text-lg"
                  disabled={!isRoundInProgress}
                />
                <Button onClick={() => setBetAmount(balance.toFixed(2))} variant="outline" disabled={!isRoundInProgress}>
                  Bet Max
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                {(Object.keys(COLOR_CONFIG) as Color[]).map(color => (
                  <Button
                    key={color}
                    className={`${COLOR_CONFIG[color].className} text-white text-lg font-bold h-24 flex flex-col`}
                    onClick={() => handleBet(color)}
                    disabled={!isRoundInProgress}
                  >
                    <span>{COLOR_CONFIG[color].display}</span>
                    <span className="text-sm font-normal">x{COLOR_CONFIG[color].odds}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <Tabs defaultValue="current">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="current"><User className="mr-2 h-4 w-4"/>Current Bets</TabsTrigger>
                  <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/>All History</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="current">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Color</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentBets.length > 0 ? currentBets.map((bet, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{bet.color}</TableCell>
                          <TableCell className="text-right font-mono">${bet.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={2} className="text-center">No bets placed this round.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="history">
                  {renderHistoryTable(betHistory)}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </main>
        
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5"/>Admin Panel</CardTitle>
              <CardDescription>Control the game settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-mode">AI Mode</Label>
                <Switch
                  id="ai-mode"
                  checked={isAiMode}
                  onCheckedChange={setIsAiMode}
                  disabled={!isRoundInProgress}
                />
              </div>
              <CardDescription>When enabled, AI picks the color with the least total bet amount as the winner.</CardDescription>
              <div className="space-y-2">
                <Label>Manual Override</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(COLOR_CONFIG) as Color[]).map(color => (
                    <Button
                      key={color}
                      variant="outline"
                      onClick={() => handleRoundEnd(color)}
                      disabled={isAiMode || !isRoundInProgress || timer === 0}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Round Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(Object.keys(totals) as Color[]).map(color => (
                  <li key={color} className="flex justify-between items-center">
                    <span>{color}</span>
                    <span className="font-mono font-semibold">${totals[color].toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      <AlertDialog open={!!roundResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Round Over!</AlertDialogTitle>
            <AlertDialogDescription>
              The winning color is <span className={cn("font-bold text-lg", roundResult && COLOR_CONFIG[roundResult.winningColor].textColor)}>{roundResult?.winningColor}</span>.
              {roundResult && roundResult.totalPayout > 0 ? 
                ` You won $${roundResult.totalPayout.toFixed(2)}!`
                : " Better luck next time!"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={startNewRound}>
              <Redo className="mr-2 h-4 w-4"/> Next Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
