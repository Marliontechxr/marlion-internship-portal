'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@marlion/ui/providers';
import { Button, Card, Progress } from '@marlion/ui/components';
import { db } from '@marlion/config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  onSnapshot,
  orderBy,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { getStudentByEmail } from '@marlion/lib/firestore';
import type { Student } from '@marlion/config/types';
import {
  Trophy,
  Star,
  Flame,
  Target,
  Users,
  MessageSquare,
  Award,
  Gift,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  Zap,
  Coffee,
  Shirt,
  Cpu,
  DollarSign,
  UserCheck,
  TrendingUp,
  Crown,
  Medal,
  Sparkles,
  ChevronRight,
  Info,
  Lock,
  Unlock
} from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'attendance' | 'tasks' | 'community' | 'quality' | 'special';
  requirement: number;
  points: number;
  unlocked: boolean;
  progress: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsCost: number;
  category: 'merchandise' | 'subscription' | 'food' | 'coaching' | 'cash';
  available: boolean;
}

interface Message {
  id: string;
  studentId: string;
  adminId?: string;
  content: string;
  attachments?: string[];
  sender: 'student' | 'admin';
  createdAt: Timestamp;
  read: boolean;
}

interface RewardStats {
  totalPoints: number;
  attendanceStreak: number;
  tasksCompleted: number;
  averageRating: number;
  communityPosts: number;
  featuredCount: number;
  assessmentScore: number;
}

const BADGES: Badge[] = [
  // Attendance badges
  { id: 'early-bird', name: 'Early Bird', description: 'Check in before 9:30 AM for 5 days', icon: 'clock', category: 'attendance', requirement: 5, points: 50, unlocked: false, progress: 0 },
  { id: 'streak-week', name: 'Week Warrior', description: 'Maintain 7-day check-in streak', icon: 'flame', category: 'attendance', requirement: 7, points: 100, unlocked: false, progress: 0 },
  { id: 'streak-month', name: 'Monthly Master', description: 'Maintain 30-day check-in streak', icon: 'crown', category: 'attendance', requirement: 30, points: 500, unlocked: false, progress: 0 },
  { id: 'overtime-hero', name: 'Overtime Hero', description: 'Work 8+ hours for 10 days', icon: 'zap', category: 'attendance', requirement: 10, points: 200, unlocked: false, progress: 0 },
  
  // Task badges
  { id: 'task-starter', name: 'Task Starter', description: 'Complete your first task', icon: 'target', category: 'tasks', requirement: 1, points: 25, unlocked: false, progress: 0 },
  { id: 'task-master', name: 'Task Master', description: 'Complete 10 tasks', icon: 'trophy', category: 'tasks', requirement: 10, points: 150, unlocked: false, progress: 0 },
  { id: 'task-legend', name: 'Task Legend', description: 'Complete 25 tasks', icon: 'medal', category: 'tasks', requirement: 25, points: 400, unlocked: false, progress: 0 },
  
  // Quality badges
  { id: 'quality-work', name: 'Quality Craftsman', description: 'Receive 5-star rating on 3 tasks', icon: 'star', category: 'quality', requirement: 3, points: 150, unlocked: false, progress: 0 },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Receive 5-star rating on 10 tasks', icon: 'sparkles', category: 'quality', requirement: 10, points: 400, unlocked: false, progress: 0 },
  { id: 'no-revision', name: 'First Try Wonder', description: 'Complete 5 tasks without revision', icon: 'check', category: 'quality', requirement: 5, points: 200, unlocked: false, progress: 0 },
  
  // Community badges
  { id: 'community-starter', name: 'Community Voice', description: 'Make 5 community posts', icon: 'users', category: 'community', requirement: 5, points: 50, unlocked: false, progress: 0 },
  { id: 'community-active', name: 'Active Contributor', description: 'Make 20 community posts', icon: 'message', category: 'community', requirement: 20, points: 150, unlocked: false, progress: 0 },
  { id: 'featured-star', name: 'Featured Star', description: 'Get featured by admin', icon: 'award', category: 'community', requirement: 1, points: 200, unlocked: false, progress: 0 },
  { id: 'featured-legend', name: 'Featured Legend', description: 'Get featured 5 times', icon: 'crown', category: 'community', requirement: 5, points: 500, unlocked: false, progress: 0 },
  
  // Special badges
  { id: 'assessment-ace', name: 'Assessment Ace', description: 'Score 90%+ in admin assessment', icon: 'trophy', category: 'special', requirement: 90, points: 300, unlocked: false, progress: 0 },
  { id: 'all-rounder', name: 'All Rounder', description: 'Unlock badges in all categories', icon: 'medal', category: 'special', requirement: 4, points: 500, unlocked: false, progress: 0 },
];

const REWARDS: Reward[] = [
  { id: 'tshirt', name: 'Marlion T-Shirt', description: 'Premium cotton tee with Marlion logo', icon: 'shirt', pointsCost: 500, category: 'merchandise', available: true },
  { id: 'bottle', name: 'Marlion Water Bottle', description: 'Stainless steel insulated bottle', icon: 'coffee', pointsCost: 300, category: 'merchandise', available: true },
  { id: 'hoodie', name: 'Marlion Hoodie', description: 'Comfortable hoodie with embroidered logo', icon: 'shirt', pointsCost: 1000, category: 'merchandise', available: true },
  { id: 'chatgpt-plus', name: 'ChatGPT Plus (1 month)', description: 'Premium AI assistant subscription', icon: 'cpu', pointsCost: 800, category: 'subscription', available: true },
  { id: 'claude-pro', name: 'Claude Pro (1 month)', description: 'Advanced AI reasoning assistant', icon: 'cpu', pointsCost: 800, category: 'subscription', available: true },
  { id: 'github-copilot', name: 'GitHub Copilot (1 month)', description: 'AI pair programmer', icon: 'cpu', pointsCost: 600, category: 'subscription', available: true },
  { id: 'pizza-voucher', name: 'Pizza Voucher', description: '₹500 Dominos/Pizza Hut voucher', icon: 'coffee', pointsCost: 400, category: 'food', available: true },
  { id: 'swiggy-voucher', name: 'Swiggy Voucher', description: '₹300 Swiggy gift card', icon: 'coffee', pointsCost: 250, category: 'food', available: true },
  { id: 'ceo-coaching', name: 'CEO Coaching Session', description: '1-hour personal mentoring with CEO', icon: 'user', pointsCost: 2000, category: 'coaching', available: true },
  { id: 'cash-1000', name: 'Cash Reward ₹1000', description: 'Direct bank transfer', icon: 'dollar', pointsCost: 1500, category: 'cash', available: true },
  { id: 'cash-2500', name: 'Cash Reward ₹2500', description: 'Direct bank transfer for top performers', icon: 'dollar', pointsCost: 3500, category: 'cash', available: true },
];

const categoryColors = {
  attendance: 'from-blue-500 to-cyan-500',
  tasks: 'from-green-500 to-emerald-500',
  quality: 'from-yellow-500 to-orange-500',
  community: 'from-purple-500 to-pink-500',
  special: 'from-red-500 to-rose-500',
};

const categoryIcons = {
  attendance: Clock,
  tasks: Target,
  quality: Star,
  community: Users,
  special: Trophy,
};

export default function RewardsPage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'badges' | 'rewards' | 'messages' | 'guide'>('badges');
  const [badges, setBadges] = useState<Badge[]>(BADGES);
  const [stats, setStats] = useState<RewardStats>({
    totalPoints: 0,
    attendanceStreak: 0,
    tasksCompleted: 0,
    averageRating: 0,
    communityPosts: 0,
    featuredCount: 0,
    assessmentScore: 0,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      loadStudentData();
    }
  }, [user]);

  useEffect(() => {
    if (student?.id) {
      loadStats();
      loadMessages();
    }
  }, [student?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadStudentData = async () => {
    if (!user?.email) return;
    try {
      const studentData = await getStudentByEmail(user.email);
      setStudent(studentData);
    } catch (error) {
      console.error('Error loading student:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!student?.id) return;
    
    try {
      // Load attendance data
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(attendanceRef, where('studentId', '==', student.id));
      const attendanceSnap = await getDocs(attendanceQuery);
      
      let streak = 0;
      let overtimeDays = 0;
      let earlyDays = 0;
      
      const attendanceRecords = attendanceSnap.docs.map(doc => doc.data());
      attendanceRecords.sort((a, b) => b.date.localeCompare(a.date));
      
      // Calculate streak
      const today = new Date().toISOString().split('T')[0];
      for (const record of attendanceRecords) {
        if (record.status === 'present') {
          streak++;
          if (record.hoursWorked && record.hoursWorked >= 8) {
            overtimeDays++;
          }
          const checkInTime = record.checkInTime?.toDate?.() || new Date(record.checkInTime);
          if (checkInTime.getHours() < 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() <= 30)) {
            earlyDays++;
          }
        } else if (record.status === 'absent') {
          break;
        }
      }
      
      // Load tasks data
      const tasksRef = collection(db, 'projectTasks');
      const tasksQuery = query(tasksRef, where('studentId', '==', student.id), where('status', '==', 'done'));
      const tasksSnap = await getDocs(tasksQuery);
      
      let tasksCompleted = 0;
      let totalRating = 0;
      let ratedTasks = 0;
      let fiveStarTasks = 0;
      let noRevisionTasks = 0;
      
      tasksSnap.docs.forEach(doc => {
        const task = doc.data();
        tasksCompleted++;
        if (task.rating) {
          totalRating += task.rating;
          ratedTasks++;
          if (task.rating === 5) fiveStarTasks++;
        }
        if (!task.revisionCount || task.revisionCount === 0) {
          noRevisionTasks++;
        }
      });
      
      // Load community posts
      const postsRef = collection(db, 'communityPosts');
      const postsQuery = query(postsRef, where('authorId', '==', student.id));
      const postsSnap = await getDocs(postsQuery);
      const communityPosts = postsSnap.docs.length;
      const featuredCount = postsSnap.docs.filter(doc => doc.data().featured).length;
      
      // Calculate badges
      const updatedBadges = BADGES.map(badge => {
        let progress = 0;
        let unlocked = false;
        
        switch (badge.id) {
          case 'early-bird':
            progress = earlyDays;
            unlocked = earlyDays >= badge.requirement;
            break;
          case 'streak-week':
          case 'streak-month':
            progress = streak;
            unlocked = streak >= badge.requirement;
            break;
          case 'overtime-hero':
            progress = overtimeDays;
            unlocked = overtimeDays >= badge.requirement;
            break;
          case 'task-starter':
          case 'task-master':
          case 'task-legend':
            progress = tasksCompleted;
            unlocked = tasksCompleted >= badge.requirement;
            break;
          case 'quality-work':
          case 'perfectionist':
            progress = fiveStarTasks;
            unlocked = fiveStarTasks >= badge.requirement;
            break;
          case 'no-revision':
            progress = noRevisionTasks;
            unlocked = noRevisionTasks >= badge.requirement;
            break;
          case 'community-starter':
          case 'community-active':
            progress = communityPosts;
            unlocked = communityPosts >= badge.requirement;
            break;
          case 'featured-star':
          case 'featured-legend':
            progress = featuredCount;
            unlocked = featuredCount >= badge.requirement;
            break;
          case 'assessment-ace':
            progress = student.assessmentScore || 0;
            unlocked = (student.assessmentScore || 0) >= badge.requirement;
            break;
        }
        
        return { ...badge, progress, unlocked };
      });
      
      // Calculate all-rounder
      const categoriesUnlocked = new Set(updatedBadges.filter(b => b.unlocked).map(b => b.category));
      const allRounderIndex = updatedBadges.findIndex(b => b.id === 'all-rounder');
      if (allRounderIndex >= 0) {
        updatedBadges[allRounderIndex].progress = categoriesUnlocked.size;
        updatedBadges[allRounderIndex].unlocked = categoriesUnlocked.size >= 4;
      }
      
      setBadges(updatedBadges);
      
      // Calculate total points
      const earnedPoints = updatedBadges.filter(b => b.unlocked).reduce((sum, b) => sum + b.points, 0);
      const spentPoints = student.spentPoints || 0;
      
      setStats({
        totalPoints: earnedPoints - spentPoints,
        attendanceStreak: streak,
        tasksCompleted,
        averageRating: ratedTasks > 0 ? totalRating / ratedTasks : 0,
        communityPosts,
        featuredCount,
        assessmentScore: student.assessmentScore || 0,
      });
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMessages = () => {
    if (!student?.id) return;
    
    const messagesRef = collection(db, 'rewardMessages');
    // Simple query without orderBy to avoid index requirement - sort client-side
    const messagesQuery = query(
      messagesRef, 
      where('studentId', '==', student.id)
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Sort client-side by createdAt
      msgs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
      
      setMessages(msgs);
      
      // Mark unread admin messages as read
      msgs.filter(m => m.sender === 'admin' && !m.read).forEach(async (msg) => {
        await updateDoc(doc(db, 'rewardMessages', msg.id), { read: true });
      });
    }, (error) => {
      console.error('Error loading messages:', error);
      setMessages([]);
    });
    
    return unsubscribe;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !student?.id || sending) return;
    
    setSending(true);
    try {
      await addDoc(collection(db, 'rewardMessages'), {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        content: newMessage.trim(),
        sender: 'student',
        createdAt: Timestamp.now(),
        read: false,
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const redeemReward = async (reward: Reward) => {
    if (!student?.id || stats.totalPoints < reward.pointsCost) return;
    
    setRedeeming(reward.id);
    try {
      // Create redemption request
      await addDoc(collection(db, 'rewardRedemptions'), {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        rewardId: reward.id,
        rewardName: reward.name,
        pointsCost: reward.pointsCost,
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      
      // Update spent points
      const newSpentPoints = (student.spentPoints || 0) + reward.pointsCost;
      await updateDoc(doc(db, 'students', student.id), {
        spentPoints: newSpentPoints,
      });
      
      // Update local stats
      setStats(prev => ({ ...prev, totalPoints: prev.totalPoints - reward.pointsCost }));
      
      // Send notification message
      await addDoc(collection(db, 'rewardMessages'), {
        studentId: student.id,
        studentName: student.name,
        content: `🎉 Redemption request submitted for "${reward.name}" (${reward.pointsCost} points). Admin will process your request soon!`,
        sender: 'admin',
        createdAt: Timestamp.now(),
        read: false,
        isSystemMessage: true,
      });
      
    } catch (error) {
      console.error('Error redeeming reward:', error);
    } finally {
      setRedeeming(null);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      clock: Clock,
      flame: Flame,
      crown: Crown,
      zap: Zap,
      target: Target,
      trophy: Trophy,
      medal: Medal,
      star: Star,
      sparkles: Sparkles,
      check: CheckCircle2,
      users: Users,
      message: MessageSquare,
      award: Award,
      shirt: Shirt,
      coffee: Coffee,
      cpu: Cpu,
      dollar: DollarSign,
      user: UserCheck,
    };
    return icons[iconName] || Trophy;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marlion-primary"></div>
      </div>
    );
  }

  const filteredBadges = selectedCategory === 'all' 
    ? badges 
    : badges.filter(b => b.category === selectedCategory);

  const unlockedBadges = badges.filter(b => b.unlocked);
  const earnedPoints = badges.filter(b => b.unlocked).reduce((sum, b) => sum + b.points, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-400" />
            Rewards & Achievements
          </h1>
          <p className="text-slate-400 mt-1">Complete challenges, earn badges, and redeem exciting rewards!</p>
        </div>
        
        {/* Points Display */}
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Available Points</p>
            <p className="text-3xl font-bold text-white">{stats.totalPoints.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Streak</p>
              <p className="text-xl font-bold text-white">{stats.attendanceStreak} days</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Tasks Done</p>
              <p className="text-xl font-bold text-white">{stats.tasksCompleted}</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg Rating</p>
              <p className="text-xl font-bold text-white">{stats.averageRating.toFixed(1)} ★</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Medal className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Badges</p>
              <p className="text-xl font-bold text-white">{unlockedBadges.length}/{badges.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'badges', label: 'Badges', icon: Medal },
          { id: 'rewards', label: 'Redeem Rewards', icon: Gift },
          { id: 'messages', label: 'Messages', icon: MessageSquare },
          { id: 'guide', label: 'How It Works', icon: Info },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-marlion-primary text-white'
                : 'bg-marlion-surface text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'messages' && messages.filter(m => m.sender === 'admin' && !m.read).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === 'all' ? 'bg-white text-black' : 'bg-marlion-surface text-slate-400'
              }`}
            >
              All ({badges.length})
            </button>
            {Object.entries(categoryColors).map(([cat, color]) => {
              const Icon = categoryIcons[cat as keyof typeof categoryIcons];
              const count = badges.filter(b => b.category === cat).length;
              const unlocked = badges.filter(b => b.category === cat && b.unlocked).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat ? 'bg-white text-black' : 'bg-marlion-surface text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.charAt(0).toUpperCase() + cat.slice(1)} ({unlocked}/{count})
                </button>
              );
            })}
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBadges.map(badge => {
              const Icon = getIconComponent(badge.icon);
              const progressPercent = Math.min(100, (badge.progress / badge.requirement) * 100);
              
              return (
                <Card 
                  key={badge.id} 
                  className={`glass-card p-4 relative overflow-hidden ${
                    badge.unlocked ? 'border-yellow-500/50' : 'opacity-80'
                  }`}
                >
                  {badge.unlocked && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-black" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      badge.unlocked 
                        ? `bg-gradient-to-br ${categoryColors[badge.category]}`
                        : 'bg-marlion-surface'
                    }`}>
                      {badge.unlocked ? (
                        <Icon className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-semibold ${badge.unlocked ? 'text-white' : 'text-slate-400'}`}>
                        {badge.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{badge.description}</p>
                      
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">
                            {badge.progress}/{badge.requirement}
                          </span>
                          <span className={badge.unlocked ? 'text-yellow-400' : 'text-slate-500'}>
                            +{badge.points} pts
                          </span>
                        </div>
                        <div className="h-1.5 bg-marlion-surface rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              badge.unlocked 
                                ? `bg-gradient-to-r ${categoryColors[badge.category]}`
                                : 'bg-slate-600'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REWARDS.map(reward => {
            const Icon = getIconComponent(reward.icon);
            const canAfford = stats.totalPoints >= reward.pointsCost;
            
            return (
              <Card key={reward.id} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    canAfford 
                      ? 'bg-gradient-to-br from-marlion-primary to-marlion-accent'
                      : 'bg-marlion-surface'
                  }`}>
                    <Icon className={`w-6 h-6 ${canAfford ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{reward.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{reward.description}</p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-sm font-bold ${canAfford ? 'text-yellow-400' : 'text-slate-500'}`}>
                        {reward.pointsCost.toLocaleString()} pts
                      </span>
                      
                      <Button
                        size="sm"
                        disabled={!canAfford || redeeming === reward.id}
                        onClick={() => redeemReward(reward)}
                        className={canAfford ? '' : 'opacity-50 cursor-not-allowed'}
                      >
                        {redeeming === reward.id ? (
                          <span className="animate-spin">⏳</span>
                        ) : canAfford ? (
                          <>
                            <Gift className="w-3 h-3 mr-1" />
                            Redeem
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <Card className="glass-card">
          <div className="p-4 border-b border-marlion-border">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-marlion-primary" />
              Admin Messages
            </h3>
            <p className="text-xs text-slate-400 mt-1">Chat with the admin team about rewards, questions, or feedback</p>
          </div>
          
          {/* Messages List */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.sender === 'student'
                      ? 'bg-marlion-primary text-white rounded-br-md'
                      : 'bg-marlion-surface text-slate-300 rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.sender === 'student' ? 'text-white/60' : 'text-slate-500'
                    }`}>
                      {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input */}
          <div className="p-4 border-t border-marlion-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-marlion-surface border border-marlion-border rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-marlion-primary"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Guide Tab */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <Card className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              How the Rewards System Works
            </h3>
            
            <div className="space-y-4 text-slate-300">
              <p>
                Our gamification system is designed to recognize and reward your positive behaviors during the internship. 
                It's not about competing with others – it's about your personal growth and achievements!
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="bg-marlion-surface rounded-xl p-4">
                  <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
                    <Medal className="w-4 h-4 text-yellow-400" />
                    Earn Badges
                  </h4>
                  <ul className="text-sm space-y-1 text-slate-400">
                    <li>• Maintain check-in streaks (7, 30 days)</li>
                    <li>• Complete tasks on time</li>
                    <li>• Get 5-star ratings from admin</li>
                    <li>• Participate in community</li>
                    <li>• Get featured by admin</li>
                  </ul>
                </div>
                
                <div className="bg-marlion-surface rounded-xl p-4">
                  <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-green-400" />
                    Redeem Rewards
                  </h4>
                  <ul className="text-sm space-y-1 text-slate-400">
                    <li>• Marlion merchandise (T-shirts, hoodies)</li>
                    <li>• AI subscriptions (ChatGPT, Claude)</li>
                    <li>• Food vouchers</li>
                    <li>• Personal CEO coaching</li>
                    <li>• Cash rewards</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4 mt-4">
                <h4 className="font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Pro Tips
                </h4>
                <ul className="text-sm space-y-1 text-slate-300">
                  <li>✓ Check in before 9:30 AM for the "Early Bird" badge</li>
                  <li>✓ Work 8+ hours to boost your overtime counter</li>
                  <li>✓ Submit quality work to get 5-star ratings</li>
                  <li>✓ Be active in the community forum</li>
                  <li>✓ Aim for no-revision task completions</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
