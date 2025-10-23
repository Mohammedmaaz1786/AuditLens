'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function UserNav() {
  const router = useRouter();
  const [userName, setUserName] = useState('Auditor');
  const [userEmail, setUserEmail] = useState('auditor@auditlens.com');
  const [userInitials, setUserInitials] = useState('AU');

  useEffect(() => {
    // Get user data from localStorage
    let storedName = localStorage.getItem('user_name');
    let storedEmail = localStorage.getItem('user_email');
    
    // If not found, try parsing the user object
    if (!storedName || !storedEmail) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          storedName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          storedEmail = user.email;
          
          // Store them for future use
          if (storedName) localStorage.setItem('user_name', storedName);
          if (storedEmail) localStorage.setItem('user_email', storedEmail);
          if (user.role) localStorage.setItem('user_role', user.role);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    }
    
    if (storedName) {
      setUserName(storedName);
      // Generate initials from name
      const initials = storedName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      setUserInitials(initials);
    }
    
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
  }, []);

  const handleLogout = () => {
    // Clear auth token
    localStorage.removeItem('auth_token');
    // Redirect to login
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-accent">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-primary text-white font-semibold text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/settings" className="flex items-center">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
             <Link href="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
