'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@marlion/ui/providers';
import { Avatar, Button } from '@marlion/ui/components';
import { getInitials } from '@marlion/ui/utils';
import { Bell, X, Clock, CheckCircle, Send, Loader2 } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '@marlion/config';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  studentId?: string;
  taskId?: string;
  taskTitle?: string;
}

export function AdminHeader() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to notifications
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      console.error('Error fetching notifications:', error);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      ));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_started':
        return <Loader2 className="w-4 h-4 text-blue-500" />;
      case 'task_submitted':
        return <Send className="w-4 h-4 text-yellow-500" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-6">
        <h1 className="text-lg font-semibold text-gray-900">
          Marlion Admin Dashboard
        </h1>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)}>
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          !notif.read ? 'bg-purple-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              {notif.message}
                            </p>
                            {notif.taskTitle && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                Task: {notif.taskTitle}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {notif.timestamp}
                            </p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Avatar fallback={getInitials(user?.email || 'Admin')} size="sm" />
            <span className="text-sm font-medium text-gray-700">
              {user?.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
