"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import type { User } from '@/lib/types';
import AdminPanel from '@/components/admin-panel';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/');
    } else {
      setUser(currentUser);
      setLoading(false);
    }

    const handleAuthChange = () => {
        const updatedUser = authService.getCurrentUser();
        if(!updatedUser || updatedUser.role !== 'admin') {
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
        <Skeleton className="h-12 w-1/4" />
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return user ? <AdminPanel adminUser={user} /> : null;
}
