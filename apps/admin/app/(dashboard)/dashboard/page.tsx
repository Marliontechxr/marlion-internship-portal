'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@marlion/ui/components';
import { Users, UserCheck, Clock, Award, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  pendingInterviews: number;
  activeInterns: number;
  completedInterns: number;
  byStream: Record<string, number>;
  byCollege: Record<string, number>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          totalStudents: 0,
          pendingInterviews: 0,
          activeInterns: 0,
          completedInterns: 0,
          byStream: {},
          byCollege: {},
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Pending Interviews',
      value: stats?.pendingInterviews || 0,
      icon: Clock,
      color: 'yellow',
    },
    {
      title: 'Active Interns',
      value: stats?.activeInterns || 0,
      icon: UserCheck,
      color: 'green',
    },
    {
      title: 'Completed',
      value: stats?.completedInterns || 0,
      icon: Award,
      color: 'purple',
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
  };

  const streamNames: Record<string, string> = {
    'ar-vr': 'AR/VR',
    'fullstack': 'Full-Stack',
    'agentic-ai': 'Agentic AI',
    'data-science': 'Data Science',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <Badge variant="success">Live Data</Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[stat.color]}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Stream */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Students by Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats?.byStream || {}).map(([stream, count]) => (
                <div key={stream} className="flex items-center justify-between">
                  <span className="font-medium">{streamNames[stream] || stream}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(count / (stats?.totalStudents || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By College */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Students by College
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats?.byCollege || {}).map(([college, count]) => (
                <div key={college} className="flex items-center justify-between">
                  <span className="font-medium">{college}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${(count / (stats?.totalStudents || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/students?status=interview_done"
              className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <p className="font-medium text-blue-600 dark:text-blue-400">Review Interviews</p>
              <p className="text-sm text-gray-500 mt-1">Pending: {stats?.pendingInterviews || 0}</p>
            </a>
            <a
              href="/courses"
              className="p-4 rounded-lg bg-green-50 dark:bg-green-900/30 text-center hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <p className="font-medium text-green-600 dark:text-green-400">Manage Courses</p>
              <p className="text-sm text-gray-500 mt-1">Add modules</p>
            </a>
            <a
              href="/announcements"
              className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-center hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
            >
              <p className="font-medium text-yellow-600 dark:text-yellow-400">Announcements</p>
              <p className="text-sm text-gray-500 mt-1">Post updates</p>
            </a>
            <a
              href="/certificates"
              className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-center hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <p className="font-medium text-purple-600 dark:text-purple-400">Certificates</p>
              <p className="text-sm text-gray-500 mt-1">Issue certs</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
