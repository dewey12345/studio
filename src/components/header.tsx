
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Shield, LifeBuoy } from 'lucide-react';
import { Logo } from './logo';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // This effect runs on the client and ensures the header updates on auth changes
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    const handleStorageChange = () => {
      setUser(authService.getCurrentUser());
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    router.push('/');
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-bold text-lg">Color Clash</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Button variant="ghost" asChild>
                  <Link href="/admin"><Shield/>Admin</Link>
                </Button>
              )}
              <Button variant="ghost" asChild>
                <Link href="/dashboard"><UserIcon/>Dashboard</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/support"><LifeBuoy/>Support</Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
