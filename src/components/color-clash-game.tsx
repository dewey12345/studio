
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { aiDetermineWinner } from '@/ai/flows/ai-determine-winner';
import type { Bet, RoundResult, User, GameSettings, BetType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { History, Palette, Wallet, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';
import { getNumberDetails, getPayout, NUMBER_CONFIG } from '@/lib/game-logic';
import { GAME_SETTINGS_KEY, GLOBAL_ROUND_HISTORY_KEY, ROUND_STATE_KEY } from '@/lib/constants';
import Leaderboard from './leaderboard';
import { Input } from './ui/input';

const ROUND_DURATION = 30;
const POST_ROUND_DELAY = 5;

const BET_MULTIPLIERS = [1, 2, 4, 8, 10];

type SyncedBet = Bet & { userId: string };

interface RoundState {
  id: string;
  endTime: number;
  bets: SyncedBet[];
  winningNumber: number | null;
}

interface GameLobbyProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

export function GameLobby({ user, onUserUpdate }: GameLobbyProps) {
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [timer, setTimer] = useState(ROUND_DURATION);
  const [balance, setBalance] = useState(user.balance ?? 0);
  const [betAmount, setBetAmount] = useState(10);
  const [betMultiplier, setBetMultiplier] = useState(1);
  const [betHistory, setBetHistory] = useState<RoundResult[]>([]);
  const [isProcessingEnd, setIsProcessingEnd] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const { toast } = useToast();

  const isRoundInProgress = roundState ? Date.now() < roundState.endTime : false;

  useEffect(() => {
    const globalHistory: RoundResult[] = JSON.parse(localStorage.getItem(GLOBAL_ROUND_HISTORY_KEY) || '[]');
    const userHistory = globalHistory.map(round => {
        const userBets = round.bets.filter(b => b.userId === user.id);
        const userTotalPayout = userBets.reduce((sum, bet) => sum + (bet.payout || 0), 0);
        return {
            ...round,
            bets: userBets,
            totalPayout: userTotalPayout,
        };
    }).filter(round => round.bets.length > 0); 
    setBetHistory(userHistory.slice(0, 50));
  }, [user.id]);

  const startNewRound = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Clear one-time manual winner setting
    const settingsRaw = localStorage.getItem(GAME_SETTINGS_KEY);
    if(settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      if(settings.manualWinner !== undefined) {
        delete settings.manualWinner;
        localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
      }
    }

    const newRoundState: RoundState = {
        id: new Date().getTime().toString(),
        endTime: Date.now() + ROUND_DURATION * 1000,
        bets: [],
        winningNumber: null,
    };
    
    localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(newRoundState));
    setRoundState(newRoundState);
    setIsProcessingEnd(false);
    setShowResultDialog(false);
    setSelectedNumbers([]);
  }, []);

  const handleRoundEnd = useCallback(async () => {
    if (isProcessingEnd || typeof window === 'undefined') return;

    const currentState = JSON.parse(localStorage.getItem(ROUND_STATE_KEY)!) as RoundState;
    if (currentState.winningNumber !== null) {
      if(currentState.id === roundState?.id) setRoundState(currentState);
      return;
    }
    
    setIsProcessingEnd(true);

    const gameSettings: GameSettings = JSON.parse(localStorage.getItem(GAME_SETTINGS_KEY) || '{"difficulty": "easy"}');
    
    let winningNumber: number;

    if (gameSettings.manualWinner !== undefined && gameSettings.manualWinner !== null) {
        winningNumber = gameSettings.manualWinner;
    } else {
      try {
        const result = await aiDetermineWinner({
          bets: currentState.bets,
          difficulty: gameSettings.difficulty,
        });
        winningNumber = result.winningNumber;
      } catch (error) {
        console.error("AI failed to select a winner:", error);
        toast({ title: "AI Error", description: "Could not determine winner, selecting randomly.", variant: "destructive" });
        winningNumber = Math.floor(Math.random() * 10);
      }
    }
    
    const allUsers = authService.getUsers(true);
    let totalPayouts = new Map<string, number>();

    currentState.bets.forEach(bet => {
        const payout = getPayout(bet, winningNumber);
        if(payout > 0) {
            const currentPayout = totalPayouts.get(bet.userId) || 0;
            totalPayouts.set(bet.userId, currentPayout + payout);
        }
    });

    const updatedUsers: User[] = [];
    totalPayouts.forEach((payout, userId) => {
        const userToUpdate = allUsers.find(u => u.id === userId);
        if(userToUpdate) {
            const newBalance = (userToUpdate.balance ?? 0) + payout;
            const updatedUser = {...userToUpdate, balance: newBalance};
            updatedUsers.push(updatedUser);
            if(userToUpdate.id === user.id) {
                setBalance(newBalance);
                onUserUpdate(updatedUser);
            }
        }
    });

    if(updatedUsers.length > 0) {
        authService.updateMultipleUsers(updatedUsers);
    }
    
    // Create a single, definitive result for this round for global history
    const roundBetsWithPayouts = currentState.bets.map(bet => ({
        ...bet,
        payout: getPayout(bet, winningNumber)
    }));
    const globalRoundResult: RoundResult = {
        id: currentState.id,
        winningNumber: winningNumber,
        bets: roundBetsWithPayouts,
        totalPayout: Array.from(totalPayouts.values()).reduce((sum, payout) => sum + payout, 0)
    };

    const globalHistory: RoundResult[] = JSON.parse(localStorage.getItem(GLOBAL_ROUND_HISTORY_KEY) || '[]');
    globalHistory.unshift(globalRoundResult);
    localStorage.setItem(GLOBAL_ROUND_HISTORY_KEY, JSON.stringify(globalHistory.slice(0, 50)));

    // For the current user's local history and dialog box
    const userBets = currentState.bets.filter(b => b.userId === user.id);
    const userTotalPayout = totalPayouts.get(user.id) || 0;
    const userBetsWithPayouts = userBets.map(bet => ({
        ...bet,
        payout: getPayout(bet, winningNumber)
    }));

    const userRoundResult: RoundResult = {
        id: currentState.id,
        winningNumber: winningNumber,
        bets: userBetsWithPayouts,
        totalPayout: userTotalPayout
    };

    setBetHistory(prev => [userRoundResult, ...prev].slice(0, 50));
    
    const finalState = { ...currentState, winningNumber };
    localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(finalState));
    setRoundState(finalState);
    setShowResultDialog(true);
  }, [isProcessingEnd, roundState?.id, user.id, toast, onUserUpdate]);


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
        setTimer(Math.ceil((roundState.endTime - now) / 1000));
      } else {
        if (roundState.winningNumber === null) {
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


  const handleBet = (type: BetType, value: string | number) => {
    if (betAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Bet amount must be greater than zero.", variant: "destructive" });
      return;
    }
    const finalBetAmount = betAmount * betMultiplier;
    if (isNaN(finalBetAmount) || finalBetAmount <= 0) {
      toast({ title: "Invalid Bet", description: "Please enter a positive number.", variant: "destructive" });
      return;
    }
    if (finalBetAmount > balance) {
      toast({ title: "Insufficient Funds", variant: "destructive" });
      return;
    }
    if (!isRoundInProgress) {
      toast({ title: "Round Over", description: "Please wait for the next round.", variant: "destructive" });
      return;
    }

    const newBalance = balance - finalBetAmount;
    setBalance(newBalance);

    const newBet: SyncedBet = { type, value, amount: finalBetAmount, userId: user.id, timestamp: Date.now() };
    const currentState = JSON.parse(localStorage.getItem(ROUND_STATE_KEY)!) as RoundState;
    const newState = { ...currentState, bets: [...currentState.bets, newBet] };
    localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(newState));
    setRoundState(newState);

    try {
        const updatedUser = authService.updateBalance(user.id, -finalBetAmount);
        onUserUpdate(updatedUser);
        toast({ title: "Bet Placed!", description: `You bet $${finalBetAmount.toFixed(2)} on ${value}.`})
    } catch (error) {
        console.error("Failed to sync balance", error);
    }
  };

  const handleNumberSelect = (num: number) => {
    setSelectedNumbers(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
  }

  const placeSelectedNumberBets = () => {
    if (selectedNumbers.length === 0) {
        toast({ title: "No Numbers Selected", description: "Please select one or more numbers to bet on.", variant: "destructive" });
        return;
    }
    
    if (betAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Bet amount must be greater than zero.", variant: "destructive" });
      return;
    }
    const totalBetCost = betAmount * betMultiplier * selectedNumbers.length;
    if (totalBetCost > balance) {
        toast({ title: "Insufficient Funds", variant: "destructive" });
        return;
    }
    
    selectedNumbers.forEach(num => {
        handleBet('Number', num);
    });
    setSelectedNumbers([]); // Clear selection after betting
  }
  
  const lastResult = betHistory[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline">Game Lobby</h1>
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
      
        <Card>
            <CardContent className="p-4 md:p-6 text-center space-y-4">
                <div className='flex justify-between items-center text-sm text-muted-foreground'>
                    <span>Period</span>
                    <span>Time Remaining</span>
                </div>
                <div className='flex justify-between items-center'>
                    <span className="font-mono text-lg">{roundState?.id}</span>
                    <span className="text-4xl font-bold font-mono text-accent">{`00:${timer.toString().padStart(2, '0')}`}</span>
                </div>
                <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${(timer / (isRoundInProgress ? ROUND_DURATION : POST_ROUND_DELAY)) * 100}%`}}
                    />
                </div>
            </CardContent>
        </Card>
      
        <Tabs defaultValue="color" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="color">Color</TabsTrigger>
                <TabsTrigger value="number">Number</TabsTrigger>
                <TabsTrigger value="size">Big/Small</TabsTrigger>
            </TabsList>
            <TabsContent value="color" className="mt-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <Button onClick={() => handleBet('Color', 'Green')} className="h-20 bg-green-500 hover:bg-green-600 text-white text-lg">Green</Button>
                    <Button onClick={() => handleBet('Color', 'Violet')} className="h-20 bg-violet-500 hover:bg-violet-600 text-white text-lg">Violet</Button>
                    <Button onClick={() => handleBet('Color', 'Red')} className="h-20 bg-red-500 hover:bg-red-600 text-white text-lg">Red</Button>
                </div>
            </TabsContent>
            <TabsContent value="number" className="mt-4">
                <div className="grid grid-cols-5 gap-2 sm:gap-4">
                    {Object.keys(NUMBER_CONFIG).map(numStr => {
                        const num = parseInt(numStr);
                        const details = getNumberDetails(num);
                        return (
                            <div key={num}
                                onClick={() => handleNumberSelect(num)}
                                className={cn('number-ball', details.className, selectedNumbers.includes(num) && 'selected' )}
                            >
                                {num}
                            </div>
                        )
                    })}
                </div>
                <Button onClick={placeSelectedNumberBets} className="w-full mt-4">Bet on Selected Numbers</Button>
            </TabsContent>
            <TabsContent value="size" className="mt-4">
                 <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <Button onClick={() => handleBet('BigSmall', 'Big')} className="h-20 bg-orange-500 hover:bg-orange-600 text-white text-lg">Big</Button>
                    <Button onClick={() => handleBet('BigSmall', 'Small')} className="h-20 bg-blue-500 hover:bg-blue-600 text-white text-lg">Small</Button>
                </div>
            </TabsContent>
        </Tabs>
          
        <Card>
            <CardContent className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <span className="font-bold w-12 shrink-0">Bet:</span>
                    <Input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(parseInt(e.target.value, 10) || 0)}
                        placeholder="10"
                        min="1"
                        className="flex-grow"
                    />
                </div>
                 <div className="flex items-center gap-4">
                    <span className="font-bold w-12 shrink-0">Mult:</span>
                    <div className="flex-grow grid grid-cols-5 gap-2">
                        {BET_MULTIPLIERS.map(m => (
                             <Button key={m} size="sm" variant={betMultiplier === m ? 'default' : 'outline'} onClick={() => setBetMultiplier(m)}>x{m}</Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <Tabs defaultValue="history">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/>Game History</TabsTrigger>
                  <TabsTrigger value="leaderboard"><Trophy className="mr-2 h-4 w-4"/>Leaderboard</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="history">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Your Bets</TableHead>
                            <TableHead className="text-right">Net +/-</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {betHistory.length > 0 ? betHistory.map((result) => {
                          const details = getNumberDetails(result.winningNumber);
                          const totalBetAmount = result.bets.reduce((sum, bet) => sum + bet.amount, 0);
                          const netResult = result.totalPayout - totalBetAmount;
                          const betsSummary = result.bets.length > 0 
                            ? result.bets.map(b => `${b.value} ($${b.amount.toFixed(0)})`).join(', ') 
                            : 'No Bet';

                          return (
                            <TableRow key={result.id}>
                                <TableCell className="font-mono text-xs">{result.id}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">{result.winningNumber}</span>
                                        <div className="flex flex-col text-xs">
                                             <span className={cn('font-semibold', details.color === 'Green' ? 'text-green-500' : details.color === 'Red' ? 'text-red-500' : 'text-violet-500')}>{details.color}</span>
                                             <span className={cn('font-semibold', details.size === 'Big' ? 'text-orange-500' : 'text-blue-500')}>{details.size}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate text-xs">{betsSummary}</TableCell>
                                <TableCell className={`text-right font-mono font-semibold ${netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {netResult >= 0 ? `+$${netResult.toFixed(2)}` : `-$${Math.abs(netResult).toFixed(2)}`}
                                </TableCell>
                            </TableRow>
                          )
                        }) : <TableRow><TableCell colSpan={4} className="text-center">No history yet.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="leaderboard">
                  <Leaderboard/>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

      <AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Round Over!</AlertDialogTitle>
            {lastResult && (
                 <div>
                    <p className="text-lg">
                        Winning Number: <span className="font-bold text-2xl text-accent">{lastResult.winningNumber}</span>
                    </p>
                    <div className="mt-4 space-y-2">
                        <h4 className="font-semibold">Your Results:</h4>
                        {lastResult.bets.length > 0 ? (
                            lastResult.bets.map((bet, index) => {
                                const payout = getPayout(bet, lastResult.winningNumber);
                                const win = payout > 0;
                                return (
                                    <div key={index} className="flex justify-between items-center text-sm p-2 bg-secondary rounded-md">
                                        <span>Bet on {bet.type} ({bet.value}) for ${bet.amount.toFixed(2)}</span>
                                        <span className={win ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                            {win ? `+ $${payout.toFixed(2)}` : `- $${bet.amount.toFixed(2)}`}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-muted-foreground">You didn't place any bets this round.</p>
                        )}
                    </div>
                    {lastResult.bets.length > 0 && (
                        <>
                         <hr className="my-4 border-border"/>
                         <p className="text-right font-bold text-lg">
                             Total Net: 
                             <span className={lastResult.totalPayout - lastResult.bets.reduce((s, b) => s + b.amount, 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                                 {` $${(lastResult.totalPayout - lastResult.bets.reduce((s, b) => s + b.amount, 0)).toFixed(2)}`}
                             </span>
                         </p>
                        </>
                    )}
                </div>
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
