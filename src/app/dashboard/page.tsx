
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import type { User } from '@/lib/types';
import UserDashboard from '@/components/user-dashboard';
import { Skeleton } from '@/components/ui/skeleton';


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.push('/');
    } else {
      setUser(currentUser);
      setLoading(false);
    }
    
    const handleAuthChange = () => {
        const updatedUser = authService.getCurrentUser();
        if(!updatedUser) {
            router.push('/');
        } else {
            setUser(updatedUser);
        }
    }
    
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
        window.removeEventListener('auth-change', handleAuthChange);
    }

  }, [router]);

  if (loading) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  }

  return user ? <UserDashboard user={user} onUserUpdate={handleUserUpdate} /> : null;
}
