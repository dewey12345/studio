
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { aiDetermineWinner } from '@/ai/flows/ai-determine-winner';
import type { Bet, RoundResult, User, GameSettings, BetType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { History, Palette, Wallet, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';
import { apiKeyService } from '@/lib/apiKeyService';
import { gameService } from '@/lib/gameService';
import { getNumberDetails, getPayout, NUMBER_CONFIG } from '@/lib/game-logic';
import { ROUND_STATE_KEY } from '@/lib/constants';
import Leaderboard from './leaderboard';
import { Input } from './ui/input';
import { Logo } from './logo';
import Confetti from 'react-confetti';

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
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const { toast } = useToast();

  const isRoundInProgress = roundState ? Date.now() < roundState.endTime : false;

  const currentUserBets = useMemo(() => {
    if (!roundState) return [];
    return roundState.bets.filter(b => b.userId === user.id);
  }, [roundState, user.id]);
  
  const hasBetOnColor = useMemo(() => currentUserBets.some(b => b.type === 'Color'), [currentUserBets]);
  const hasBetOnNumber = useMemo(() => currentUserBets.some(b => b.type === 'Number'), [currentUserBets]);
  const hasBetOnBigSmall = useMemo(() => currentUserBets.some(b => b.type === 'BigSmall'), [currentUserBets]);

  const loadHistory = useCallback(async () => {
    const globalHistory = await gameService.getGlobalRoundHistory(50);
    const userHistory = globalHistory.map(round => {
        const userBets = (round.bets || []).filter(b => b.userId === user.id);
        const userTotalPayout = userBets.reduce((sum, bet) => sum + (bet.payout || 0), 0);
        return {
            ...round,
            bets: userBets,
            totalPayout: userTotalPayout,
        };
    }).filter(round => round.bets.length > 0); 
    setBetHistory(userHistory);
  }, [user.id]);

  useEffect(() => {
    loadHistory();
  }, [user.id, roundState, loadHistory]);
  
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startNewRound = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Clear one-time manual winner setting
    const settings = await gameService.getGameSettings();
    if(settings.manualWinner !== undefined || settings.manualWinnerColor !== undefined || settings.manualWinnerSize !== undefined) {
        delete settings.manualWinner;
        delete settings.manualWinnerColor;
        delete settings.manualWinnerSize;
        await gameService.setGameSettings(settings);
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
    setSelectedNumber(null);
  }, []);

  const handleRoundEnd = useCallback(async () => {
    if (isProcessingEnd || typeof window === 'undefined') return;

    const currentState = JSON.parse(localStorage.getItem(ROUND_STATE_KEY)!) as RoundState;
    if (currentState.winningNumber !== null) {
      if(currentState.id === roundState?.id) setRoundState(currentState);
      return;
    }
    
    setIsProcessingEnd(true);

    const gameSettings = await gameService.getGameSettings();
    
    let winningNumber: number;

    if (gameSettings.manualWinner !== undefined && gameSettings.manualWinner !== null) {
        winningNumber = gameSettings.manualWinner;
    } else if (gameSettings.manualWinnerColor) {
        const possibleNumbers = Object.entries(NUMBER_CONFIG)
            .filter(([_, details]) => details.color === gameSettings.manualWinnerColor)
            .map(([numStr]) => parseInt(numStr));
        winningNumber = possibleNumbers[Math.floor(Math.random() * possibleNumbers.length)];
    } else if (gameSettings.manualWinnerSize) {
        const possibleNumbers = Object.entries(NUMBER_CONFIG)
            .filter(([_, details]) => details.size === gameSettings.manualWinnerSize)
            .map(([numStr]) => parseInt(numStr));
        winningNumber = possibleNumbers[Math.floor(Math.random() * possibleNumbers.length)];
    } else {
      const apiKey = await apiKeyService.getApiKey();
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        if (user.role === 'admin') {
          toast({
            title: 'AI Not Configured',
            description: 'API Key is missing. Selecting winner randomly. Please set it in the admin dashboard.',
            variant: 'destructive',
            duration: 5000,
          });
        }
        winningNumber = Math.floor(Math.random() * 10);
      } else {
        try {
          const result = await aiDetermineWinner({
            bets: currentState.bets,
            difficulty: gameSettings.difficulty,
            apiKey: apiKey,
          });
          winningNumber = result.winningNumber;
        } catch (error: any) {
          console.error("AI failed to select a winner:", error);
          if (user.role === 'admin') {
              toast({ title: "AI Error", description: `Could not determine winner. Selecting randomly.`, variant: "destructive", duration: 5000 });
          }
          winningNumber = Math.floor(Math.random() * 10);
        }
      }
    }
    
    const allUsers = await authService.getUsers(true) as User[];
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
        await authService.updateMultipleUsers(updatedUsers);
    }
    
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

    await gameService.addRoundToHistory(globalRoundResult);

    const userBets = currentState.bets.filter(b => b.userId === user.id);
    
    if (userBets.length > 0) {
      setShowResultDialog(true);
    }
    
    const finalState = { ...currentState, winningNumber };
    localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(finalState));
    setRoundState(finalState);
  }, [isProcessingEnd, roundState?.id, user.id, user.role, toast, onUserUpdate]);


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


  const handleBet = async (type: BetType, value: string | number) => {
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

    const newBet: SyncedBet = { 
        type, 
        value, 
        amount: finalBetAmount, 
        userId: user.id, 
        timestamp: Date.now(),
        userAgent: navigator.userAgent
    };
    const currentState = JSON.parse(localStorage.getItem(ROUND_STATE_KEY)!) as RoundState;
    const newState = { ...currentState, bets: [...currentState.bets, newBet] };
    localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(newState));
    setRoundState(newState);

    try {
        const updatedUser = await authService.updateBalance(user.id, -finalBetAmount);
        onUserUpdate(updatedUser);
        toast({ title: "Bet Placed!", description: `You bet ₹${finalBetAmount.toFixed(2)} on ${value}.`})
    } catch (error) {
        console.error("Failed to sync balance", error);
    }
  };

  const handleNumberSelect = (num: number) => {
    if (hasBetOnNumber) return;
    setSelectedNumber(prev => prev === num ? null : num);
  }

  const placeSelectedNumberBet = () => {
    if (hasBetOnNumber) {
        toast({ title: "Already Bet", description: "You have already placed a Number bet this round.", variant: "destructive" });
        return;
    }
    if (selectedNumber === null) {
        toast({ title: "No Number Selected", description: "Please select a number to bet on.", variant: "destructive" });
        return;
    }
    
    handleBet('Number', selectedNumber);
    setSelectedNumber(null); // Clear selection after betting
  }
  
  const lastResult = betHistory[0];
  
  const netResult = useMemo(() => {
      if (!lastResult || !lastResult.bets) return { profit: 0, loss: 0 };
      return (lastResult.bets || []).reduce(
        (acc, bet) => {
            const isWin = (bet.payout || 0) > 0;
            if (isWin) {
                acc.profit += (bet.payout! - bet.amount);
            } else {
                acc.loss += bet.amount;
            }
            return acc;
        }, { profit: 0, loss: 0 }
      );
  }, [lastResult]);

  const isOverallWin = lastResult && (netResult.profit > netResult.loss);

  const hasBetOnColorType = (color: string) => currentUserBets.some(b => b.type === 'Color' && b.value === color);
  const hasBetOnNumberType = (num: number) => currentUserBets.some(b => b.type === 'Number' && b.value === num);
  const hasBetOnBigSmallType = (size: string) => currentUserBets.some(b => b.type === 'BigSmall' && b.value === size);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-auto" />
        </div>
        <Card className="min-w-[200px]">
          <CardHeader className="flex flex-row items-center justify-between p-3 space-y-0">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold font-mono">₹{(balance ?? 0).toFixed(2)}</div>
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

        <div className="space-y-4">
            <div className={cn("grid grid-cols-3 gap-2 sm:gap-4", hasBetOnColor && "opacity-50 pointer-events-none")}>
                <Button onClick={() => handleBet('Color', 'Green')} disabled={hasBetOnColor} className={cn("h-20 bg-green-500 hover:bg-green-600 text-white text-lg", hasBetOnColorType('Green') && 'has-bet')}>Green</Button>
                <Button onClick={() => handleBet('Color', 'Violet')} disabled={hasBetOnColor} className={cn("h-20 bg-violet-500 hover:bg-violet-600 text-white text-lg", hasBetOnColorType('Violet') && 'has-bet')}>Violet</Button>
                <Button onClick={() => handleBet('Color', 'Red')} disabled={hasBetOnColor} className={cn("h-20 bg-red-500 hover:bg-red-600 text-white text-lg", hasBetOnColorType('Red') && 'has-bet')}>Red</Button>
            </div>

            <div className={cn("grid grid-cols-5 gap-2 sm:gap-4", hasBetOnNumber && "opacity-50 pointer-events-none")}>
                {Object.keys(NUMBER_CONFIG).map(numStr => {
                    const num = parseInt(numStr);
                    const details = getNumberDetails(num);
                    return (
                        <div key={num}
                            onClick={() => handleNumberSelect(num)}
                            className={cn('number-ball', details.className, selectedNumber === num && 'selected', hasBetOnNumberType(num) && 'has-bet' )}
                        >
                            {num}
                        </div>
                    )
                })}
            </div>
            <Button onClick={placeSelectedNumberBet} disabled={hasBetOnNumber || selectedNumber === null} className="w-full">Bet on Selected Number</Button>
            
            <div className={cn("grid grid-cols-2 gap-2 sm:gap-4", hasBetOnBigSmall && "opacity-50 pointer-events-none")}>
                <Button onClick={() => handleBet('BigSmall', 'Big')} disabled={hasBetOnBigSmall} className={cn("h-20 bg-orange-500 hover:bg-orange-600 text-white text-lg", hasBetOnBigSmallType('Big') && 'has-bet')}>Big</Button>
                <Button onClick={() => handleBet('BigSmall', 'Small')} disabled={hasBetOnBigSmall} className={cn("h-20 bg-blue-500 hover:bg-blue-600 text-white text-lg", hasBetOnBigSmallType('Small') && 'has-bet')}>Small</Button>
            </div>
        </div>
          
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
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" /> Game History
                </CardTitle>
                <CardDescription>A record of your recent games.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Your Bets</TableHead>
                        <TableHead className="text-right">Profit/Loss</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {betHistory.length > 0 ? betHistory.map((result) => {
                        const details = getNumberDetails(result.winningNumber);
                        const { totalProfit, totalLosses } = (result.bets || []).reduce(
                            (acc, bet) => {
                                const isWin = (bet.payout || 0) > 0;
                                if (isWin) {
                                    acc.totalProfit += (bet.payout! - bet.amount);
                                } else {
                                    acc.totalLosses += bet.amount;
                                }
                                return acc;
                            }, { totalProfit: 0, totalLosses: 0 }
                        );

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
                            <TableCell>
                                {result.bets.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        {result.bets.map((bet, index) => {
                                            const isWin = (bet.payout || 0) > 0;
                                            return (
                                                <span key={index} className={cn(
                                                    'font-semibold px-1.5 py-0.5 rounded text-xs',
                                                    isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                )}>
                                                    {bet.value} (₹{bet.amount.toFixed(0)})
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">No Bet</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-xs">
                                <span className="text-green-400 whitespace-nowrap">+₹{totalProfit.toFixed(2)}</span>
                                <span className="text-muted-foreground"> / </span>
                                <span className="text-red-400 whitespace-nowrap">-₹{totalLosses.toFixed(2)}</span>
                            </TableCell>
                        </TableRow>
                        )
                    }) : <TableRow><TableCell colSpan={4} className="text-center">No history yet.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <Leaderboard isAdminView={user.role === 'admin'} />

      <AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        {isOverallWin && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} />}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl">
              {isOverallWin ? 'Congratulations!' : 'Better Luck Next Time!'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              The winning number was <span className="font-bold text-lg text-accent">{lastResult?.winningNumber}</span>.
              Here's how you did.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {lastResult && lastResult.bets.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {lastResult.bets.map((bet, index) => {
                    const payout = getPayout(bet, lastResult.winningNumber);
                    const isWin = payout > 0;
                    const profit = payout - bet.amount;
                    return (
                        <div key={index} className={cn(
                            "flex justify-between items-center text-sm p-3 rounded-md",
                            isWin ? 'bg-green-900/50 text-white' : 'bg-red-900/50 text-white'
                        )}>
                            <span>Bet on {bet.type} ({bet.value}) for <span className="font-bold">₹{bet.amount.toFixed(2)}</span></span>
                            <span className={cn(
                                "font-bold text-base",
                                isWin ? 'text-green-400' : 'text-red-400'
                            )}>
                                {isWin ? `+₹${profit.toFixed(2)}` : `-₹${bet.amount.toFixed(2)}`}
                            </span>
                        </div>
                    );
                })}
            </div>
          )}

          {lastResult && (
            <div className="mt-4 pt-4 border-t border-border">
                <p className="text-right font-bold text-xl">
                    Round Profit/Loss: 
                     <span className="text-green-400"> +₹{netResult.profit.toFixed(2)}</span> / 
                     <span className="text-red-400"> -₹{netResult.loss.toFixed(2)}</span>
                </p>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResultDialog(false)} className="w-full">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
