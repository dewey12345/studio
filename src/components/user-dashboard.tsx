
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GameLobby } from '@/components/color-clash-game';
import type { User, WithdrawalRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Gamepad2, KeyRound, Wallet, Banknote } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';
import { withdrawalService } from '@/lib/withdrawService';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { AddFundsDialog } from './add-funds-dialog';

interface UserDashboardProps {
    user: User;
    onUserUpdate: (user: User) => void;
}

const updateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
});
type UpdateFormValues = z.infer<typeof updateSchema>;

const withdrawSchema = z.object({
    amount: z.coerce.number().positive("Must be a positive number.").min(1, "Amount must be at least ₹1."),
})
type WithdrawFormValues = z.infer<typeof withdrawSchema>;


export default function UserDashboard({ user, onUserUpdate }: UserDashboardProps) {
  const { toast } = useToast();
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [isFundsDialogOpen, setIsFundsDialogOpen] = useState(false);

  useEffect(() => {
    setWithdrawalHistory(withdrawalService.getRequestsForUser(user.id));
  }, [user.id]);

  const accountForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      email: user.email,
      password: '',
    },
  });

   const withdrawForm = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
        amount: 10,
    }
  });

  const handleAccountUpdate = (data: UpdateFormValues) => {
    try {
        const updatedUser = authService.updateUser(user.id, data.email, data.password || undefined);
        onUserUpdate(updatedUser);
        accountForm.reset({ email: data.email, password: '' });
        toast({ title: "Success", description: "Your account has been updated." });
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const handleWithdraw = (data: WithdrawFormValues) => {
      if (data.amount > (user.balance ?? 0)) {
          toast({ title: "Error", description: "Withdrawal amount cannot exceed your balance.", variant: "destructive" });
          return;
      }
      try {
          withdrawalService.createRequest({ amount: data.amount, userId: user.id, userEmail: user.email });
          withdrawForm.reset();
          setWithdrawalHistory(withdrawalService.getRequestsForUser(user.id));
          toast({ title: "Success", description: "Your withdrawal request has been submitted." });
      } catch (error: any) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
      }
  }

  return (
    <div className="space-y-6">
        <div className="space-y-1">
            <h1 className="text-3xl font-bold">Welcome, {user.email}!</h1>
            <p className="text-muted-foreground">Ready to play? Place your bets and win big.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <GameLobby user={user} onUserUpdate={onUserUpdate} />
            </div>
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Account</CardTitle>
                        <CardDescription>Manage your account settings and funds.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full" defaultValue='funds'>
                            <AccordionItem value="credentials">
                                <AccordionTrigger><KeyRound className="mr-2"/>Update Credentials</AccordionTrigger>
                                <AccordionContent>
                                    <Form {...accountForm}>
                                        <form onSubmit={accountForm.handleSubmit(handleAccountUpdate)} className="space-y-4">
                                            <FormField control={accountForm.control} name="email" render={({field}) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)} />
                                            <FormField control={accountForm.control} name="password" render={({field}) => (<FormItem><FormLabel>New Password (optional)</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field}/></FormControl><FormMessage/></FormItem>)} />
                                            <Button type="submit" className="w-full">Save Changes</Button>
                                        </form>
                                    </Form>
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="funds">
                                <AccordionTrigger onClick={() => setIsFundsDialogOpen(true)}><Wallet className="mr-2"/>Add Funds</AccordionTrigger>
                                <AccordionContent>
                                     <p className="text-sm text-muted-foreground p-4 text-center">Click the heading above to open the Add Funds dialog and follow the instructions.</p>
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="withdraw">
                                <AccordionTrigger><Banknote className="mr-2"/>Withdraw Funds</AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                     <Form {...withdrawForm}>
                                        <form onSubmit={withdrawForm.handleSubmit(handleWithdraw)} className="space-y-4">
                                            <FormField control={withdrawForm.control} name="amount" render={({field}) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="10" {...field}/></FormControl><FormMessage/></FormItem>)} />
                                            <Button type="submit" className="w-full">Request Withdrawal</Button>
                                        </form>
                                    </Form>
                                    <hr className="my-4 border-border"/>
                                    <h4 className="font-semibold">Withdrawal History</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {withdrawalHistory.length > 0 ? withdrawalHistory.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell>{new Date(req.timestamp).toLocaleDateString()}</TableCell>
                                                <TableCell>₹{req.amount.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${req.status === 'pending' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                                                        {req.status}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={3} className="text-center">No history.</TableCell></TableRow>
                                        )}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
        <AddFundsDialog isOpen={isFundsDialogOpen} onOpenChange={setIsFundsDialogOpen} />
    </div>
  );
}
