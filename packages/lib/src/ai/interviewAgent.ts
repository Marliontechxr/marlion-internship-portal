// AI Interview Agent
// Conducts dynamic, adaptive AI interviews for student evaluation
// Uses DigitalOcean Gradient AI (Llama 3.3 70B)

import { getAIClient, type ChatMessage } from './client';

export interface InterviewQuestion {
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'motivation' | 'empathy' | 'grit';
  followUp?: string;
}

export interface InterviewResponse {
  questionId: number;
  question: string;
  answer: string;
  timestamp: Date;
}

export interface InterviewScores {
  curiosity: number;
  empathy: number;
  grit: number;
  thinking: number;
}

export interface InterviewEvaluation {
  candidate_name: string;
  stream: string;
  scores: InterviewScores;
  overallScore: number;
  technical_depth: 'High' | 'Medium' | 'Low';
  empathy_score: 'High' | 'Medium' | 'Low';
  culture_fit: 'Strong' | 'Good' | 'Moderate' | 'Weak';
  key_observation: string;
  standout_moment?: string;
  concern?: string;
  recommendation: 'Strong Hire' | 'Hire' | 'Maybe' | 'Pass';
  summary: string;
}

// Stream-specific context for dynamic question generation
const STREAM_CONTEXTS: Record<string, {
  displayName: string;
  challengeAreas: string[];
  curiosityProbes: string[];
}> = {
  'ar-vr': {
    displayName: 'Immersive Tech (AR/VR)',
    challengeAreas: ['sensory adaptation', 'body tracking without VR headsets', 'ESP32 sensor integration', 'low-end hardware optimization'],
    curiosityProbes: ['What makes you curious about how kids with sensory differences experience virtual worlds?']
  },
  'agentic-ai': {
    displayName: 'Agentic AI',
    challengeAreas: ['hallucination prevention in healthcare', 'multi-agent consensus', 'privacy-preserving AI', 'medical-to-layman translation'],
    curiosityProbes: ['What intrigues you about AI systems that can reason and collaborate like humans?']
  },
  'data-science': {
    displayName: 'Data Science',
    challengeAreas: ['behavior prediction from sensors', 'explainable AI for parents', 'personalization with small data', 'edge ML deployment'],
    curiosityProbes: ['What draws you to making data meaningful for non-technical people like parents?']
  },
  'fullstack': {
    displayName: 'Full Stack Development',
    challengeAreas: ['multi-user-type UX', 'offline-first architecture', 'real-time sync', 'accessibility for non-verbal users'],
    curiosityProbes: ['What fascinates you about building apps for users who interact with technology completely differently?']
  }
};

export function getStreamDisplayName(stream: string): string {
  return STREAM_CONTEXTS[stream]?.displayName || 'Full Stack Development';
}

export function getStreamChallengeAreas(stream: string): string[] {
  return STREAM_CONTEXTS[stream]?.challengeAreas || STREAM_CONTEXTS['fullstack'].challengeAreas;
}

export async function generateFollowUpQuestion(
  previousAnswer: string,
  context: { stream: string; questionCategory: string; conversationHistory?: Array<{role: string; content: string}> }
): Promise<string> {
  const client = getAIClient();
  const streamContext = STREAM_CONTEXTS[context.stream] || STREAM_CONTEXTS['fullstack'];
  
  const response = await client.chatCompletion({
    messages: [
      {
        role: 'system',
        content: `You are Marlion, conducting a ${streamContext.displayName} internship interview. 
Generate ONE brief, pointed follow-up question based on the candidate's answer. 
Be conversational and curious, not interrogative. 
If they were generic, push for specifics. If they showed insight, go deeper.
Keep it under 30 words.`,
      },
      {
        role: 'user',
        content: `The candidate answered: "${previousAnswer}"\n\nGenerate a relevant follow-up question.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 60,
  });

  return response.choices[0]?.message?.content || "Can you walk me through that in more detail?";
}

export async function evaluateInterview(
  responses: InterviewResponse[],
  stream: string,
  candidateName: string = 'Candidate'
): Promise<InterviewEvaluation> {
  const transcript = responses.map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.answer}`).join('\n\n');
  const streamContext = STREAM_CONTEXTS[stream] || STREAM_CONTEXTS['fullstack'];

  const client = getAIClient();
  const result = await client.chatCompletionJSON<InterviewEvaluation>({
    messages: [
      {
        role: 'system',
        content: `You are evaluating an internship interview for the ${streamContext.displayName} track at Marlion Technologies.
        
We build assistive tech for neurodiverse children. We need curious, empathetic problem-solvers who thrive on hard challenges.

Score each dimension 0-25:
- Curiosity: Did they ask questions? Show genuine interest?
- Empathy: Did they think about the child/parent/therapist?
- Grit: Ready for hard work? Honest about challenges?
- Thinking: First principles reasoning? Handle ambiguity?

Return JSON:
{
  "candidate_name": "${candidateName}",
  "stream": "${streamContext.displayName}",
  "scores": { "curiosity": 0-25, "empathy": 0-25, "grit": 0-25, "thinking": 0-25 },
  "overallScore": sum of above (0-100),
  "technical_depth": "High/Medium/Low",
  "empathy_score": "High/Medium/Low",
  "culture_fit": "Strong/Good/Moderate/Weak",
  "key_observation": "Quote one memorable thing they said",
  "standout_moment": "Their best moment",
  "concern": "Biggest concern or 'None'",
  "recommendation": "Strong Hire/Hire/Maybe/Pass",
  "summary": "2 sentences: Would you want them on your team?"
}`,
      },
      {
        role: 'user',
        content: `Interview Transcript:\n\n${transcript}`,
      },
    ],
    max_tokens: 600,
  });

  return result;
}
