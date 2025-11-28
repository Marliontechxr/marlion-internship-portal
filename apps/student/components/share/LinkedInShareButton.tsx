'use client';

import { useState } from 'react';
import { Linkedin, Share2, Check, Copy, ExternalLink } from 'lucide-react';

interface LinkedInShareButtonProps {
  type: 'certificate' | 'portfolio' | 'community';
  studentName: string;
  stream?: string;
  title?: string;
  subtitle?: string;
  rating?: string;
  postId?: string;
  verificationId?: string;
  variant?: 'button' | 'icon' | 'card';
  className?: string;
}

export function LinkedInShareButton({
  type,
  studentName,
  stream = '',
  title = '',
  subtitle = '',
  rating = '',
  postId = '',
  verificationId = '',
  variant = 'button',
  className = '',
}: LinkedInShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://internship.marliontech.com';

  // Generate the shareable URL based on type
  const getShareUrl = () => {
    const params = new URLSearchParams({
      name: studentName,
      stream: stream,
    });

    switch (type) {
      case 'certificate':
        return `${baseUrl}/share/certificate/${verificationId}?${params}`;
      case 'portfolio':
        return `${baseUrl}/share/portfolio/${verificationId}?${params}`;
      case 'community':
        return `${baseUrl}/share/post/${postId}?${params}`;
      default:
        return baseUrl;
    }
  };

  // Generate pre-composed LinkedIn share text
  const getShareText = () => {
    switch (type) {
      case 'certificate':
        return `🎓 I'm thrilled to announce that I have successfully completed my ${stream} internship at Marlion Technologies!

During this journey, I worked on innovative solutions for neurodiverse children, developing real-world skills while making a meaningful impact.

A huge thank you to the Marlion team for this incredible opportunity!

#MarlionTechnologies #Internship #${stream.replace(/[^a-zA-Z]/g, '')} #TechForGood #NeurodiverseInclusion #CareerGrowth`;

      case 'portfolio':
        return `🚀 Check out my internship portfolio from Marlion Technologies!

As a ${stream} intern, I had the opportunity to work on groundbreaking projects focused on building technology for neurodiverse children.

${title ? `Featured Project: ${title}` : ''}
${rating ? `⭐ Average Rating: ${rating}/5` : ''}

Explore my journey and the impact we created together!

#Portfolio #${stream.replace(/[^a-zA-Z]/g, '')} #MarlionTechnologies #TechInternship #Innovation`;

      case 'community':
        return `${title || "Excited to share my experience at Marlion Technologies!"}

${subtitle || ''}

Working on technology solutions for neurodiverse children has been an incredible learning experience.

#MarlionTechnologies #TechCommunity #${stream.replace(/[^a-zA-Z]/g, '')}`;

      default:
        return '';
    }
  };

  const shareUrl = getShareUrl();
  const shareText = getShareText();

  // LinkedIn share URL with pre-filled content
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const handleShare = () => {
    window.open(linkedInShareUrl, '_blank', 'width=600,height=600');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        className={`p-2 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white transition-colors ${className}`}
        title="Share on LinkedIn"
      >
        <Linkedin className="w-5 h-5" />
      </button>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-slate-800 rounded-xl p-6 border border-slate-700 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#0A66C2] rounded-lg">
            <Linkedin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Share on LinkedIn</h3>
            <p className="text-sm text-slate-400">Boost your professional profile</p>
          </div>
        </div>

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full text-left text-sm text-indigo-400 hover:text-indigo-300 mb-4"
        >
          {showPreview ? '▼ Hide preview' : '▶ Show post preview'}
        </button>

        {showPreview && (
          <div className="bg-slate-900 rounded-lg p-4 mb-4 border border-slate-700">
            <p className="text-sm text-slate-300 whitespace-pre-line">{shareText}</p>
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500">Link preview:</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  M
                </div>
                <div>
                  <p className="text-xs text-white">{type === 'certificate' ? 'Certificate' : type === 'portfolio' ? 'Portfolio' : 'Post'} - {studentName}</p>
                  <p className="text-xs text-slate-500">internship.marliontech.com</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg font-medium transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            Share Now
          </button>
          <button
            onClick={handleCopyText}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            title="Copy post text"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Your post will include a rich preview with your {type} details
        </p>
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg font-medium transition-colors ${className}`}
    >
      <Linkedin className="w-4 h-4" />
      Share on LinkedIn
    </button>
  );
}

// Compact share menu for multiple platforms
export function ShareMenu({
  type,
  studentName,
  stream = '',
  title = '',
  verificationId = '',
  postId = '',
}: {
  type: 'certificate' | 'portfolio' | 'community';
  studentName: string;
  stream?: string;
  title?: string;
  verificationId?: string;
  postId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://internship.marliontech.com';

  const getShareUrl = () => {
    switch (type) {
      case 'certificate':
        return `${baseUrl}/share/certificate/${verificationId}`;
      case 'portfolio':
        return `${baseUrl}/share/portfolio/${verificationId}`;
      case 'community':
        return `${baseUrl}/share/post/${postId}`;
      default:
        return baseUrl;
    }
  };

  const shareUrl = getShareUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 overflow-hidden">
            <div className="p-2">
              <button
                onClick={() => {
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                    '_blank',
                    'width=600,height=600'
                  );
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                  <Linkedin className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-sm">Share on LinkedIn</span>
              </button>

              <button
                onClick={() => {
                  window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out my ${type} from Marlion Technologies!`)}`,
                    '_blank',
                    'width=600,height=400'
                  );
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-white text-sm">Share on X</span>
              </button>

              <div className="my-2 border-t border-slate-700" />

              <button
                onClick={() => {
                  handleCopy();
                  setTimeout(() => setIsOpen(false), 1500);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-white text-sm">
                  {copied ? 'Copied!' : 'Copy link'}
                </span>
              </button>

              <button
                onClick={() => {
                  window.open(shareUrl, '_blank');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-sm">Open preview</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
