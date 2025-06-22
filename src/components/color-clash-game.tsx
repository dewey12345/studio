
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { aiWinningColorSelection } from '@/ai/flows/ai-winning-color-selection';
import type { Bet, RoundResult, Color, Totals, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { History, Palette, Redo, Shield, User as UserIcon, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';

const ROUND_DURATION = 30;
const POST_ROUND_DELAY = 5;

const COLOR_CONFIG: Record<Color, { odds: number; className: string; textColor: string; borderColor: string; display: string }> = {
  Red: { odds: 2, className: 'bg-red-500 hover:bg-red-600', textColor: 'text-red-500', borderColor: 'border-red-500', display: 'Red' },
  Green: { odds: 2, className: 'bg-green-500 hover:bg-green-600', textColor: 'text-green-500', borderColor: 'border-green-500', display: 'Green' },
  Violet: { odds: 10, className: 'bg-violet-500 hover:bg-violet-600', textColor: 'text-violet-500', borderColor: 'border-violet-500', display: 'Violet' },
};

const ROUND_STATE_KEY = 'color_clash_round_state';
const BET_HISTORY_KEY = 'color_clash_bet_history';

type SyncedBet = Bet & { userId: string };

interface RoundState {
  id: string;
  endTime: number;
  bets: SyncedBet[];
  winningColor: Color | null;
  isAiMode: boolean;
  manualWinner: Color | null;
}

interface ColorClashGameProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

export function ColorClashGame({ user, onUserUpdate }: ColorClashGameProps) {
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [timer, setTimer] = useState(ROUND_DURATION);
  const [balance, setBalance] = useState(user.balance ?? 0);
  const [betAmount, setBetAmount] = useState('10');
  const [betHistory, setBetHistory] = useState<RoundResult[]>([]);
  const [isProcessingEnd, setIsProcessingEnd] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  
  const { toast } = useToast();
  const isAdmin = user.role === 'admin';

  const isRoundInProgress = roundState ? Date.now() < roundState.endTime : false;

  const startNewRound = useCallback(() => {
    if (typeof window === 'undefined') return;

    const lastStateRaw = localStorage.getItem(ROUND_STATE_KEY);
    if(lastStateRaw) {
        const lastState = JSON.parse(lastStateRaw) as RoundState;
        if (Date.now() < lastState.endTime + (POST_ROUND_DELAY * 1000) && lastState.id !== roundState?.id) {
            setRoundState(lastState);
            return;
        }
    }
    
    const newRoundState: RoundState = {
        id: new Date().getTime().toString(),
        endTime: Date.now() + ROUND_DURATION * 1000,
        bets: [],
        winningColor: null,
        isAiMode: true,
        manualWinner: null,
    };
    
    localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(newRoundState));
    setRoundState(newRoundState);
    setIsProcessingEnd(false);
    setShowResultDialog(false);
  }, [roundState?.id]);

  const handleRoundEnd = useCallback(async () => {
    if (isProcessingEnd || typeof window === 'undefined') return;

    const currentState = JSON.parse(localStorage.getItem(ROUND_STATE_KEY)!) as RoundState;
    if (currentState.winningColor) {
      if(currentState.id === roundState?.id) setRoundState(currentState);
      return;
    }
    
    setIsProcessingEnd(true);

    const currentTotals = currentState.bets.reduce(
      (acc: Totals, bet: SyncedBet) => {
        acc[bet.color] = (acc[bet.color] || 0) + bet.amount;
        return acc;
      },
      { Red: 0, Green: 0, Violet: 0 }
    );

    let winningColor: Color;
    if (currentState.manualWinner) {
        winningColor = currentState.manualWinner;
    } else if (currentState.isAiMode) {
      try {
        const result = await aiWinningColorSelection({
          redBetTotal: currentTotals.Red,
          greenBetTotal: currentTotals.Green,
          violetBetTotal: currentTotals.Violet,
        });
        winningColor = result.winningColor;
      } catch (error) {
        console.error("AI failed to select a winner:", error);
        toast({ title: "AI Error", description: "Could not determine winner, selecting randomly.", variant: "destructive" });
        const colors: Color[] = ['Red', 'Green', 'Violet'];
        winningColor = colors[Math.floor(Math.random() * colors.length)];
      }
    } else {
      const colors: Color[] = ['Red', 'Green', 'Violet'];
      winningColor = colors[Math.floor(Math.random() * colors.length)];
    }

    const userBets = currentState.bets.filter(b => b.userId === user.id);
    let totalPayout = 0;
    const winningBets: Bet[] = [];
    userBets.forEach(bet => {
      if (bet.color === winningColor) {
        const payout = bet.amount * COLOR_CONFIG[bet.color].odds;
        totalPayout += payout;
        winningBets.push({ ...bet, payout });
      }
    });

    if (totalPayout > 0) {
      const newBalance = (user.balance ?? 0) + totalPayout;
      setBalance(newBalance);
      try {
          const updatedUser = authService.updateUserByAdmin(user.id, { balance: newBalance });
          onUserUpdate(updatedUser);
      } catch (error) {
          console.error("Failed to sync balance", error);
          toast({ title: "Sync Error", description: "Could not save new balance.", variant: "destructive" });
      }
    }
    
    const finalState = { ...currentState, winningColor };
    const result: RoundResult = { winningColor, bets: userBets, totalPayout, winningBets };
    
    setBetHistory(prev => {
        const newHistory = [result, ...prev];
        localStorage.setItem(BET_HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
    });

    localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(finalState));
    setRoundState(finalState);
    setShowResultDialog(true);
  }, [isProcessingEnd, roundState?.id, user.id, user.balance, toast, onUserUpdate]);


  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === ROUND_STATE_KEY && event.newValue) {
            const newState: RoundState = JSON.parse(event.newValue);
            if (newState.id !== roundState?.id) {
              setRoundState(newState);
            }
        }
    };
    
    const savedStateRaw = localStorage.getItem(ROUND_STATE_KEY);
    if (savedStateRaw) {
        const savedState = JSON.parse(savedStateRaw);
        if(savedState.id !== roundState?.id) setRoundState(savedState);
    } else {
        startNewRound();
    }
    
    const savedHistoryRaw = localStorage.getItem(BET_HISTORY_KEY);
    if (savedHistoryRaw) {
        setBetHistory(JSON.parse(savedHistoryRaw));
    }

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [startNewRound, roundState?.id]);

  useEffect(() => {
    setBalance(user.balance ?? 0);
  }, [user.balance]);

  useEffect(() => {
    if (!roundState) return;

    const updateTimer = () => {
      const now = Date.now();
      if (now < roundState.endTime) {
        // Round in progress
        setTimer(Math.ceil((roundState.endTime - now) / 1000));
      } else {
        // Post-round cooldown
        if (!roundState.winningColor) {
           handleRoundEnd();
        }
        const cooldownEnds = roundState.endTime + (POST_ROUND_DELAY * 1000);
        if (now < cooldownEnds) {
          setTimer(Math.ceil((cooldownEnds - now) / 1000));
        } else {
          startNewRound();
        }
      }
    };
    
    updateTimer();
    const intervalId = setInterval(updateTimer, 500);
    return () => clearInterval(intervalId);

  }, [roundState, handleRoundEnd, startNewRound]);


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

    const newBalance = balance - amount;
    setBalance(newBalance);

    const newBet: SyncedBet = { color, amount, userId: user.id };
    const currentState = JSON.parse(localStorage.getItem(ROUND_STATE_KEY)!) as RoundState;
    const newState = { ...currentState, bets: [...currentState.bets, newBet] };
    localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(newState));
    setRoundState(newState);

    try {
        const updatedUser = authService.updateUserByAdmin(user.id, { balance: newBalance });
        onUserUpdate(updatedUser);
    } catch (error) {
        console.error("Failed to sync balance", error);
    }
  };
  
  const handleAdminControlChange = (change: Partial<Pick<RoundState, 'isAiMode' | 'manualWinner'>>) => {
      if(!isAdmin || !isRoundInProgress) return;
      const currentState = JSON.parse(localStorage.getItem(ROUND_STATE_KEY)!) as RoundState;
      const newState = {...currentState, ...change};
      if(change.manualWinner) {
        newState.isAiMode = false;
        toast({ title: "Winner Selected", description: `${change.manualWinner} will win at the end of the round.`});
      }
      localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(newState));
      setRoundState(newState);
  }

  const totals = useMemo<Totals>(() => {
    if (!roundState) return { Red: 0, Green: 0, Violet: 0 };
    return roundState.bets.reduce(
      (acc: Totals, bet: SyncedBet) => {
        acc[bet.color] = (acc[bet.color] || 0) + bet.amount;
        return acc;
      },
      { Red: 0, Green: 0, Violet: 0 }
    );
  }, [roundState]);

  const currentBets = useMemo(() => {
    return roundState?.bets.filter(b => b.userId === user.id) ?? [];
  }, [roundState, user.id]);

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
  
  const lastResult = betHistory[0];

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
            <div className="text-2xl font-bold font-mono">${(balance ?? 0).toFixed(2)}</div>
          </CardContent>
        </Card>
      </header>
      
      <div className={cn("grid grid-cols-1 gap-6", isAdmin && "lg:grid-cols-3")}>
        <main className={cn("space-y-6", isAdmin && "lg:col-span-2")}>
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
                <Button onClick={() => setBetAmount((balance ?? 0).toFixed(2))} variant="outline" disabled={!isRoundInProgress}>
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
                  <TabsTrigger value="current"><UserIcon className="mr-2 h-4 w-4"/>Your Bets This Round</TabsTrigger>
                  <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/>Your Bet History</TabsTrigger>
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
        
        {isAdmin && (
          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5"/>Admin Panel</CardTitle>
                <CardDescription>Control the game settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-mode">AI Winner Selection</Label>
                  <Switch
                    id="ai-mode"
                    checked={roundState?.isAiMode ?? true}
                    onCheckedChange={(checked) => handleAdminControlChange({ isAiMode: checked })}
                    disabled={!isRoundInProgress || !!roundState?.manualWinner}
                  />
                </div>
                <CardDescription>When enabled, AI picks the color with the least total bet amount as the winner.</CardDescription>
                <div className="space-y-2">
                  <Label>Manual Override</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(COLOR_CONFIG) as Color[]).map(color => (
                      <Button
                        key={color}
                        variant={roundState?.manualWinner === color ? 'default' : 'outline'}
                        onClick={() => handleAdminControlChange({ manualWinner: color })}
                        disabled={!isRoundInProgress || !!roundState?.manualWinner || !roundState?.isAiMode === false}
                      >
                        {color}
                      </Button>
                    ))}
                  </div>
                   {roundState?.manualWinner && <p className="text-sm text-muted-foreground pt-2">Winner set to {roundState.manualWinner}. Result will be shown when timer ends.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Round Totals (All Users)</CardTitle>
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
        )}
      </div>

      <AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Round Over!</AlertDialogTitle>
            {lastResult && (
                 <AlertDialogDescription>
                    The winning color is <span className={cn("font-bold text-lg", COLOR_CONFIG[lastResult.winningColor].textColor)}>{lastResult.winningColor}</span>.
                    {lastResult.totalPayout > 0 ? 
                      ` You won $${lastResult.totalPayout.toFixed(2)}!`
                      : " Better luck next time!"}
                  </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResultDialog(false)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
