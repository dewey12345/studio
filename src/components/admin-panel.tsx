"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/auth';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, KeyRound, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { UserEditDialog } from './user-edit-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

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
  
  const { toast } = useToast();

  const loadUsers = () => {
    setUsers(authService.getUsers());
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
        loadUsers();
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
      loadUsers();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound/>Change Your Credentials</CardTitle>
          <CardDescription>Update your admin email and password here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAdminSubmit)} className="space-y-4 max-w-sm">
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Admin Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>New Password (optional)</FormLabel><FormControl><Input type="password" placeholder="Leave blank to keep current password" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit">Update Credentials</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
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
                <TableHead>User ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-xs">{user.id}</TableCell>
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

      <UserEditDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveUser}
        user={editingUser}
      />
    </div>
  );
}
