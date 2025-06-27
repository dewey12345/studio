
"use client"
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/auth';
import { supportService } from '@/lib/supportService';
import type { User, SupportTicket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { LifeBuoy, Send } from 'lucide-react';
import Link from 'next/link';

const ticketSchema = z.object({
  category: z.enum(['Deposit/Withdraw', 'Betting Related', 'Other'], { required_error: 'Please select a category.' }),
  description: z.string().min(10, { message: 'Please provide a detailed description (at least 10 characters).' }),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

function TelegramButton() {
    return (
        <Button asChild>
            <Link href="https://t.me/official9livehack" target="_blank">
                <Send className="mr-2" />
                Contact on Telegram
            </Link>
        </Button>
    )
}

export default function SupportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.push('/');
    } else {
      setUser(currentUser);
      setTickets(supportService.getTicketsForUser(currentUser.id));
    }
  }, [router]);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      category: undefined,
      description: '',
    },
  });

  const onSubmit = (data: TicketFormValues) => {
    if (!user) return;
    try {
      supportService.createTicket({
        ...data,
        userId: user.id,
        userEmail: user.email,
      });
      toast({ title: 'Success', description: 'Your support ticket has been submitted.' });
      setTickets(supportService.getTicketsForUser(user.id));
      form.reset();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (!user) {
    return <div>Loading...</div>; // Or a skeleton loader
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><LifeBuoy /> Support Center</h1>
            <p className="text-muted-foreground">Get help with your issues or contact us directly.</p>
        </div>
        <TelegramButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                <CardTitle>My Tickets</CardTitle>
                <CardDescription>Here is a list of your past and current support tickets.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {tickets.length > 0 ? (
                        tickets.map(ticket => (
                        <TableRow key={ticket.id}>
                            <TableCell>{new Date(ticket.timestamp).toLocaleDateString()}</TableCell>
                            <TableCell>{ticket.category}</TableCell>
                            <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${ticket.status === 'pending' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                                {ticket.status}
                            </span>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={3} className="text-center">You have no support tickets.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
        <div>
        <Card>
            <CardHeader>
            <CardTitle>Create a New Ticket</CardTitle>
            <CardDescription>Fill out the form below to get help.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a problem category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Deposit/Withdraw">Deposit/Withdraw</SelectItem>
                            <SelectItem value="Betting Related">Betting Related</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Please describe your issue in detail..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">Submit Ticket</Button>
                </form>
            </Form>
            </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
