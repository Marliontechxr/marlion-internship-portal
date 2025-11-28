'use client';

import { Avatar, Badge } from '@marlion/ui/components';
import { getInitials } from '@marlion/ui/utils';
import { Bell, Menu, Sparkles } from 'lucide-react';
import type { Student } from '@marlion/config/types';

interface DashboardHeaderProps {
  student: Student;
  setIsMobileOpen: (open: boolean) => void;
}

const statusLabels: Record<Student['status'], { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  registered: { label: 'Registered', variant: 'secondary' },
  interview_pending: { label: 'Interview Pending', variant: 'warning' },
  interview_done: { label: 'Under Review', variant: 'secondary' },
  selected: { label: 'Selected!', variant: 'success' },
  rejected: { label: 'Not Selected', variant: 'destructive' },
  offer_downloaded: { label: 'Offer Accepted', variant: 'success' },
  active: { label: 'Active Intern', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  banned: { label: 'Suspended', variant: 'destructive' },
};

export function DashboardHeader({ student, setIsMobileOpen }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-marlion-bg/80 backdrop-blur-xl border-b border-marlion-border">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2 rounded-xl hover:bg-marlion-surface transition-colors"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu className="w-6 h-6 text-slate-400" />
        </button>

        {/* Welcome Message */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-marlion-primary to-marlion-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">
            Welcome, {student.name.split(' ')[0]}!
          </h1>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          {/* Status Badge */}
          <Badge variant={statusLabels[student.status].variant}>
            {statusLabels[student.status].label}
          </Badge>

          {/* Notifications */}
          <button className="p-2 rounded-xl hover:bg-marlion-surface transition-colors relative">
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-marlion-error rounded-full border-2 border-marlion-bg" />
          </button>

          {/* User Avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-marlion-primary to-marlion-accent flex items-center justify-center text-white font-bold text-sm">
            {getInitials(student.name)}
          </div>
        </div>
      </div>
    </header>
  );
}
