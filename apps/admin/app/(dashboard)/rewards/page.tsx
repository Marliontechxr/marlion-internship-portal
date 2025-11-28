'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Card, Input } from '@marlion/ui/components';
import { db } from '@marlion/config/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  onSnapshot,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  where,
  deleteDoc
} from 'firebase/firestore';
import {
  Trophy,
  Star,
  MessageSquare,
  Gift,
  Send,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Filter,
  Package,
  DollarSign,
  Cpu,
  Coffee,
  UserCheck,
  X,
  ChevronRight,
  AlertCircle,
  Check,
  Trash2
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  chosenStream: string;
  profilePhoto?: string;
  spentPoints?: number;
  assessmentScore?: number;
}

interface Message {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  adminId?: string;
  content: string;
  attachments?: string[];
  sender: 'student' | 'admin';
  createdAt: Timestamp;
  read: boolean;
  isSystemMessage?: boolean;
}

interface Redemption {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rewardId: string;
  rewardName: string;
  pointsCost: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  createdAt: Timestamp;
  processedAt?: Timestamp;
  notes?: string;
}

interface Conversation {
  studentId: string;
  studentName: string;
  studentEmail: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  unreadCount: number;
}

export default function AdminRewardsPage() {
  const [activeTab, setActiveTab] = useState<'messages' | 'redemptions' | 'assessment'>('messages');
  const [students, setStudents] = useState<Student[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [assessmentStudent, setAssessmentStudent] = useState<Student | null>(null);
  const [assessmentScore, setAssessmentScore] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStudents();
    loadConversations();
    loadRedemptions();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadMessages(selectedStudent.id);
    }
  }, [selectedStudent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadStudents = async () => {
    try {
      const studentsRef = collection(db, 'students');
      const studentsSnap = await getDocs(studentsRef);
      const studentsList = studentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentsList);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = () => {
    const messagesRef = collection(db, 'rewardMessages');
    // Simple query without orderBy to avoid index requirement
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Sort by createdAt descending client-side
      allMessages.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      // Group by student
      const convMap = new Map<string, Conversation>();
      allMessages.forEach(msg => {
        if (!convMap.has(msg.studentId)) {
          convMap.set(msg.studentId, {
            studentId: msg.studentId,
            studentName: msg.studentName,
            studentEmail: msg.studentEmail,
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unreadCount: 0,
          });
        }
        if (msg.sender === 'student' && !msg.read) {
          const conv = convMap.get(msg.studentId)!;
          conv.unreadCount++;
        }
      });
      
      setConversations(Array.from(convMap.values()));
    }, (error) => {
      console.error('Error loading conversations:', error);
      setConversations([]);
    });
    
    return unsubscribe;
  };

  const loadMessages = (studentId: string) => {
    const messagesRef = collection(db, 'rewardMessages');
    // Simple query without orderBy to avoid index requirement
    const messagesQuery = query(
      messagesRef, 
      where('studentId', '==', studentId)
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Sort client-side by createdAt ascending
      msgs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
      
      setMessages(msgs);
      
      // Mark unread student messages as read
      msgs.filter(m => m.sender === 'student' && !m.read).forEach(async (msg) => {
        await updateDoc(doc(db, 'rewardMessages', msg.id), { read: true });
      });
    }, (error) => {
      console.error('Error loading messages:', error);
      setMessages([]);
    });
    
    return unsubscribe;
  };

  const loadRedemptions = () => {
    const redemptionsRef = collection(db, 'rewardRedemptions');
    // Simple query without orderBy to avoid index requirement
    const unsubscribe = onSnapshot(redemptionsRef, (snapshot) => {
      const redemptionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Redemption[];
      
      // Sort client-side by createdAt descending
      redemptionsList.sort((a, b) => {
        const aTime = (a as any).createdAt?.toMillis?.() || 0;
        const bTime = (b as any).createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setRedemptions(redemptionsList);
    }, (error) => {
      console.error('Error loading redemptions:', error);
      setRedemptions([]);
    });
    
    return unsubscribe;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedStudent || sending) return;
    
    setSending(true);
    try {
      await addDoc(collection(db, 'rewardMessages'), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        studentEmail: selectedStudent.email,
        content: newMessage.trim(),
        sender: 'admin',
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

  const startNewConversation = (student: Student) => {
    setSelectedStudent(student);
    setMessages([]);
  };

  const processRedemption = async (redemption: Redemption, action: 'approved' | 'rejected' | 'fulfilled') => {
    try {
      await updateDoc(doc(db, 'rewardRedemptions', redemption.id), {
        status: action,
        processedAt: Timestamp.now(),
      });
      
      // Send notification to student
      let message = '';
      if (action === 'approved') {
        message = `✅ Your redemption request for "${redemption.rewardName}" has been approved! We'll process it soon.`;
      } else if (action === 'rejected') {
        message = `❌ Your redemption request for "${redemption.rewardName}" was not approved. Points have been refunded.`;
        // Refund points
        const studentDoc = students.find(s => s.id === redemption.studentId);
        if (studentDoc) {
          const currentSpent = studentDoc.spentPoints || 0;
          await updateDoc(doc(db, 'students', redemption.studentId), {
            spentPoints: Math.max(0, currentSpent - redemption.pointsCost),
          });
        }
      } else if (action === 'fulfilled') {
        message = `🎉 Your reward "${redemption.rewardName}" has been fulfilled! Enjoy!`;
      }
      
      await addDoc(collection(db, 'rewardMessages'), {
        studentId: redemption.studentId,
        studentName: redemption.studentName,
        content: message,
        sender: 'admin',
        createdAt: Timestamp.now(),
        read: false,
        isSystemMessage: true,
      });
      
    } catch (error) {
      console.error('Error processing redemption:', error);
    }
  };

  const updateAssessmentScore = async () => {
    if (!assessmentStudent || assessmentScore < 0 || assessmentScore > 100) return;
    
    try {
      await updateDoc(doc(db, 'students', assessmentStudent.id), {
        assessmentScore: assessmentScore,
      });
      
      // Send notification
      await addDoc(collection(db, 'rewardMessages'), {
        studentId: assessmentStudent.id,
        studentName: assessmentStudent.name,
        content: `📊 Your assessment score has been updated to ${assessmentScore}%. ${assessmentScore >= 90 ? 'Congratulations on earning the Assessment Ace badge! 🏆' : 'Keep up the good work!'}`,
        sender: 'admin',
        createdAt: Timestamp.now(),
        read: false,
        isSystemMessage: true,
      });
      
      setAssessmentStudent(null);
      setAssessmentScore(0);
      loadStudents();
      
    } catch (error) {
      console.error('Error updating assessment:', error);
    }
  };

  const filteredRedemptions = redemptions.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery && !r.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            Rewards Management
          </h1>
          <p className="text-gray-500 mt-1">Manage student rewards, messages, and assessments</p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="bg-blue-50 rounded-xl px-4 py-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-blue-600">Unread</p>
              <p className="text-lg font-bold text-blue-700">{totalUnread}</p>
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl px-4 py-2 flex items-center gap-2">
            <Gift className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-xs text-orange-600">Pending</p>
              <p className="text-lg font-bold text-orange-700">{pendingRedemptions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'messages', label: 'Messages', icon: MessageSquare, badge: totalUnread },
          { id: 'redemptions', label: 'Redemptions', icon: Gift, badge: pendingRedemptions },
          { id: 'assessment', label: 'Assessment Scores', icon: Star },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge ? (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
              }`}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="lg:col-span-1 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
              {/* Existing Conversations */}
              {conversations.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">Recent Conversations</p>
                  {conversations.map(conv => (
                    <button
                      key={conv.studentId}
                      onClick={() => {
                        const student = students.find(s => s.id === conv.studentId);
                        if (student) setSelectedStudent(student);
                      }}
                      className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                        selectedStudent?.id === conv.studentId ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{conv.studentName}</p>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">{conv.lastMessage}</p>
                    </button>
                  ))}
                </div>
              )}
              
              {/* All Students */}
              <p className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">All Students</p>
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => startNewConversation(student)}
                  className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                    selectedStudent?.id === student.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.email}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            {selectedStudent ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedStudent.name}</h3>
                    <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Messages */}
                <div className="h-[400px] overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.sender === 'admin'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${
                            msg.sender === 'admin' ? 'text-white/60' : 'text-gray-500'
                          }`}>
                            {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[500px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a student to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Redemptions Tab */}
      {activeTab === 'redemptions' && (
        <Card>
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'fulfilled', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Points</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRedemptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No redemption requests found
                    </td>
                  </tr>
                ) : (
                  filteredRedemptions.map(redemption => (
                    <tr key={redemption.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{redemption.studentName}</p>
                        <p className="text-xs text-gray-500">{redemption.studentEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{redemption.rewardName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{redemption.pointsCost.toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-500">
                          {redemption.createdAt?.toDate?.()?.toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          redemption.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          redemption.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          redemption.status === 'fulfilled' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {redemption.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => processRedemption(redemption, 'approved')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => processRedemption(redemption, 'rejected')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {redemption.status === 'approved' && (
                          <Button 
                            size="sm"
                            onClick={() => processRedemption(redemption, 'fulfilled')}
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Fulfill
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Assessment Tab */}
      {activeTab === 'assessment' && (
        <Card>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Stream</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Current Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{student.chosenStream}</p>
                    </td>
                    <td className="px-4 py-3">
                      {student.assessmentScore !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                student.assessmentScore >= 90 ? 'bg-green-500' :
                                student.assessmentScore >= 70 ? 'bg-blue-500' :
                                student.assessmentScore >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${student.assessmentScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{student.assessmentScore}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not assessed</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setAssessmentStudent(student);
                          setAssessmentScore(student.assessmentScore || 0);
                        }}
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Set Score
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Assessment Modal */}
      {assessmentStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Set Assessment Score</h3>
              <Button variant="ghost" size="sm" onClick={() => setAssessmentStudent(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="font-medium text-gray-900">{assessmentStudent.name}</p>
                <p className="text-sm text-gray-500">{assessmentStudent.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={assessmentScore}
                  onChange={(e) => setAssessmentScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Score of 90+ will unlock the "Assessment Ace" badge (300 points)
                </p>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAssessmentStudent(null)}>
                  Cancel
                </Button>
                <Button onClick={updateAssessmentScore}>
                  Save Score
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
