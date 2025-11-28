'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@marlion/ui/providers';
import { db, storage } from '@marlion/config';
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
  arrayUnion,
  arrayRemove,
  where,
  increment,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Plus,
  X,
  Star,
  Award,
  Bell,
  BookOpen,
  Lightbulb,
  Users,
  HelpCircle,
  Rocket,
  Image as ImageIcon,
  Video,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Clock,
  Upload,
  Reply,
  MoreHorizontal,
  Filter,
  Loader2,
  Share2,
  Linkedin
} from 'lucide-react';
import { 
  generateSpotlightShareContent, 
  generateCommunityPostShareContent, 
  openLinkedInShare 
} from '@marlion/lib';

interface CommunityPost {
  id: string;
  type: 'spotlight' | 'announcement' | 'resource' | 'work' | 'help' | 'insight';
  authorType: 'admin' | 'student';
  authorId: string;
  authorName: string;
  stream?: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  tags: string[];
  likes: string[];
  commentsCount: number;
  isHidden: boolean;
  isPinned: boolean;
  featuredStudentId?: string;
  featuredStudentName?: string;
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
  parentId?: string; // For thread replies
  replyToName?: string;
  likes?: string[];
  createdAt: any;
}

const POST_TYPES = {
  spotlight: { 
    label: '🌟 Spotlight', 
    icon: Award, 
    gradient: 'from-yellow-500 to-orange-500',
    bg: 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10',
    border: 'border-yellow-500/20'
  },
  announcement: { 
    label: '📢 Announcement', 
    icon: Bell, 
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
    border: 'border-blue-500/20'
  },
  resource: { 
    label: '📚 Learning Hub', 
    icon: BookOpen, 
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
    border: 'border-purple-500/20'
  },
  work: { 
    label: '🚀 Show & Tell', 
    icon: Rocket, 
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-gradient-to-br from-green-500/10 to-emerald-500/10',
    border: 'border-green-500/20'
  },
  help: { 
    label: '🆘 Help Desk', 
    icon: HelpCircle, 
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-gradient-to-br from-red-500/10 to-rose-500/10',
    border: 'border-red-500/20'
  },
  insight: { 
    label: '💡 Eureka', 
    icon: Lightbulb, 
    gradient: 'from-amber-500 to-yellow-500',
    bg: 'bg-gradient-to-br from-amber-500/10 to-yellow-500/10',
    border: 'border-amber-500/20'
  }
};

const STUDENT_POST_TYPES = [
  { key: 'work', label: '🚀 Share Your Work', description: 'Show off your project progress, screenshots, or demos' },
  { key: 'help', label: '🆘 Ask for Help', description: 'Stuck on something? Get help from peers and mentors' },
  { key: 'insight', label: '💡 Share an Insight', description: 'Discovered a cool hack or learned something new?' }
];

export default function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: string, name: string} | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shareToLinkedIn, setShareToLinkedIn] = useState(false);

  // Create post form
  const [selectedType, setSelectedType] = useState('work');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video',
    tags: '',
    file: null as File | null
  });

  useEffect(() => {
    // Fetch student data
    if (user?.uid) {
      const unsubStudent = onSnapshot(doc(db, 'students', user.uid), (doc) => {
        if (doc.exists()) {
          setStudentData({ id: doc.id, ...doc.data() });
        }
      });

      return () => unsubStudent();
    }
  }, [user]);

  useEffect(() => {
    // Fetch all visible posts
    const postsQuery = query(
      collection(db, 'communityPosts'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((post: any) => !post.isHidden) as CommunityPost[];
      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribePosts();
  }, []);

  const fetchComments = (postId: string) => {
    // Use only where clause - sort client-side to avoid composite index requirement
    const commentsQuery = query(
      collection(db, 'communityComments'),
      where('postId', '==', postId)
    );
    
    onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => !c.isHidden)
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        }) as Comment[];
      setComments(prev => ({ ...prev, [postId]: commentsData }));
    });
  };

  const handleLike = async (postId: string, currentLikes: string[]) => {
    if (!user?.uid) return;
    
    const isLiked = currentLikes.includes(user.uid);
    
    try {
      await updateDoc(doc(db, 'communityPosts', postId), {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCommentLike = async (commentId: string, currentLikes: string[] = []) => {
    if (!user?.uid) return;
    
    const isLiked = currentLikes.includes(user.uid);
    
    try {
      await updateDoc(doc(db, 'communityComments', commentId), {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleComment = async (postId: string) => {
    if (!user?.uid || !newComment.trim() || !studentData) return;

    try {
      await addDoc(collection(db, 'communityComments'), {
        postId,
        authorId: user.uid,
        authorName: studentData.name || 'Student',
        authorType: 'student',
        content: newComment.trim(),
        isHidden: false,
        parentId: replyingTo?.id || null,
        replyToName: replyingTo?.name || null,
        likes: [],
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'communityPosts', postId), {
        commentsCount: increment(1)
      });

      // Create notification for post author
      const postDoc = await getDoc(doc(db, 'communityPosts', postId));
      if (postDoc.exists() && postDoc.data().authorId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: postDoc.data().authorId,
          type: 'comment',
          postId,
          fromUserId: user.uid,
          fromUserName: studentData.name,
          message: `${studentData.name} commented on your post`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    const fileRef = ref(storage, `community/${user?.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  const handleCreatePost = async () => {
    if (!user?.uid || !formData.title.trim() || !formData.content.trim() || !studentData) return;

    setUploading(true);
    try {
      let mediaUrl = formData.mediaUrl;
      
      // Upload file if selected
      if (formData.file) {
        mediaUrl = await handleFileUpload(formData.file);
      }

      const newPostRef = await addDoc(collection(db, 'communityPosts'), {
        type: selectedType,
        authorType: 'student',
        authorId: user.uid,
        authorName: studentData.name || 'Student',
        stream: studentData.chosenStream || '',
        title: formData.title,
        content: formData.content,
        mediaUrl: mediaUrl || null,
        mediaType: formData.file 
          ? (formData.file.type.startsWith('video') ? 'video' : 'image')
          : (formData.mediaUrl ? formData.mediaType : null),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        likes: [],
        commentsCount: 0,
        isHidden: false,
        isPinned: false,
        createdAt: serverTimestamp()
      });

      // Share to LinkedIn if requested
      if (shareToLinkedIn && ['work', 'insight'].includes(selectedType)) {
        const shareUrl = `https://internship.marliontech.com/share/post/${newPostRef.id}?name=${encodeURIComponent(studentData.name || 'Student')}&stream=${encodeURIComponent(studentData.chosenStream || '')}&title=${encodeURIComponent(formData.title)}`;
        openLinkedInShare({
          ...generateCommunityPostShareContent({
            postType: selectedType as 'work' | 'insight' | 'help',
            title: formData.title,
            content: formData.content,
            studentName: studentData.name || 'Student'
          }),
          url: shareUrl
        });
      }

      setFormData({ title: '', content: '', mediaUrl: '', mediaType: 'image', tags: '', file: null });
      setShareToLinkedIn(false);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setUploading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'all') return true;
    if (activeTab === 'admin') return post.authorType === 'admin';
    if (activeTab === 'students') return post.authorType === 'student';
    return post.type === activeTab;
  });

  const pinnedPosts = filteredPosts.filter(p => p.isPinned);
  const regularPosts = filteredPosts.filter(p => !p.isPinned);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const extractYouTubeId = (url: string) => {
    const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  // Build threaded comments structure
  const buildThreadedComments = (postComments: Comment[]) => {
    const topLevel = postComments.filter(c => !c.parentId);
    const replies = postComments.filter(c => c.parentId);
    
    return topLevel.map(comment => ({
      ...comment,
      replies: replies.filter(r => r.parentId === comment.id)
    }));
  };

  // Tab configuration for horizontal scroll
  const FILTER_TABS = [
    { id: 'all', label: 'All', emoji: '✨' },
    { id: 'admin', label: 'Marlion', emoji: '⭐' },
    { id: 'students', label: 'Peers', emoji: '👥' },
    { id: 'spotlight', label: 'Spotlight', emoji: '🌟' },
    { id: 'announcement', label: 'News', emoji: '📢' },
    { id: 'resource', label: 'Learn', emoji: '📚' },
    { id: 'work', label: 'Showcase', emoji: '🚀' },
    { id: 'help', label: 'Help', emoji: '🆘' },
    { id: 'insight', label: 'Ideas', emoji: '💡' },
  ];

  return (
    <div className="min-h-screen bg-marlion-bg">
      {/* Header - Clean & Minimal */}
      <div className="sticky top-0 z-40 bg-marlion-bg/98 backdrop-blur-xl border-b border-white/5">
        {/* Top Bar */}
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-marlion-primary" />
            <h1 className="text-lg font-bold text-white">Community</h1>
          </div>
          
          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-marlion-primary to-marlion-accent text-white rounded-full text-sm font-medium hover:shadow-lg hover:shadow-marlion-primary/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Post</span>
          </button>
        </div>
        
        {/* Horizontal Scrollable Filter Tabs - Like Twitter/Instagram */}
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 px-4 pb-3 min-w-max">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-marlion-primary text-white shadow-md shadow-marlion-primary/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Fade edges for scroll indication */}
          <div className="absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-marlion-bg to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-marlion-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pinned Posts */}
            {pinnedPosts.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">Pinned</span>
                </div>
                <div className="space-y-3">
                  {pinnedPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      userId={user?.uid || ''}
                      onLike={handleLike}
                      onCommentLike={handleCommentLike}
                      onToggleComments={(id) => {
                        setExpandedComments(expandedComments === id ? null : id);
                        if (expandedComments !== id) fetchComments(id);
                      }}
                      comments={buildThreadedComments(comments[post.id] || [])}
                      showComments={expandedComments === post.id}
                      newComment={newComment}
                      setNewComment={setNewComment}
                      onComment={handleComment}
                      formatDate={formatDate}
                      extractYouTubeId={extractYouTubeId}
                      replyingTo={replyingTo}
                      setReplyingTo={setReplyingTo}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Posts */}
            {regularPosts.length > 0 ? (
              <div className="space-y-3">
                {regularPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    userId={user?.uid || ''}
                    onLike={handleLike}
                    onCommentLike={handleCommentLike}
                    onToggleComments={(id) => {
                      setExpandedComments(expandedComments === id ? null : id);
                      if (expandedComments !== id) fetchComments(id);
                    }}
                    comments={buildThreadedComments(comments[post.id] || [])}
                    showComments={expandedComments === post.id}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    onComment={handleComment}
                    formatDate={formatDate}
                    extractYouTubeId={extractYouTubeId}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-marlion-primary/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-marlion-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Start the conversation</h3>
                <p className="text-gray-400 mb-4 text-sm max-w-xs mx-auto">Share your work, ask questions, or post an insight to get the community going.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-marlion-primary text-white rounded-lg text-sm font-medium hover:bg-marlion-primary/90 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create first post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal - Compact */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div 
            className="bg-marlion-card border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Create Post</h2>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Post Type - Horizontal Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {STUDENT_POST_TYPES.map(type => (
                  <button
                    key={type.key}
                    onClick={() => setSelectedType(type.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedType === type.key
                        ? 'bg-marlion-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Title */}
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title..."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-marlion-primary text-sm"
              />

              {/* Content */}
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-marlion-primary resize-none text-sm"
              />

              {/* Media - Compact */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setFormData({ ...formData, file, mediaUrl: '' });
                  }}
                  className="hidden"
                />
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10 text-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                  <span className="text-gray-600 text-xs">or paste URL:</span>
                  <input
                    type="url"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value, file: null })}
                    placeholder="Image/YouTube URL"
                    disabled={!!formData.file}
                    className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-marlion-primary text-sm disabled:opacity-50"
                  />
                </div>
                
                {formData.file && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <span className="flex-1 truncate text-xs text-green-400">{formData.file.name}</span>
                    <button onClick={() => setFormData({ ...formData, file: null })} className="text-gray-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tags */}
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Tags (comma separated)"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-marlion-primary text-sm"
              />
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 space-y-3">
              {/* LinkedIn Share Toggle */}
              {['work', 'insight'].includes(selectedType) && (
                <label className="flex items-center gap-3 p-3 bg-[#0A66C2]/10 rounded-xl cursor-pointer hover:bg-[#0A66C2]/15 transition-colors">
                  <input
                    type="checkbox"
                    checked={shareToLinkedIn}
                    onChange={(e) => setShareToLinkedIn(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-[#0A66C2] focus:ring-[#0A66C2] bg-transparent"
                  />
                  <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                  <span className="text-sm text-gray-300">Also share to LinkedIn</span>
                </label>
              )}
              
              <button
                onClick={handleCreatePost}
                disabled={!formData.title.trim() || !formData.content.trim() || uploading}
                className="w-full py-2.5 bg-gradient-to-r from-marlion-primary to-marlion-accent text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {shareToLinkedIn ? 'Post & Share' : 'Post'}
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

// Post Card Component with Thread Support
interface ThreadedComment extends Comment {
  replies: Comment[];
}

function PostCard({
  post,
  userId,
  onLike,
  onCommentLike,
  onToggleComments,
  comments,
  showComments,
  newComment,
  setNewComment,
  onComment,
  formatDate,
  extractYouTubeId,
  replyingTo,
  setReplyingTo
}: {
  post: CommunityPost;
  userId: string;
  onLike: (id: string, likes: string[]) => void;
  onCommentLike: (id: string, likes: string[]) => void;
  onToggleComments: (id: string) => void;
  comments: ThreadedComment[];
  showComments: boolean;
  newComment: string;
  setNewComment: (val: string) => void;
  onComment: (postId: string) => void;
  formatDate: (timestamp: any) => string;
  extractYouTubeId: (url: string) => string | null;
  replyingTo: {id: string, name: string} | null;
  setReplyingTo: (val: {id: string, name: string} | null) => void;
}) {
  const typeConfig = POST_TYPES[post.type as keyof typeof POST_TYPES] || POST_TYPES.announcement;
  const Icon = typeConfig.icon;
  const isLiked = post.likes?.includes(userId);

  return (
    <div className={`bg-marlion-card border rounded-xl md:rounded-2xl overflow-hidden ${post.isPinned ? 'ring-2 ring-yellow-500/50' : 'border-white/10'}`}>
      {/* Header */}
      <div className={`px-4 md:px-6 py-3 md:py-4 border-b border-white/5 ${typeConfig.bg}`}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl bg-gradient-to-r ${typeConfig.gradient}`}>
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs md:text-sm font-medium text-white truncate">{typeConfig.label}</span>
              {post.authorType === 'admin' && (
                <span className="text-xs bg-marlion-primary/20 text-marlion-primary px-1.5 md:px-2 py-0.5 rounded-full">
                  Official
                </span>
              )}
              {post.isPinned && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 md:px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 md:w-3 md:h-3" /> Pinned
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" /> {formatDate(post.createdAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <div className="flex items-start gap-3 md:gap-4">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r ${typeConfig.gradient} flex items-center justify-center text-white font-bold shrink-0 text-sm md:text-base`}>
            {post.authorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm md:text-base">{post.authorName}</p>
            <h3 className="text-base md:text-lg font-bold text-white mt-1 md:mt-2">{post.title}</h3>
            <p className="text-gray-300 mt-1 md:mt-2 whitespace-pre-wrap text-sm md:text-base">{post.content}</p>

            {/* Featured Student */}
            {post.featuredStudentName && (
              <div className="mt-3 md:mt-4 p-3 md:p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg md:rounded-xl border border-yellow-500/20">
                <p className="text-xs md:text-sm text-yellow-400 flex items-center gap-2">
                  <Award className="w-3 h-3 md:w-4 md:h-4" />
                  Featuring: <span className="font-semibold text-white">{post.featuredStudentName}</span>
                </p>
              </div>
            )}

            {/* Media */}
            {post.mediaUrl && (
              <div className="mt-3 md:mt-4 rounded-lg md:rounded-xl overflow-hidden">
                {post.mediaType === 'video' && extractYouTubeId(post.mediaUrl) ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(post.mediaUrl)}`}
                    className="w-full aspect-video rounded-lg md:rounded-xl"
                    allowFullScreen
                  />
                ) : post.mediaType === 'image' ? (
                  <img src={post.mediaUrl} alt="" className="w-full max-h-64 md:max-h-96 object-cover rounded-lg md:rounded-xl" />
                ) : null}
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:gap-2 mt-3 md:mt-4">
                {post.tags.map((tag, i) => (
                  <span key={i} className="px-2 md:px-3 py-0.5 md:py-1 bg-white/5 border border-white/10 rounded-full text-xs md:text-sm text-gray-300">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-t border-white/5 flex items-center gap-4 md:gap-6">
        <button
          onClick={() => onLike(post.id, post.likes || [])}
          className={`flex items-center gap-1.5 md:gap-2 transition-all ${
            isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
          }`}
        >
          <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-sm md:text-base">{post.likes?.length || 0}</span>
        </button>
        <button
          onClick={() => onToggleComments(post.id)}
          className="flex items-center gap-1.5 md:gap-2 text-gray-400 hover:text-marlion-primary transition-all"
        >
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
          <span className="text-sm md:text-base">{post.commentsCount || 0}</span>
          <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${showComments ? 'rotate-180' : ''}`} />
        </button>
        
        {/* LinkedIn Share - Show for spotlight (featured) posts or user's own posts */}
        {(post.type === 'spotlight' && post.featuredStudentId === userId) || 
         (post.authorId === userId && ['work', 'insight'].includes(post.type)) ? (
          <button
            onClick={() => {
              const baseUrl = 'https://internship.marliontech.com';
              if (post.type === 'spotlight') {
                const shareUrl = `${baseUrl}/share/post/${post.id}?name=${encodeURIComponent(post.featuredStudentName || post.authorName)}&stream=${encodeURIComponent(post.stream || '')}&title=${encodeURIComponent(post.title)}`;
                openLinkedInShare({
                  ...generateSpotlightShareContent({
                    studentName: post.featuredStudentName || post.authorName,
                    spotlightTitle: post.title,
                    spotlightContent: post.content
                  }),
                  url: shareUrl
                });
              } else {
                const shareUrl = `${baseUrl}/share/post/${post.id}?name=${encodeURIComponent(post.authorName)}&stream=${encodeURIComponent(post.stream || '')}&title=${encodeURIComponent(post.title)}`;
                openLinkedInShare({
                  ...generateCommunityPostShareContent({
                    postType: post.type as 'work' | 'insight' | 'help',
                    title: post.title,
                    content: post.content,
                    studentName: post.authorName
                  }),
                  url: shareUrl
                });
              }
            }}
            className="flex items-center gap-1.5 md:gap-2 text-gray-400 hover:text-[#0A66C2] transition-all ml-auto"
            title="Share to LinkedIn"
          >
            <Linkedin className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base hidden sm:inline">Share</span>
          </button>
        ) : null}
      </div>

      {/* Comments Section with Threads */}
      {showComments && (
        <div className="px-4 md:px-6 py-4 bg-white/5 border-t border-white/10">
          {/* Comment Input */}
          <div className="mb-4">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-2 text-xs md:text-sm text-marlion-primary">
                <Reply className="w-3 h-3 md:w-4 md:h-4" />
                <span>Replying to {replyingTo.name}</span>
                <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">
                  <X className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2 md:gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Write a comment..."}
                className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-marlion-primary text-sm md:text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newComment.trim()) {
                    onComment(post.id);
                  }
                }}
              />
              <button
                onClick={() => onComment(post.id)}
                disabled={!newComment.trim()}
                className="px-3 md:px-4 py-2 md:py-3 bg-marlion-primary text-white rounded-lg md:rounded-xl hover:bg-marlion-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Threaded Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="space-y-2">
                  {/* Parent Comment */}
                  <CommentItem
                    comment={comment}
                    userId={userId}
                    onLike={onCommentLike}
                    onReply={(id, name) => setReplyingTo({ id, name })}
                    formatDate={formatDate}
                    isReply={false}
                  />
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-6 md:ml-10 pl-3 md:pl-4 border-l-2 border-white/10 space-y-2">
                      {comment.replies.map(reply => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          userId={userId}
                          onLike={onCommentLike}
                          onReply={(id, name) => setReplyingTo({ id: comment.id, name })}
                          formatDate={formatDate}
                          isReply={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4 text-sm md:text-base">No comments yet. Be the first to comment!</p>
          )}
        </div>
      )}
    </div>
  );
}

// Comment Item Component
function CommentItem({
  comment,
  userId,
  onLike,
  onReply,
  formatDate,
  isReply
}: {
  comment: Comment;
  userId: string;
  onLike: (id: string, likes: string[]) => void;
  onReply: (id: string, name: string) => void;
  formatDate: (timestamp: any) => string;
  isReply: boolean;
}) {
  const isLiked = comment.likes?.includes(userId);
  
  return (
    <div className={`flex items-start gap-2 md:gap-3 p-2.5 md:p-3 bg-white/5 rounded-lg md:rounded-xl ${isReply ? 'bg-white/3' : ''}`}>
      <div className={`${isReply ? 'w-6 h-6' : 'w-7 h-7 md:w-8 md:h-8'} rounded-full bg-gradient-to-r from-marlion-primary to-marlion-accent flex items-center justify-center text-white text-xs md:text-sm font-bold shrink-0`}>
        {comment.authorName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-white ${isReply ? 'text-xs md:text-sm' : 'text-sm'}`}>{comment.authorName}</span>
          {comment.authorType === 'admin' && (
            <span className="text-xs bg-marlion-primary/20 text-marlion-primary px-1.5 py-0.5 rounded-full">
              Admin
            </span>
          )}
          {comment.replyToName && (
            <span className="text-xs text-gray-500">
              → {comment.replyToName}
            </span>
          )}
          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
        </div>
        <p className={`text-gray-300 mt-1 ${isReply ? 'text-xs md:text-sm' : 'text-sm'}`}>{comment.content}</p>
        
        {/* Comment Actions */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => onLike(comment.id, comment.likes || [])}
            className={`flex items-center gap-1 text-xs transition-all ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-400'
            }`}
          >
            <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
            <span>{comment.likes?.length || 0}</span>
          </button>
          <button
            onClick={() => onReply(comment.id, comment.authorName)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-marlion-primary transition-all"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}
