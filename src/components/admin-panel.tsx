
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/auth';
import { supportService } from '@/lib/supportService';
import { withdrawalService } from '@/lib/withdrawService';
import { apiKeyService } from '@/lib/apiKeyService';
import type { User, SupportTicket, WithdrawalRequest, GameSettings, Bet, RoundResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, KeyRound, PlusCircle, Edit, Trash2, Shield, LifeBuoy, Banknote, Trophy, Gamepad2, Settings, CloudCog, History, CircleDotDashed } from 'lucide-react';
import { UserEditDialog } from './user-edit-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { GAME_SETTINGS_KEY, ROUND_STATE_KEY, GLOBAL_ROUND_HISTORY_KEY } from '@/lib/constants';
import Leaderboard from './leaderboard';
import { Label } from '@/components/ui/label';
import { ScrollArea } from './ui/scroll-area';

interface AdminPanelProps {
  adminUser: User;
}

type SyncedBet = Bet & { userId: string };

type EnrichedBet = Bet & {
    userEmail: string;
    userPhone?: string;
    roundId: string;
    winningNumber?: number;
};


export default function AdminPanel({ adminUser }: AdminPanelProps) {
  const [users, setUsers] = useState<(User)[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings>({ difficulty: 'easy' });
  const [predictionNumber, setPredictionNumber] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  
  const [liveBets, setLiveBets] = useState<SyncedBet[]>([]);
  const [historicalBets, setHistoricalBets] = useState<EnrichedBet[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const { toast } = useToast();

  const loadData = useCallback(() => {
    const allUsers = authService.getUsers(true) as User[];
    setUsers(allUsers);
    setSupportTickets(supportService.getAllTickets());
    setWithdrawalRequests(withdrawalService.getAllRequests());
    const settings = localStorage.getItem(GAME_SETTINGS_KEY);
    if(settings) setGameSettings(JSON.parse(settings));
    setApiKey(apiKeyService.getApiKey() || '');
    
    // Load betting history
    const roundHistory: RoundResult[] = JSON.parse(localStorage.getItem(GLOBAL_ROUND_HISTORY_KEY) || '[]');
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    const allBets: EnrichedBet[] = [];
    roundHistory.forEach(round => {
        round.bets.forEach(bet => {
            const user = userMap.get(bet.userId);
            allBets.push({
                ...bet,
                userEmail: user?.email || 'Unknown',
                userPhone: user?.phone,
                roundId: round.id,
                winningNumber: round.winningNumber
            });
        });
    });
    setHistoricalBets(allBets);

  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    
    const liveBetInterval = setInterval(() => {
        const roundStateRaw = localStorage.getItem(ROUND_STATE_KEY);
        if (roundStateRaw) {
            const roundState = JSON.parse(roundStateRaw);
            setLiveBets(roundState.bets || []);
        }
    }, 2000);

    return () => {
        window.removeEventListener('storage', loadData);
        clearInterval(liveBetInterval);
    };
  }, [loadData]);


  const filteredHistoricalBets = useMemo(() => {
    if (!historySearchTerm) {
      return historicalBets;
    }
    return historicalBets.filter(bet => 
        bet.userEmail.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        (bet.userPhone && bet.userPhone.includes(historySearchTerm))
    );
  }, [historicalBets, historySearchTerm]);

  const totalBetAmount = useMemo(() => {
    return filteredHistoricalBets.reduce((sum, bet) => sum + bet.amount, 0);
  }, [filteredHistoricalBets]);


  const onAdminSubmit = (data: UpdateFormValues) => {
    try {
      authService.updateUser(adminUser.id, data.email, data.password || undefined);
      toast({ title: 'Success', description: 'Your credentials have been updated.' });
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };
  
  const handleDeleteUser = (userId: string) => {
    try {
        if(userId === adminUser.id) {
            throw new Error("Cannot delete your own admin account.");
        }
        authService.deleteUser(userId);
        toast({ title: "Success", description: "User has been deleted." });
        loadData();
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const handleSaveUser = (data: Partial<User>) => {
    try {
      if (editingUser) {
        authService.updateUserByAdmin(editingUser.id, data);
        toast({ title: "Success", description: "User updated successfully." });
      } else {
        if(!data.password) throw new Error("Password is required for new users.");
        authService.addUser(data as Omit<User, 'id'>);
        toast({ title: "Success", description: "User created successfully." });
      }
      loadData();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleTicketStatusChange = (ticketId: string, status: 'pending' | 'resolved') => {
    try {
        supportService.updateTicketStatus(ticketId, status);
        toast({ title: "Success", description: "Ticket status updated." });
        loadData();
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleWithdrawalStatusChange = (reqId: string, status: 'pending' | 'sent') => {
     try {
        withdrawalService.updateRequestStatus(reqId, status);
        toast({ title: "Success", description: "Withdrawal status updated." });
        loadData();
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const handleGameSettingsChange = (newSettings: Partial<GameSettings>) => {
    const updatedSettings = { ...gameSettings, ...newSettings };
    setGameSettings(updatedSettings);
    localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(updatedSettings));
    toast({ title: 'Success', description: 'Game difficulty updated.' });
  }

  const handleSetPrediction = () => {
    const num = parseInt(predictionNumber, 10);
    if(isNaN(num) || num < 0 || num > 9) {
        toast({ title: "Invalid Number", description: "Please enter a number between 0 and 9.", variant: "destructive"});
        return;
    }
    const currentSettings = JSON.parse(localStorage.getItem(GAME_SETTINGS_KEY) || '{}')
    const newSettings = { ...currentSettings, manualWinner: num };
    localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(newSettings));
    setGameSettings(newSettings);
    toast({ title: "Prediction Set", description: `Next winner will be ${num}. This will be cleared after one round.` });
    setPredictionNumber('');
  }

  const handleSaveApiKey = () => {
    apiKeyService.setApiKey(apiKey);
    toast({ title: "Success", description: "API Key has been saved." });
  }
  
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2"><Shield /> Admin Dashboard</h1>

      <Tabs defaultValue="users" className="w-full">
        <ScrollArea className="w-full pb-2">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 h-auto w-max">
            <TabsTrigger value="users"><Users />User Management</TabsTrigger>
            <TabsTrigger value="withdrawals"><Banknote/>Withdrawals</TabsTrigger>
            <TabsTrigger value="support"><LifeBuoy/>Support</TabsTrigger>
            <TabsTrigger value="leaderboard"><Trophy/>Leaderboard</TabsTrigger>
            <TabsTrigger value="live"><CircleDotDashed />Live Bets</TabsTrigger>
            <TabsTrigger value="history"><History />Bet History</TabsTrigger>
            <TabsTrigger value="game"><Gamepad2/>Game Control</TabsTrigger>
            <TabsTrigger value="api"><CloudCog/>API Settings</TabsTrigger>
            </TabsList>
        </ScrollArea>
        

        <TabsContent value="users" className="mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-2"><Users/>User Management</CardTitle>
                        <CardDescription>Add, edit, or remove user accounts.</CardDescription>
                    </div>
                    <Button onClick={handleAddUser}><PlusCircle/>Add User</Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {users.map(user => (
                        <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell>₹{user.balance.toFixed(2)}</TableCell>
                        <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                                {user.role}
                            </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}><Edit/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={user.id === adminUser.id}><Trash2 className="text-destructive"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the user account for {user.email}.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Banknote/>Withdrawal Requests</CardTitle>
                    <CardDescription>Manage user withdrawal requests. Marking as 'Sent' will deduct from their balance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User Email</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {withdrawalRequests.length > 0 ? withdrawalRequests.map(req => (
                            <TableRow key={req.id}>
                                <TableCell>{new Date(req.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{req.userEmail}</TableCell>
                                <TableCell>₹{req.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${req.status === 'pending' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                                        {req.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    {req.status === 'pending' && (
                                        <Select onValueChange={(value: 'pending' | 'sent') => handleWithdrawalStatusChange(req.id, value)}>
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue placeholder="Update"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sent">Mark as Sent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={5} className="text-center">No withdrawal requests.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="support" className="mt-6">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LifeBuoy />Support Tickets</CardTitle>
                    <CardDescription>Manage user support tickets.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User Email</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {supportTickets.length > 0 ? supportTickets.map(ticket => (
                            <TableRow key={ticket.id}>
                                <TableCell>{new Date(ticket.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{ticket.userEmail}</TableCell>
                                <TableCell>{ticket.category}</TableCell>
                                <TableCell className="max-w-[300px] truncate">{ticket.description}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${ticket.status === 'pending' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                                        {ticket.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                     <Select onValueChange={(value: 'pending' | 'resolved') => handleTicketStatusChange(ticket.id, value)} defaultValue={ticket.status}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Update Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={6} className="text-center">No support tickets.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="live" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CircleDotDashed />Live Round Bets</CardTitle>
                    <CardDescription>Bets placed in the current round. Updates every 2 seconds.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Bet Type</TableHead>
                                <TableHead>Bet Value</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {liveBets.length > 0 ? liveBets.map((bet) => {
                                const user = userMap.get(bet.userId);
                                return (
                                <TableRow key={bet.timestamp}>
                                    <TableCell>{new Date(bet.timestamp).toLocaleTimeString()}</TableCell>
                                    <TableCell>{user?.email || 'N/A'}</TableCell>
                                    <TableCell>{user?.phone || 'N/A'}</TableCell>
                                    <TableCell>{bet.type}</TableCell>
                                    <TableCell>{bet.value}</TableCell>
                                    <TableCell className="text-right">₹{bet.amount.toFixed(2)}</TableCell>
                                </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">No bets placed in this round yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History />Betting History</CardTitle>
                    <CardDescription>Search and view all historical bets placed by users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Input 
                            placeholder="Search by email or phone..."
                            value={historySearchTerm}
                            onChange={(e) => setHistorySearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <div className="text-right">
                            <div className="text-sm font-bold">Total Bet Amount</div>
                            <div className="text-lg font-mono">₹{totalBetAmount.toFixed(2)}</div>
                        </div>
                    </div>
                    <ScrollArea className="h-[600px] w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Bet</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>User Agent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHistoricalBets.length > 0 ? filteredHistoricalBets.map((bet, index) => (
                                    <TableRow key={`${bet.roundId}-${index}`}>
                                        <TableCell>{new Date(bet.timestamp).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div>{bet.userEmail}</div>
                                            <div className="text-xs text-muted-foreground">{bet.userPhone}</div>
                                        </TableCell>
                                        <TableCell>{bet.type} on {bet.value}</TableCell>
                                        <TableCell>₹{bet.amount.toFixed(2)}</TableCell>
                                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{bet.userAgent || 'N/A'}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">No betting history found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
            <Leaderboard isAdminView={true} />
        </TabsContent>

        <TabsContent value="game" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings />Game Settings</CardTitle>
                    <CardDescription>Control game difficulty and manually set the next winner.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="difficulty">Game Difficulty</Label>
                        <Select onValueChange={(value: 'easy' | 'moderate' | 'hard') => handleGameSettingsChange({ difficulty: value })} value={gameSettings.difficulty}>
                            <SelectTrigger id="difficulty" className="w-[200px]">
                                <SelectValue placeholder="Select difficulty"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="moderate">Moderate</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">Easy: AI favors lowest bet. Hard: AI tries to make most players lose.</p>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="prediction">Manual Prediction</Label>
                        <div className="flex gap-2">
                            <Input id="prediction" type="number" min="0" max="9" value={predictionNumber} onChange={(e) => setPredictionNumber(e.target.value)} placeholder="Enter winning number (0-9)" className="w-[250px]"/>
                            <Button onClick={handleSetPrediction}>Set Winner</Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Set the winning number for the next round. This will override the AI. The setting is for one round only.</p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CloudCog />API Settings</CardTitle>
                    <CardDescription>Manage the Google AI (Gemini) API key for the application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="api-key">Gemini API Key</Label>
                        <Input 
                            id="api-key" 
                            type="password" 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)} 
                            placeholder="Enter your Google AI API Key"
                        />
                         <p className="text-sm text-muted-foreground">
                            This key is stored in your browser's local storage and is used for all AI interactions.
                        </p>
                    </div>
                    <Button onClick={handleSaveApiKey}>Save API Key</Button>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>

      <UserEditDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveUser}
        user={editingUser}
      />
    </div>
  );
}
