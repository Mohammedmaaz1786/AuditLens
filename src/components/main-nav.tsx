'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icons } from '@/components/icons';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  ListTodo,
  LifeBuoy,
  Book,
} from 'lucide-react';

const mainLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/vendors', label: 'Vendors', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/security', label: 'Security', icon: ShieldCheck },
  { href: '/audit-trail', label: 'Audit Trail', icon: ListTodo },
];

const helpLinks = [
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/help', label: 'Help', icon: LifeBuoy },
    { href: '/docs', label: 'API Docs', icon: Book },
]

export function MainNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Icons.logo className="h-7 w-7 text-primary" />
          <span className="font-headline text-xl font-bold">AuditLens</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {mainLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <SidebarMenuItem key={link.href}>
                <Link href={link.href}>
                  <SidebarMenuButton isActive={isActive} tooltip={link.label}>
                    <link.icon />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {helpLinks.map((link) => {
             const isActive = pathname.startsWith(link.href);
             return (
                <SidebarMenuItem key={link.href}>
                    <Link href={link.href}>
                    <SidebarMenuButton isActive={isActive} tooltip={link.label}>
                        <link.icon />
                        <span>{link.label}</span>
                    </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
             )
          })}
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
