'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { Icons } from '@/components/icons';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 px-3 sm:px-6 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile trigger */}
        <SidebarTrigger className="md:hidden -ml-1" />
        
        {/* Logo - visible on mobile and desktop */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Icons.logo className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <span className="font-headline text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            AuditLens
          </span>
        </Link>
      </div>
      
      <div className="flex flex-1 items-center justify-end">
        <UserNav />
      </div>
    </header>
  );
}
