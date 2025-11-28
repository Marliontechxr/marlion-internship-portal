'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@marlion/ui/utils';
import type { Student } from '@marlion/config/types';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BookOpen,
  FolderKanban,
  Trophy,
  Award,
  LogOut,
  X,
  Menu,
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  Lock,
  Lightbulb,
  Users,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@marlion/ui/providers';
import { useState, useEffect } from 'react';
import { Button, Progress } from '@marlion/ui/components';
import { db } from '@marlion/config/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface DashboardSidebarProps {
  student: Student;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface Section {
  id: string;
  title: string;
  stream: string;
  order: number;
}

interface Module {
  id: string;
  sectionId: string;
  title: string;
  order: number;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Attendance', href: '/attendance', icon: CheckCircle2 },
  { name: 'AI Interview', href: '/interview', icon: MessageSquare },
  { name: 'Offer Letter', href: '/offer', icon: FileText },
  { name: 'Bootcamp', href: '/bootcamp', icon: BookOpen, hasChildren: true },
  { name: 'Choose Your Project', href: '/problem-statements', icon: Lightbulb },
  { name: 'Project Tracker', href: '/project-tracker', icon: FolderKanban },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Rewards', href: '/rewards', icon: Trophy },
  { name: 'Certificate', href: '/certificate', icon: Award },
];

// Calculate overall internship progress (100% = certificate unlocked)
// Bootcamp: 15% (when 100% complete), Project assigned: 15%, Project tasks: 70%
function calculateOverallProgress(student: Student): number {
  let progress = 0;
  
  // Bootcamp completion contributes 15% (only when fully complete)
  const bootcampProg = student.bootcampProgress;
  const completedModulesCount = (typeof bootcampProg === 'object' && bootcampProg?.completedModules) 
    ? bootcampProg.completedModules.length 
    : 0;
  const bootcampTotalProgress = (typeof bootcampProg === 'object' && bootcampProg?.totalProgress) 
    ? bootcampProg.totalProgress 
    : (typeof bootcampProg === 'number' ? bootcampProg : 0);
  // We'll need to check if bootcamp is 100% - for now, use totalProgress if available
  // or assume 15% if they have an approved project (bootcamp was complete)
  if (student.projectAssignment || student.appliedProblemStatementId) {
    // If they have a project assignment/application, bootcamp must be complete
    progress += 15;
  } else if (bootcampTotalProgress === 15) {
    progress += 15;
  }
  
  // Project assigned contributes 15%
  if (student.projectAssignment) {
    progress += 15;
  }
  
  // Project tasks completion contributes 70%
  // projectProgress is stored as 0-100, we normalize it to 70%
  const projectProgress = student.projectProgress || 0;
  progress += Math.round((projectProgress / 100) * 70);
  
  return Math.min(100, progress);
}

export function DashboardSidebar({ student, isMobileOpen, setIsMobileOpen }: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { signOut } = useAuth();
  const [bootcampExpanded, setBootcampExpanded] = useState(pathname.includes('/bootcamp'));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sections, setSections] = useState<Section[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingBootcamp, setLoadingBootcamp] = useState(false);

  // Get current module from URL
  const currentModuleId = searchParams.get('module');

  // Calculate overall progress for certificate visibility
  const overallProgress = calculateOverallProgress(student);

  // Filter navigation based on student status
  const availableNav = navigation.filter((item) => {
    // Hide interview if already completed
    if (item.href === '/interview' && !['registered', 'interview_pending'].includes(student.status)) {
      return false;
    }
    if (item.href === '/offer' && !['selected', 'rejected', 'offer_downloaded', 'active', 'completed'].includes(student.status)) {
      return false;
    }
    if (item.href === '/bootcamp' && !['offer_downloaded', 'active', 'completed'].includes(student.status)) {
      return false;
    }
    // Problem statements unlocked after bootcamp completion
    if (item.href === '/problem-statements' && !['offer_downloaded', 'active', 'completed'].includes(student.status)) {
      return false;
    }
    // Project tracker visible when student has an approved project or is active/completed
    if (item.href === '/project-tracker' && !['offer_downloaded', 'active', 'completed'].includes(student.status)) {
      return false;
    }
    // Community visible after offer is downloaded (active interns only)
    if (item.href === '/community' && !['offer_downloaded', 'active', 'completed'].includes(student.status)) {
      return false;
    }
    // Certificate visible when overall progress is 100% OR status is completed
    if (item.href === '/certificate' && overallProgress < 100 && student.status !== 'completed') {
      return false;
    }
    return true;
  });

  // Load bootcamp content when expanded
  useEffect(() => {
    if (bootcampExpanded && sections.length === 0 && ['offer_downloaded', 'active', 'completed'].includes(student.status)) {
      loadBootcampContent();
    }
  }, [bootcampExpanded, student.status]);

  // Auto-expand bootcamp if on bootcamp page
  useEffect(() => {
    if (pathname.includes('/bootcamp')) {
      setBootcampExpanded(true);
    }
  }, [pathname]);

  const loadBootcampContent = async () => {
    setLoadingBootcamp(true);
    try {
      // Map student's stream values to admin's section stream values
      const streamMapping: { [key: string]: string } = {
        'ar-vr': 'ar-vr',
        'fullstack': 'fullstack',
        'agentic-ai': 'agentic-ai',
        'data-science': 'data-science',
      };

      // Load sections
      const sectionsRef = collection(db, 'sections');
      const sectionsSnap = await getDocs(sectionsRef);
      const allSections = sectionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Section[];

      // Filter by student stream
      const studentStreamRaw = student.chosenStream?.toLowerCase().trim() || '';
      const mappedStream = streamMapping[studentStreamRaw] || studentStreamRaw;
      
      const filteredSections = allSections.filter(s => {
        const sectionStream = s.stream?.toLowerCase().trim();
        return sectionStream === 'general' || sectionStream === mappedStream;
      });
      filteredSections.sort((a, b) => (a.order || 0) - (b.order || 0));
      setSections(filteredSections);

      // Load modules
      const modulesRef = collection(db, 'modules');
      const modulesSnap = await getDocs(modulesRef);
      const allModules = modulesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Module[];
      setModules(allModules);

      // Auto-expand first section
      if (filteredSections.length > 0) {
        setExpandedSections(new Set([filteredSections[0].id]));
      }
    } catch (error) {
      console.error('Error loading bootcamp content:', error);
    } finally {
      setLoadingBootcamp(false);
    }
  };

  const getModulesForSection = (sectionId: string) => {
    return modules
      .filter(m => m.sectionId === sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const isModuleCompleted = (moduleId: string) => {
    const bp = student.bootcampProgress;
    const completed = (typeof bp === 'object' && bp?.completedModules) ? bp.completedModules : [];
    return completed.includes(moduleId);
  };

  const isModuleUnlocked = (module: Module, sectionId: string) => {
    const sectionModules = getModulesForSection(sectionId);
    const index = sectionModules.findIndex(m => m.id === module.id);
    const bp = student.bootcampProgress;
    const completedModules = (typeof bp === 'object' && bp?.completedModules) ? bp.completedModules : [];
    if (index === 0) return true;
    return sectionModules[index - 1] && completedModules.includes(sectionModules[index - 1].id);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-marlion-border">
        <Link href="/dashboard" className="flex items-center space-x-3" onClick={() => setIsMobileOpen(false)}>
          <div className="w-10 h-10 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded-xl flex items-center justify-center shadow-lg shadow-marlion-primary/30">
            <span className="text-white font-bold">M</span>
          </div>
          <span className="font-bold text-xl text-white">Marlion</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {availableNav.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
          const isBootcamp = item.href === '/bootcamp';
          
          if (isBootcamp && item.hasChildren) {
            return (
              <div key={item.name}>
                {/* Bootcamp Header */}
                <button
                  onClick={() => setBootcampExpanded(!bootcampExpanded)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-marlion-primary/20 text-marlion-primary border border-marlion-primary/30'
                      : 'text-slate-400 hover:bg-marlion-surface hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </div>
                  {bootcampExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {/* Bootcamp Content */}
                {bootcampExpanded && (
                  <div className="mt-2 ml-2 pl-4 border-l-2 border-marlion-border">
                    {loadingBootcamp ? (
                      <div className="py-4 text-center text-xs text-slate-500">Loading...</div>
                    ) : sections.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500">No content yet</div>
                    ) : (
                      <div className="space-y-1 py-1">
                        {sections.map((section) => {
                          const sectionModules = getModulesForSection(section.id);
                          const completedCount = sectionModules.filter(m => isModuleCompleted(m.id)).length;
                          const isExpanded = expandedSections.has(section.id);

                          return (
                            <div key={section.id}>
                              <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-marlion-surface transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                )}
                                <span className="font-medium truncate flex-1 text-left text-slate-300">{section.title}</span>
                                <span className="text-marlion-primary text-xs flex-shrink-0 font-medium">{completedCount}/{sectionModules.length}</span>
                              </button>

                              {isExpanded && sectionModules.length > 0 && (
                                <div className="ml-4 space-y-0.5 mt-0.5">
                                  {sectionModules.map((module) => {
                                    const unlocked = isModuleUnlocked(module, section.id);
                                    const completed = isModuleCompleted(module.id);
                                    const isSelected = currentModuleId === module.id;

                                    return (
                                      <Link
                                        key={module.id}
                                        href={unlocked ? `/bootcamp?module=${module.id}` : '#'}
                                        onClick={(e) => {
                                          if (!unlocked) {
                                            e.preventDefault();
                                            return;
                                          }
                                          setIsMobileOpen(false);
                                        }}
                                        className={cn(
                                          'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-200',
                                          !unlocked && 'opacity-50 cursor-not-allowed',
                                          isSelected && 'bg-marlion-primary/20 border border-marlion-primary/30',
                                          unlocked && !isSelected && 'hover:bg-marlion-surface'
                                        )}
                                      >
                                        <div className={cn(
                                          'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                                          completed ? 'bg-marlion-success text-white' : 
                                          !unlocked ? 'bg-marlion-surface border border-marlion-border' : 
                                          'bg-marlion-primary/20 border border-marlion-primary/30'
                                        )}>
                                          {completed ? (
                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                          ) : !unlocked ? (
                                            <Lock className="w-2 h-2 text-slate-500" />
                                          ) : (
                                            <Play className="w-2 h-2 text-marlion-primary" />
                                          )}
                                        </div>
                                        <span className="truncate text-slate-400">{module.title}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-marlion-primary/20 text-marlion-primary border border-marlion-primary/30'
                  : 'text-slate-400 hover:bg-marlion-surface hover:text-white'
              )}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Overall Internship Progress + Sign Out */}
      <div className="px-4 py-4 border-t border-marlion-border flex-shrink-0 space-y-4">
        {/* Overall Internship Progress */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-slate-300">Internship Progress</span>
            <span className="font-bold text-marlion-primary">{calculateOverallProgress(student)}%</span>
          </div>
          <div className="h-2 bg-marlion-surface rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-marlion-primary to-marlion-accent transition-all duration-500"
              style={{ width: `${calculateOverallProgress(student)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            {calculateOverallProgress(student) >= 100 ? '🎉 Certificate unlocked!' : 'Complete all milestones to unlock certificate'}
          </p>
        </div>
        
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-marlion-surface hover:text-white transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-marlion-bg/95 backdrop-blur-xl border-r border-marlion-border">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-marlion-bg flex flex-col">
            <button
              className="absolute top-4 right-4 p-2 hover:bg-marlion-surface rounded-lg transition-colors"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
