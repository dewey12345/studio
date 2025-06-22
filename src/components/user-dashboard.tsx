"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ColorClashGame } from '@/components/color-clash-game';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Gamepad2, KeyRound, Wallet } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';

interface UserDashboardProps {
    user: User;
    onUserUpdate: (user: User) => void;
}

const updateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
});
type UpdateFormValues = z.infer<typeof updateSchema>;

const fundsSchema = z.object({
    amount: z.coerce.number().positive("Must be a positive number.").min(1, "Amount must be at least $1."),
})
type FundsFormValues = z.infer<typeof fundsSchema>;


export default function UserDashboard({ user, onUserUpdate }: UserDashboardProps) {
  const { toast } = useToast();

  const accountForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      email: user.email,
      password: '',
    },
  });

  const fundsForm = useForm<FundsFormValues>({
    resolver: zodResolver(fundsSchema),
    defaultValues: {
        amount: 100,
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
  
  const handleAddFunds = (data: FundsFormValues) => {
    try {
        const updatedUser = authService.updateBalance(user.id, data.amount);
        onUserUpdate(updatedUser);
        fundsForm.reset();
        toast({ title: "Success", description: `$${data.amount.toFixed(2)} has been added to your balance.` });
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
        <div className="space-y-1">
            <h1 className="text-3xl font-bold">Welcome, {user.email}!</h1>
            <p className="text-muted-foreground">Ready to play? Place your bets and win big in Color Clash.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Gamepad2/>Color Clash Game</CardTitle>
                        <CardDescription>The round is active. Place your bets on Red, Green, or Violet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ColorClashGame user={user} onUserUpdate={onUserUpdate} />
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Account</CardTitle>
                        <CardDescription>Manage your account settings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
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
                                <AccordionTrigger><Wallet className="mr-2"/>Add Funds</AccordionTrigger>
                                <AccordionContent>
                                     <Form {...fundsForm}>
                                        <form onSubmit={fundsForm.handleSubmit(handleAddFunds)} className="space-y-4">
                                            <FormField control={fundsForm.control} name="amount" render={({field}) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="100" {...field}/></FormControl><FormMessage/></FormItem>)} />
                                            <Button type="submit" className="w-full">Add to Balance</Button>
                                        </form>
                                    </Form>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
