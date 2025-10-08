import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { Icons } from '@/components/icons';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-4">
        {/* This is the mobile trigger */}
        <SidebarTrigger className="md:hidden" />
        {/* This is the logo, hidden on mobile and shown on md+ */}
        <Link href="/dashboard" className="hidden items-center gap-2 md:flex">
          <Icons.logo className="h-6 w-6" />
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-end space-x-4">
        <UserNav />
      </div>
    </header>
  );
}
