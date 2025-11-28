'use client';

import { useState, useEffect } from 'react';
import { Brain, Globe, Smartphone, Cpu, ChevronDown, Play } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@marlion/config/firebase';

const streams = [
  {
    id: 'ar-vr',
    title: 'AR/VR Development',
    icon: 'fa-vr-cardboard',
    videoKey: 'arVrDev',
    description: 'Master Unity, Unreal Engine, and WebXR to build immersive, therapeutic learning environments for children with special needs.',
    skills: ['Unity', 'Unreal Engine', 'WebXR', 'C#', '3D Modeling', 'Spatial Computing'],
    projects: [
      'Therapeutic VR Experience',
      'Immersive Training Simulation',
      'Mixed Reality Classroom',
    ],
  },
  {
    id: 'fullstack',
    title: 'Full-Stack Development',
    icon: 'fa-layer-group',
    videoKey: 'fullStackDev',
    description: 'Build scalable, accessible Progressive Web Apps (PWAs) using React, Node.js, and cloud-native architectures.',
    skills: ['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Cloud'],
    projects: [
      'Progressive Web App',
      'Real-time Dashboard',
      'SaaS Platform',
      'API Development',
    ],
  },
  {
    id: 'agentic-ai',
    title: 'Agentic AI',
    icon: 'fa-robot',
    videoKey: 'aiMlDev',
    description: 'Design and deploy autonomous AI agents capable of creating personalized education plans (IEP) and adapting in real-time.',
    skills: ['Python', 'LangChain', 'RAG', 'LLMs', 'Prompt Engineering', 'Vector DBs'],
    projects: [
      'AI Tutoring Agent',
      'IEP Generator',
      'Adaptive Learning System',
      'Multi-Agent Workflow',
    ],
  },
  {
    id: 'data-science',
    title: 'Data Science',
    icon: 'fa-brain',
    videoKey: 'mobileDev',
    description: 'Leverage Machine Learning to analyze behavioral patterns and create adaptive learning models for neurodiverse interventions.',
    skills: ['Python', 'TensorFlow', 'Pandas', 'Scikit-learn', 'Data Viz', 'ML Ops'],
    projects: [
      'Behavior Analysis Model',
      'Predictive Analytics',
      'Recommendation Engine',
      'Data Pipeline',
    ],
  },
];

interface HomepageVideos {
  ceoMessage?: string;
  fullStackDev?: string;
  arVrDev?: string;
  aiMlDev?: string;
  mobileDev?: string;
}

export function StreamsSection() {
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [videoIds, setVideoIds] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadVideosFromCMS();
  }, []);

  const loadVideosFromCMS = async () => {
    try {
      const docRef = doc(db, 'settings', 'homepageVideos');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as HomepageVideos;
        const ids: Record<string, string> = {};
        
        Object.entries(data).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            const id = extractYouTubeId(value);
            if (id) ids[key] = id;
          }
        });
        
        setVideoIds(ids);
      }
    } catch (err) {
      console.error('Error loading stream videos:', err);
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

  const handleToggleCard = (index: number) => {
    if (!mounted) return;
    
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

    setExpandedCards(prev => {
      const isCurrentlyOpen = !!prev[index];
      const newState = !isCurrentlyOpen;
      const newExpanded: Record<number, boolean> = {};

      if (isDesktop) {
        // Desktop: Dependent behavior (Rows: 0-1, 2-3)
        const partnerIndex = index % 2 === 0 ? index + 1 : index - 1;
        newExpanded[index] = newState;
        if (partnerIndex >= 0 && partnerIndex < streams.length) {
          newExpanded[partnerIndex] = newState;
        }
      } else {
        // Mobile: Independent behavior - preserve other states
        Object.keys(prev).forEach(key => {
          newExpanded[Number(key)] = prev[Number(key)];
        });
        newExpanded[index] = newState;
      }
      return newExpanded;
    });
  };

  return (
    <section id="streams" className="py-32 px-6 relative">
      {/* Background glow */}
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-marlion-accent/10 blur-[120px] rounded-full -z-10"></div>
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">Choose Your Path</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg mb-8">
            A hands-on immersive experience in Madurai focused on <span className="text-white font-semibold">Assistive Tech & IEP</span> for Neurodiverse Children.
          </p>
          
          {/* Theme Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-marlion-primary/10 to-marlion-accent/10 border border-marlion-primary/30 mb-8">
            <span className="text-2xl">🎯</span>
            <div className="text-left">
              <p className="text-xs text-marlion-muted uppercase tracking-wider font-bold">Winter 2025 Theme</p>
              <p className="text-white font-semibold">Assistive Technology for Neurodiverse Children</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {streams.map((stream, index) => {
            const isOpen = !!expandedCards[index];
            const streamVideoId = videoIds[stream.videoKey];
            const isVideoPlaying = playingVideo === stream.id;

            return (
              <div 
                key={stream.id}
                className={`glass-card rounded-2xl overflow-hidden transition-all duration-500 group 
                  ${isOpen ? 'border-marlion-primary shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'hover:border-marlion-primary/50'}`}
              >
                {/* Header */}
                <div 
                  className="p-6 cursor-pointer flex items-center justify-between"
                  onClick={() => handleToggleCard(index)}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 
                      ${isOpen ? 'bg-gradient-to-br from-marlion-primary to-marlion-accent text-white shadow-lg' : 'bg-marlion-bg border border-marlion-border text-marlion-muted group-hover:text-white group-hover:border-marlion-primary/30'}`}>
                      <i className={`fa-solid ${stream.icon} text-2xl`}></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-marlion-primary transition-colors">{stream.title}</h3>
                      <p className="text-xs text-marlion-muted mt-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-marlion-success"></span> Open for Registration
                      </p>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-marlion-primary/20 text-marlion-primary rotate-180' : 'text-marlion-muted bg-marlion-bg border border-marlion-border group-hover:border-marlion-primary/50'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Expanded Content */}
                {isOpen && (
                  <div className="px-6 pb-8 pt-0 animate-fade-in">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-marlion-border to-transparent mb-6"></div>
                    <p className="text-slate-300 leading-relaxed mb-6 text-sm">{stream.description}</p>
                    
                    {/* Skills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {stream.skills.map((skill) => (
                        <span key={skill} className="badge-primary text-[10px]">
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Projects */}
                    <div className="mb-6">
                      <h4 className="font-bold text-white text-sm mb-3">Sample Projects</h4>
                      <ul className="space-y-2">
                        {stream.projects.map((project) => (
                          <li key={project} className="text-sm text-slate-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-marlion-primary"></span>
                            {project}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Video Player - Only show if video is configured */}
                    {streamVideoId && (
                      <div 
                        className="aspect-video bg-black/60 rounded-xl border border-marlion-border flex flex-col items-center justify-center relative overflow-hidden shadow-inner group/video hover:border-marlion-primary/30 transition-colors cursor-pointer"
                        onClick={() => setPlayingVideo(stream.id)}
                      >
                        {isVideoPlaying ? (
                          <iframe
                            className="w-full h-full absolute inset-0"
                            src={`https://www.youtube.com/embed/${streamVideoId}?autoplay=1`}
                            title={`${stream.title} Explainer`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <>
                            <img 
                              src={`https://img.youtube.com/vi/${streamVideoId}/mqdefault.jpg?t=${Date.now()}`}
                              alt={stream.title}
                              className="absolute inset-0 w-full h-full object-cover opacity-50"
                              key={streamVideoId}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm group-hover/video:scale-110 transition-transform duration-500 z-10">
                              <Play className="w-6 h-6 text-white ml-1" />
                            </div>
                            <span className="mt-4 font-mono text-xs tracking-widest text-marlion-primary uppercase font-bold bg-marlion-primary/10 px-3 py-1 rounded border border-marlion-primary/20 z-10">
                              Watch Stream Explainer
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
