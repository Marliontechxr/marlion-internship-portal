'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@marlion/config';
import { 
  Plus, 
  Trash2, 
  Upload,
  Loader2, 
  Image as ImageIcon,
  Video,
  FileText,
  Award,
  Bell,
  Lightbulb,
  Heart,
  MessageCircle,
  Flag,
  Eye,
  Send,
  X,
  Star,
  BookOpen,
  Users,
  AlertTriangle,
  Check,
  MoreVertical
} from 'lucide-react';

interface CommunityPost {
  id: string;
  type: 'spotlight' | 'announcement' | 'resource' | 'work' | 'help' | 'insight';
  authorType: 'admin' | 'student';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  tags: string[];
  likes: string[];
  commentsCount: number;
  isHidden: boolean;
  isPinned: boolean;
  createdAt: any;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorType: 'admin' | 'student';
  content: string;
  isHidden: boolean;
  createdAt: any;
}

const POST_TYPES = {
  spotlight: { 
    label: '🌟 Student Spotlight', 
    description: 'Feature outstanding student work',
    icon: Award, 
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30'
  },
  announcement: { 
    label: '📢 Announcement', 
    description: 'Share important updates, rules, timings',
    icon: Bell, 
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  resource: { 
    label: '📚 Learning Hub', 
    description: 'Share blogs, tutorials, insights',
    icon: BookOpen, 
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  work: { 
    label: '🚀 Show & Tell', 
    description: 'Student showcasing their work',
    icon: Star, 
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  help: { 
    label: '🆘 Help Desk', 
    description: 'Students seeking help',
    icon: Users, 
    color: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  },
  insight: { 
    label: '💡 Eureka Moments', 
    description: 'Share ideas, hacks, discoveries',
    icon: Lightbulb, 
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30'
  }
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('announcement');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video',
    tags: '',
    isPinned: false,
    studentId: '', // For spotlight - which student to feature
    studentName: ''
  });

  const [students, setStudents] = useState<{id: string; name: string; email: string}[]>([]);

  useEffect(() => {
    // Fetch all posts
    const postsQuery = query(
      collection(db, 'communityPosts'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommunityPost[];
      setPosts(postsData);
      setLoading(false);
    });

    // Fetch students for spotlight feature
    const fetchStudents = async () => {
      const studentsQuery = query(collection(db, 'students'));
      const snapshot = await getDocs(studentsQuery);
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
        email: doc.data().email || ''
      }));
      setStudents(studentsData);
    };
    fetchStudents();

    return () => unsubscribePosts();
  }, []);

  // Fetch comments for a post - sort client-side to avoid composite index
  const fetchComments = async (postId: string) => {
    const commentsQuery = query(
      collection(db, 'communityComments'),
      where('postId', '==', postId)
    );
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      }) as Comment[];
      setComments(prev => ({ ...prev, [postId]: commentsData }));
    });

    return unsubscribe;
  };

  // File upload handler
  const handleFileUpload = async (file: File): Promise<string> => {
    const fileRef = ref(storage, `community/admin/${Date.now()}_${file.name}`);
    setUploading(true);
    
    try {
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      return url;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const isVideo = file.type.startsWith('video/');
      setFormData(prev => ({ ...prev, mediaType: isVideo ? 'video' : 'image' }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send notifications to all students
  const sendNotificationsToAllStudents = async (postTitle: string, postId: string) => {
    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const batch: Promise<any>[] = [];
      
      studentsSnapshot.docs.forEach((studentDoc) => {
        batch.push(
          addDoc(collection(db, 'notifications'), {
            userId: studentDoc.id,
            type: 'admin_post',
            postId: postId,
            postTitle: postTitle,
            fromUserId: 'admin',
            fromUserName: 'Marlion Admin',
            message: `New post: "${postTitle}"`,
            isRead: false,
            createdAt: serverTimestamp()
          })
        );
      });
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    try {
      let mediaUrl = formData.mediaUrl;
      
      // Upload file if selected
      if (uploadedFile) {
        mediaUrl = await handleFileUpload(uploadedFile);
      }

      const postRef = await addDoc(collection(db, 'communityPosts'), {
        type: selectedType,
        authorType: 'admin',
        authorId: 'admin',
        authorName: 'Marlion Admin',
        title: formData.title,
        content: formData.content,
        mediaUrl: mediaUrl || null,
        mediaType: mediaUrl ? formData.mediaType : null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        likes: [],
        commentsCount: 0,
        threadCount: 0,
        isHidden: false,
        isPinned: formData.isPinned,
        featuredStudentId: selectedType === 'spotlight' ? formData.studentId : null,
        featuredStudentName: selectedType === 'spotlight' ? formData.studentName : null,
        createdAt: serverTimestamp()
      });

      // Send notifications to all students for announcements
      if (selectedType === 'announcement' || selectedType === 'resource') {
        await sendNotificationsToAllStudents(formData.title, postRef.id);
      }

      setFormData({
        title: '',
        content: '',
        mediaUrl: '',
        mediaType: 'image',
        tags: '',
        isPinned: false,
        studentId: '',
        studentName: ''
      });
      setUploadedFile(null);
      setPreviewUrl('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await deleteDoc(doc(db, 'communityPosts', postId));
      
      // Delete associated comments
      const commentsQuery = query(
        collection(db, 'communityComments'),
        where('postId', '==', postId)
      );
      const snapshot = await getDocs(commentsQuery);
      snapshot.docs.forEach(async (docSnap) => {
        await deleteDoc(doc(db, 'communityComments', docSnap.id));
      });
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleToggleHidePost = async (postId: string, currentHidden: boolean) => {
    try {
      await updateDoc(doc(db, 'communityPosts', postId), {
        isHidden: !currentHidden
      });
    } catch (error) {
      console.error('Error toggling post visibility:', error);
    }
  };

  const handleTogglePinPost = async (postId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'communityPosts', postId), {
        isPinned: !currentPinned
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    try {
      await deleteDoc(doc(db, 'communityComments', commentId));
      
      // Update comment count
      const post = posts.find(p => p.id === postId);
      if (post) {
        await updateDoc(doc(db, 'communityPosts', postId), {
          commentsCount: Math.max(0, (post.commentsCount || 0) - 1)
        });
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleHideComment = async (commentId: string, currentHidden: boolean) => {
    try {
      await updateDoc(doc(db, 'communityComments', commentId), {
        isHidden: !currentHidden
      });
    } catch (error) {
      console.error('Error hiding comment:', error);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'all') return true;
    if (activeTab === 'admin') return post.authorType === 'admin';
    if (activeTab === 'students') return post.authorType === 'student';
    if (activeTab === 'flagged') return post.isHidden;
    return post.type === activeTab;
  });

  const pinnedPosts = filteredPosts.filter(p => p.isPinned);
  const regularPosts = filteredPosts.filter(p => !p.isPinned);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Community Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage announcements, spotlights, and student engagement
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {Object.entries(POST_TYPES).map(([key, type]) => {
          const count = posts.filter(p => p.type === key).length;
          const Icon = type.icon;
          return (
            <div 
              key={key}
              onClick={() => setActiveTab(key)}
              className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-105 ${
                activeTab === key 
                  ? `${type.bgColor} ${type.borderColor} border-2` 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <Icon className={`w-6 h-6 mb-2 ${activeTab === key ? 'text-current' : 'text-gray-500'}`} />
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-gray-500 truncate">{type.label.split(' ').slice(1).join(' ')}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        {[
          { id: 'all', label: 'All Posts' },
          { id: 'admin', label: 'Admin Posts' },
          { id: 'students', label: 'Student Posts' },
          { id: 'flagged', label: '⚠️ Hidden/Flagged' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Posts */}
          {pinnedPosts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Star className="w-4 h-4" /> Pinned
              </h3>
              <div className="space-y-4">
                {pinnedPosts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onDelete={handleDeletePost}
                    onToggleHide={handleToggleHidePost}
                    onTogglePin={handleTogglePinPost}
                    onShowComments={(id) => {
                      setShowCommentsFor(id);
                      fetchComments(id);
                    }}
                    comments={comments[post.id] || []}
                    showComments={showCommentsFor === post.id}
                    onDeleteComment={handleDeleteComment}
                    onHideComment={handleHideComment}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Posts */}
          {regularPosts.length > 0 ? (
            <div className="space-y-4">
              {regularPosts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onDelete={handleDeletePost}
                  onToggleHide={handleToggleHidePost}
                  onTogglePin={handleTogglePinPost}
                  onShowComments={(id) => {
                    setShowCommentsFor(showCommentsFor === id ? null : id);
                    if (showCommentsFor !== id) fetchComments(id);
                  }}
                  comments={comments[post.id] || []}
                  showComments={showCommentsFor === post.id}
                  onDeleteComment={handleDeleteComment}
                  onHideComment={handleHideComment}
                  formatDate={formatDate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No posts found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-blue-600 hover:underline"
              >
                Create your first post
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">Create New Post</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Post Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Post Type</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(POST_TYPES).filter(([key]) => 
                    ['spotlight', 'announcement', 'resource'].includes(key)
                  ).map(([key, type]) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedType(key)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedType === key
                            ? `${type.bgColor} ${type.borderColor}`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-2" />
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Selection for Spotlight */}
              {selectedType === 'spotlight' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Feature Student</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => {
                      const student = students.find(s => s.id === e.target.value);
                      setFormData({
                        ...formData,
                        studentId: e.target.value,
                        studentName: student?.name || ''
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700"
                  >
                    <option value="">Select a student</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter a compelling title..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your post content here..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 resize-none"
                />
              </div>

              {/* Media */}
              <div>
                <label className="block text-sm font-medium mb-2">Media (Optional)</label>
                
                {/* File Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {previewUrl ? (
                  <div className="relative mb-3">
                    {formData.mediaType === 'video' ? (
                      <video src={previewUrl} className="w-full rounded-xl max-h-48 object-cover" controls />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="w-full rounded-xl max-h-48 object-cover" />
                    )}
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setPreviewUrl('');
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center gap-2 hover:border-blue-500 transition-colors mb-3"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500">Click to upload image or video</span>
                    <span className="text-xs text-gray-400">Stored in Firebase Storage</span>
                  </button>
                )}

                <p className="text-xs text-gray-500 text-center mb-3">— OR paste a URL —</p>
                
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => setFormData({ ...formData, mediaType: 'image' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      formData.mediaType === 'image' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" /> Image
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, mediaType: 'video' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      formData.mediaType === 'video' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Video
                  </button>
                </div>
                <input
                  type="url"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  placeholder={formData.mediaType === 'video' ? 'YouTube URL...' : 'Image URL...'}
                  disabled={!!uploadedFile}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 disabled:opacity-50"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="ai, mobile-dev, tips..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700"
                />
              </div>

              {/* Pin Option */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span>Pin this post to top</span>
              </label>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setUploadedFile(null);
                  setPreviewUrl('');
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!formData.title.trim() || !formData.content.trim() || uploading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Post Card Component
function PostCard({ 
  post, 
  onDelete, 
  onToggleHide, 
  onTogglePin,
  onShowComments,
  comments,
  showComments,
  onDeleteComment,
  onHideComment,
  formatDate
}: {
  post: CommunityPost;
  onDelete: (id: string) => void;
  onToggleHide: (id: string, hidden: boolean) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onShowComments: (id: string) => void;
  comments: Comment[];
  showComments: boolean;
  onDeleteComment: (commentId: string, postId: string) => void;
  onHideComment: (commentId: string, hidden: boolean) => void;
  formatDate: (timestamp: any) => string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const typeConfig = POST_TYPES[post.type as keyof typeof POST_TYPES] || POST_TYPES.announcement;
  const Icon = typeConfig.icon;

  const extractYouTubeId = (url: string) => {
    const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden ${
      post.isHidden ? 'border-red-300 dark:border-red-700 opacity-60' : 'border-gray-200 dark:border-gray-700'
    } ${post.isPinned ? 'ring-2 ring-yellow-400' : ''}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between ${typeConfig.bgColor}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${typeConfig.color} text-white`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-medium">{typeConfig.label}</span>
            {post.authorType === 'student' && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                Student Post
              </span>
            )}
            {post.isHidden && (
              <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                Hidden
              </span>
            )}
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-10 min-w-[180px]">
              <button
                onClick={() => { onTogglePin(post.id, post.isPinned); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <Star className={`w-4 h-4 ${post.isPinned ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                {post.isPinned ? 'Unpin' : 'Pin to Top'}
              </button>
              <button
                onClick={() => { onToggleHide(post.id, post.isHidden); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                {post.isHidden ? <Eye className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                {post.isHidden ? 'Unhide' : 'Hide Post'}
              </button>
              <hr className="my-2 border-gray-200 dark:border-gray-600" />
              <button
                onClick={() => { onDelete(post.id); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {post.authorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{post.authorName}</span>
              <span className="text-gray-400 text-sm">•</span>
              <span className="text-gray-500 text-sm">{formatDate(post.createdAt)}</span>
            </div>
            <h3 className="text-lg font-bold mb-2">{post.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
            
            {/* Media */}
            {post.mediaUrl && (
              <div className="mt-4 rounded-xl overflow-hidden">
                {post.mediaType === 'video' && extractYouTubeId(post.mediaUrl) ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(post.mediaUrl)}`}
                    className="w-full aspect-video"
                    allowFullScreen
                  />
                ) : post.mediaType === 'image' ? (
                  <img src={post.mediaUrl} alt="" className="w-full max-h-96 object-cover" />
                ) : null}
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Heart className="w-5 h-5" />
          <span>{post.likes?.length || 0}</span>
        </div>
        <button 
          onClick={() => onShowComments(post.id)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-500"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{post.commentsCount || 0} Comments</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold mb-4">Comments ({comments.length})</h4>
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <div 
                  key={comment.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    comment.isHidden ? 'bg-red-50 dark:bg-red-900/20 opacity-60' : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">
                    {comment.authorName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.authorName}</span>
                      <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                      {comment.isHidden && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Hidden</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{comment.content}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onHideComment(comment.id, comment.isHidden)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      title={comment.isHidden ? 'Unhide' : 'Hide'}
                    >
                      {comment.isHidden ? <Eye className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => onDeleteComment(comment.id, post.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No comments yet</p>
          )}
        </div>
      )}
    </div>
  );
}
