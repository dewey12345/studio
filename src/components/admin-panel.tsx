
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/auth';
import { supportService } from '@/lib/supportService';
import { withdrawalService } from '@/lib/withdrawService';
import type { User, SupportTicket, WithdrawalRequest, GameSettings, RoundResult, LeaderboardEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, KeyRound, PlusCircle, Edit, Trash2, Shield, LifeBuoy, Banknote, Trophy, Gamepad2, Settings } from 'lucide-react';
import { UserEditDialog } from './user-edit-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getNumberDetails } from '@/lib/game-logic';
import { GAME_SETTINGS_KEY, ROUND_HISTORY_KEY } from '@/lib/constants';
import Leaderboard from './leaderboard';

interface AdminPanelProps {
  adminUser: User;
}

const updateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, { message: 'New password must be at least 6 characters.' }).optional().or(z.literal('')),
});

type UpdateFormValues = z.infer<typeof updateSchema>;
type UserForTable = Omit<User, 'password'>;


export default function AdminPanel({ adminUser }: AdminPanelProps) {
  const [users, setUsers] = useState<UserForTable[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserForTable | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings>({ difficulty: 'easy' });
  const [predictionNumber, setPredictionNumber] = useState<string>('');
  
  const { toast } = useToast();

  const loadData = useCallback(() => {
    setUsers(authService.getUsers());
    setSupportTickets(supportService.getAllTickets());
    setWithdrawalRequests(withdrawalService.getAllRequests());
    const settings = localStorage.getItem(GAME_SETTINGS_KEY);
    if(settings) setGameSettings(JSON.parse(settings));
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => {
        window.removeEventListener('storage', loadData);
    };
  }, [loadData]);

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      email: adminUser.email,
      password: '',
    },
  });

  const onAdminSubmit = (data: UpdateFormValues) => {
    try {
      authService.updateUser(adminUser.id, data.email, data.password || undefined);
      toast({ title: 'Success', description: 'Your credentials have been updated.' });
      form.reset({ ...form.getValues(), password: '' });
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };
  
  const handleEditUser = (user: UserForTable) => {
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2"><Shield /> Admin Dashboard</h1>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="users"><Users />User Management</TabsTrigger>
          <TabsTrigger value="withdrawals"><Banknote/>Withdrawals</TabsTrigger>
          <TabsTrigger value="support"><LifeBuoy/>Support</TabsTrigger>
          <TabsTrigger value="leaderboard"><Trophy/>Leaderboard</TabsTrigger>
          <TabsTrigger value="game"><Gamepad2/>Game Control</TabsTrigger>
        </TabsList>

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
                        <TableHead>Balance</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {users.map(user => (
                        <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>${user.balance.toFixed(2)}</TableCell>
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
                                <TableCell>${req.amount.toFixed(2)}</TableCell>
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

        <TabsContent value="leaderboard" className="mt-6">
            <Leaderboard />
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
