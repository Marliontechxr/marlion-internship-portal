// LinkedIn Sharing Utilities for Marlion Internship Portal

const MARLION_LINKEDIN_PAGE = 'https://www.linkedin.com/company/marliontech';
const MARLION_WEBSITE = process.env.NEXT_PUBLIC_APP_URL || 'https://internship.marliontech.com';

/**
 * Generate a shareable page URL
 */
export function getShareablePageUrl(type: 'portfolio' | 'certificate' | 'spotlight' | 'community' | 'task', id: string): string {
  return `${MARLION_WEBSITE}/share/${type}/${id}`;
}

export interface LinkedInShareConfig {
  title: string;
  text: string;
  url?: string;
  hashtags?: string[];
}

/**
 * Generate LinkedIn share URL
 */
export function generateLinkedInShareUrl(config: LinkedInShareConfig): string {
  const { title, text, url, hashtags = [] } = config;
  
  // LinkedIn uses sharing-url format
  const shareUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
  
  // Combine text with hashtags
  const hashtagString = hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ');
  const fullText = `${text}\n\n${hashtagString}`;
  
  // LinkedIn only accepts URL parameter
  const targetUrl = url || MARLION_WEBSITE;
  shareUrl.searchParams.set('url', targetUrl);
  
  return shareUrl.toString();
}

/**
 * Generate share content for community spotlight feature
 */
export function generateSpotlightShareContent(params: {
  studentName: string;
  spotlightTitle: string;
  spotlightContent: string;
}): LinkedInShareConfig {
  const { studentName, spotlightTitle, spotlightContent } = params;
  
  return {
    title: `Featured at Marlion Internship! 🌟`,
    text: `I'm honored to be featured in the Marlion Internship Program spotlight!\n\n"${spotlightTitle}"\n\n${spotlightContent.slice(0, 200)}${spotlightContent.length > 200 ? '...' : ''}\n\nGrateful for this opportunity to work on impactful solutions for neurodiverse children.\n\n@Marlion Technologies`,
    url: MARLION_WEBSITE,
    hashtags: ['MarlionInternship', 'Neurodiversity', 'TechForGood', 'InternshipExperience']
  };
}

/**
 * Generate share content for community posts
 */
export function generateCommunityPostShareContent(params: {
  postType: 'work' | 'insight' | 'help';
  title: string;
  content: string;
  studentName: string;
}): LinkedInShareConfig {
  const { postType, title, content, studentName } = params;
  
  const typeEmoji = {
    work: '🚀',
    insight: '💡',
    help: '🤝'
  };
  
  const typeLabel = {
    work: 'Sharing my work',
    insight: 'Sharing an insight',
    help: 'Collaborating on'
  };
  
  return {
    title: `${typeEmoji[postType]} ${typeLabel[postType]} at Marlion Internship`,
    text: `${typeEmoji[postType]} ${typeLabel[postType]} from my internship journey at Marlion!\n\n"${title}"\n\n${content.slice(0, 150)}${content.length > 150 ? '...' : ''}\n\nWorking on innovative solutions to support neurodiverse children through technology.\n\n@Marlion Technologies`,
    url: MARLION_WEBSITE,
    hashtags: ['MarlionInternship', 'TechForGood', 'Neurodiversity', 'LearningJourney']
  };
}

/**
 * Generate share content for completed task with star rating
 */
export function generateTaskCompletionShareContent(params: {
  taskTitle: string;
  projectTitle: string;
  rating: number;
  studentName: string;
}): LinkedInShareConfig {
  const { taskTitle, projectTitle, rating, studentName } = params;
  
  const ratingStars = '⭐'.repeat(rating);
  const ratingLabel = rating >= 4 ? 'Excellence' : rating >= 3 ? 'Great work' : 'Milestone achieved';
  
  return {
    title: `${ratingStars} ${ratingLabel} at Marlion Internship!`,
    text: `Completed a key milestone in my internship project at Marlion! ${ratingStars}\n\n📋 Task: "${taskTitle}"\n🎯 Project: "${projectTitle}"\n⭐ Rating: ${rating}/5 stars\n\nWorking on impactful technology solutions for neurodiverse children.\n\n@Marlion Technologies`,
    url: MARLION_WEBSITE,
    hashtags: ['MarlionInternship', 'TechForGood', 'Achievement', 'Neurodiversity', 'InternshipMilestone']
  };
}

/**
 * Generate share content for portfolio
 */
export function generatePortfolioShareContent(params: {
  studentName: string;
  stream: string;
  projectTitle: string;
  projectDescription: string;
  overallRating: number;
  portfolioUrl: string;
  adminFeedback?: string;
}): LinkedInShareConfig {
  const { studentName, stream, projectTitle, projectDescription, overallRating, portfolioUrl, adminFeedback } = params;
  
  const streamLabels: Record<string, string> = {
    'ar-vr': 'AR/VR Development',
    'fullstack': 'Full Stack Development',
    'agentic-ai': 'Agentic AI',
    'data-science': 'Data Science'
  };
  
  const ratingStars = '⭐'.repeat(Math.round(overallRating));
  
  return {
    title: `🎓 Completed Internship at Marlion Technologies!`,
    text: `Excited to share my internship portfolio from Marlion Technologies! 🚀\n\n🎯 Stream: ${streamLabels[stream] || stream}\n📋 Project: "${projectTitle}"\n⭐ Rating: ${ratingStars}\n\n${projectDescription.slice(0, 100)}${projectDescription.length > 100 ? '...' : ''}\n\n${adminFeedback ? `Mentor Feedback: "${adminFeedback.slice(0, 80)}${adminFeedback.length > 80 ? '...' : ''}"` : ''}\n\nGrateful for the opportunity to build impactful solutions for neurodiverse children!\n\nView my full portfolio: ${portfolioUrl}\n\n@Marlion Technologies`,
    url: portfolioUrl,
    hashtags: ['MarlionInternship', 'Portfolio', 'TechForGood', 'Neurodiversity', 'InternshipCompleted', 'CareerMilestone']
  };
}

/**
 * Generate share content for certificate
 */
export function generateCertificateShareContent(params: {
  studentName: string;
  stream: string;
  certificateUrl: string;
}): LinkedInShareConfig {
  const { studentName, stream, certificateUrl } = params;
  
  const streamLabels: Record<string, string> = {
    'ar-vr': 'AR/VR Development',
    'fullstack': 'Full Stack Development',
    'agentic-ai': 'Agentic AI',
    'data-science': 'Data Science'
  };
  
  return {
    title: `🎓 Certificate of Completion - Marlion Internship`,
    text: `Thrilled to have completed my internship at Marlion Technologies! 🎉\n\n🎓 Certificate of Completion\n📚 Stream: ${streamLabels[stream] || stream}\n🏢 Organization: Marlion Technologies\n\nThis internship focused on building innovative technology solutions to support neurodiverse children. An incredible learning journey!\n\nVerify my certificate: ${certificateUrl}\n\n@Marlion Technologies`,
    url: certificateUrl,
    hashtags: ['MarlionInternship', 'Certification', 'TechForGood', 'Neurodiversity', 'CareerGrowth', 'InternshipCompleted']
  };
}

/**
 * Open LinkedIn share dialog with pre-composed text
 * LinkedIn doesn't support pre-filling text via URL, but we can use the Web Share API
 * as a fallback and copy to clipboard for manual pasting
 */
export function openLinkedInShare(config: LinkedInShareConfig): void {
  const url = generateLinkedInShareUrl(config);
  
  // Open LinkedIn share dialog
  const shareWindow = window.open(url, 'linkedin-share', 'width=600,height=700,scrollbars=yes');
  
  // Also copy the share text to clipboard for easy pasting
  const hashtagString = config.hashtags?.map(h => `#${h.replace(/^#/, '')}`).join(' ') || '';
  const fullText = `${config.text}\n\n${hashtagString}`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(fullText).then(() => {
      // Show a toast or notification that text was copied
      console.log('Share text copied to clipboard');
    }).catch(() => {
      console.log('Could not copy to clipboard');
    });
  }
}

/**
 * Open LinkedIn share with native share dialog (mobile-friendly)
 */
export async function shareToLinkedIn(config: LinkedInShareConfig): Promise<boolean> {
  const hashtagString = config.hashtags?.map(h => `#${h.replace(/^#/, '')}`).join(' ') || '';
  const fullText = `${config.text}\n\n${hashtagString}`;
  
  // Try native share first (works on mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: config.title,
        text: fullText,
        url: config.url
      });
      return true;
    } catch (err) {
      // User cancelled or share failed, fall back to LinkedIn URL
    }
  }
  
  // Fall back to LinkedIn URL share
  openLinkedInShare(config);
  return true;
}

/**
 * Generate share content with shareable page URL for task completion
 */
export function generateTaskShareWithPage(params: {
  taskId: string;
  taskTitle: string;
  projectTitle: string;
  rating: number;
  studentName: string;
}): LinkedInShareConfig {
  const shareUrl = getShareablePageUrl('task', params.taskId);
  const content = generateTaskCompletionShareContent(params);
  return {
    ...content,
    url: shareUrl
  };
}

/**
 * Generate share content with shareable page URL for portfolio
 */
export function generatePortfolioShareWithPage(params: {
  portfolioId: string;
  studentName: string;
  stream: string;
  projectTitle: string;
  projectDescription: string;
  overallRating: number;
  adminFeedback?: string;
}): LinkedInShareConfig {
  const shareUrl = getShareablePageUrl('portfolio', params.portfolioId);
  return generatePortfolioShareContent({
    ...params,
    portfolioUrl: shareUrl
  });
}

/**
 * Generate share content with shareable page URL for certificate
 */
export function generateCertificateShareWithPage(params: {
  certificateId: string;
  studentName: string;
  stream: string;
}): LinkedInShareConfig {
  const shareUrl = getShareablePageUrl('certificate', params.certificateId);
  return generateCertificateShareContent({
    ...params,
    certificateUrl: shareUrl
  });
}

/**
 * Generate share content with shareable page URL for community post
 */
export function generateCommunityShareWithPage(params: {
  postId: string;
  postType: 'work' | 'insight' | 'help';
  title: string;
  content: string;
  studentName: string;
}): LinkedInShareConfig {
  const shareUrl = getShareablePageUrl('community', params.postId);
  const content = generateCommunityPostShareContent(params);
  return {
    ...content,
    url: shareUrl
  };
}

/**
 * Generate share content with shareable page URL for spotlight
 */
export function generateSpotlightShareWithPage(params: {
  spotlightId: string;
  studentName: string;
  spotlightTitle: string;
  spotlightContent: string;
}): LinkedInShareConfig {
  const shareUrl = getShareablePageUrl('spotlight', params.spotlightId);
  const content = generateSpotlightShareContent(params);
  return {
    ...content,
    url: shareUrl
  };
}
