'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@marlion/ui/utils';
import { useAuth } from '@marlion/ui/providers';
import { Button } from '@marlion/ui/components';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FolderKanban,
  Award,
  Trophy,
  LogOut,
  Layout,
  Users2,
  Settings,
  Calendar,
  CreditCard,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Project Tracking', href: '/project-tracking', icon: Layout },
  { name: 'Community', href: '/community', icon: Users2 },
  { name: 'Certificates', href: '/certificates', icon: Award },
  { name: 'ID Cards', href: '/id-cards', icon: CreditCard },
  { name: 'Rewards', href: '/rewards', icon: Trophy },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-1 bg-gray-900 text-white">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-sm">M</span>
            </div>
            <span className="font-bold text-lg">Admin Panel</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="px-4 py-4 border-t border-gray-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => signOut()}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
