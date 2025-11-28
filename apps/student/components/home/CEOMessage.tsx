'use client';

import { Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@marlion/config/firebase';

export function CEOMessage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  useEffect(() => {
    loadVideoFromCMS();
  }, []);

  const loadVideoFromCMS = async () => {
    try {
      const docRef = doc(db, 'settings', 'homepageVideos');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.ceoMessage) {
          const id = extractYouTubeId(data.ceoMessage);
          if (id) setVideoId(id);
        }
      }
    } catch (err) {
      console.error('Error loading CEO video:', err);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
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

  // Don't render if no video is set or error occurred
  if (isLoading) {
    return (
      <section id="about" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-[21/9] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-marlion-primary/30 border-t-marlion-primary rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-500 text-sm">Loading video...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!videoId || loadError) {
    return null; // Hide section if no video configured or error
  }
  
  return (
    <section id="about" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Video Container */}
        <div className="relative group cursor-pointer" onClick={() => setIsPlaying(true)}>
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-marlion-primary to-marlion-accent rounded-2xl opacity-30 blur-lg group-hover:opacity-60 transition-opacity duration-500"></div>
          
          {/* Video Player or Placeholder */}
          <div className="relative aspect-[21/9] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            {isPlaying ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="CEO Message"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                {/* Background with thumbnail - use cache busting */}
                <div className="absolute inset-0">
                  <img 
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg?t=${Date.now()}`}
                    alt="CEO Message"
                    className="w-full h-full object-cover opacity-40"
                    key={videoId}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/50 to-slate-950/80"></div>
                </div>
                
                {/* Play button */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="white" />
                  </div>
                  <p className="mt-6 text-slate-400 font-medium tracking-widest text-sm uppercase">Message from the CEO</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
