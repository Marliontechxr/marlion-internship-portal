'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@marlion/config/firebase';
import { 
  Save, 
  Video, 
  Youtube,
  CheckCircle,
  AlertCircle,
  Settings,
  Play
} from 'lucide-react';

interface HomepageVideos {
  ceoMessage: string;
  fullStackDev: string;
  arVrDev: string;
  aiMlDev: string;
  mobileDev: string;
}

export default function SettingsPage() {
  const [videos, setVideos] = useState<HomepageVideos>({
    ceoMessage: '',
    fullStackDev: '',
    arVrDev: '',
    aiMlDev: '',
    mobileDev: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const docRef = doc(db, 'settings', 'homepageVideos');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setVideos(docSnap.data() as HomepageVideos);
      }
    } catch (err) {
      console.error('Error loading videos:', err);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const docRef = doc(db, 'settings', 'homepageVideos');
      await setDoc(docRef, {
        ...videos,
        updatedAt: serverTimestamp()
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save videos');
    } finally {
      setSaving(false);
    }
  };

  const videoFields = [
    { key: 'ceoMessage', label: 'CEO Message Video', description: 'Welcome message from the CEO shown in hero section' },
    { key: 'arVrDev', label: 'AR/VR Development', description: 'Stream explainer video for AR/VR Development' },
    { key: 'fullStackDev', label: 'Full-Stack Development', description: 'Stream explainer video for Full-Stack Development' },
    { key: 'aiMlDev', label: 'Agentic AI', description: 'Stream explainer video for Agentic AI Development' },
    { key: 'mobileDev', label: 'Data Science', description: 'Stream explainer video for Data Science & ML' }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 rounded-xl">
          <Settings className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage Settings</h1>
          <p className="text-gray-600">Manage videos displayed on the student homepage</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-700">Videos saved successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <Youtube className="w-6 h-6 text-red-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">YouTube Video URLs</h2>
              <p className="text-sm text-gray-600">Paste YouTube video URLs or video IDs for each section</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {videoFields.map((field) => {
            const videoId = extractYouTubeId(videos[field.key as keyof HomepageVideos]);
            
            return (
              <div key={field.key} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    {field.label}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={videos[field.key as keyof HomepageVideos]}
                        onChange={(e) => setVideos(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder="https://youtube.com/watch?v=... or video ID"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                    {videoId && (
                      <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Valid YouTube ID: {videoId}
                      </p>
                    )}
                  </div>
                  
                  {videoId && (
                    <div className="w-48 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative group">
                      <img 
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        alt={field.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={`https://youtube.com/watch?v=${videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white rounded-full"
                        >
                          <Play className="w-5 h-5 text-gray-900" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Videos
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="font-medium text-amber-900 mb-2">💡 Tips</h3>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• You can paste full YouTube URLs or just the video ID</li>
          <li>• Changes will reflect on the student homepage immediately</li>
          <li>• Make sure videos are public or unlisted (not private)</li>
          <li>• Recommended video length: 2-5 minutes for stream explainers</li>
        </ul>
      </div>
    </div>
  );
}
