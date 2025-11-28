// Feedback Summarizer
// AI-powered summarization of student feedback and work
// Uses DigitalOcean Gradient AI (Llama 3.3 70B)

import { getAIClient } from './client';

export interface DailyLogSummary {
  summary: string;
  keyAccomplishments: string[];
  challenges: string[];
  skillsUsed: string[];
  progressIndicator: 'excellent' | 'good' | 'satisfactory' | 'needs_attention';
}

export interface ProposalEvaluation {
  summary: string;
  feasibilityScore: number;
  innovationScore: number;
  technicalDepthScore: number;
  overallScore: number;
  strengths: string[];
  suggestions: string[];
  verdict: 'approved' | 'revision_needed' | 'rejected';
}

export async function summarizeDailyLogs(
  logs: { date: string; description: string }[]
): Promise<DailyLogSummary> {
  const logsText = logs.map((l) => `${l.date}: ${l.description}`).join('\n');

  const client = getAIClient();
  const result = await client.chatCompletionJSON<DailyLogSummary>({
    messages: [
      {
        role: 'system',
        content: `Summarize the intern's daily logs. Return JSON:
{
  "summary": "2-3 sentence overview",
  "keyAccomplishments": ["accomplishment1", "accomplishment2"],
  "challenges": ["challenge1"],
  "skillsUsed": ["skill1", "skill2"],
  "progressIndicator": "excellent|good|satisfactory|needs_attention"
}`,
      },
      { role: 'user', content: logsText },
    ],
    max_tokens: 400,
  });

  return result;
}

export async function evaluateProposal(
  proposal: { title: string; description: string; objectives: string[] },
  stream: string
): Promise<ProposalEvaluation> {
  const client = getAIClient();
  const result = await client.chatCompletionJSON<ProposalEvaluation>({
    messages: [
      {
        role: 'system',
        content: `Evaluate this ${stream} project proposal. Return JSON:
{
  "summary": "brief summary",
  "feasibilityScore": 0-100,
  "innovationScore": 0-100,
  "technicalDepthScore": 0-100,
  "overallScore": 0-100,
  "strengths": ["strength1"],
  "suggestions": ["suggestion1"],
  "verdict": "approved|revision_needed|rejected"
}`,
      },
      {
        role: 'user',
        content: `Title: ${proposal.title}\n\nDescription: ${proposal.description}\n\nObjectives:\n${proposal.objectives.join('\n')}`,
      },
    ],
    max_tokens: 500,
  });

  return result;
}

export async function generateCertificateSummary(
  studentName: string,
  stream: string,
  projectTitle: string,
  accomplishments: string[]
): Promise<string> {
  const client = getAIClient();
  const response = await client.chatCompletion({
    messages: [
      {
        role: 'system',
        content: `Write a professional certificate summary (2-3 sentences) for an internship completion certificate. Be formal but warm.`,
      },
      {
        role: 'user',
        content: `Student: ${studentName}\nStream: ${stream}\nProject: ${projectTitle}\nAccomplishments: ${accomplishments.join(', ')}`,
      },
    ],
    max_tokens: 150,
  });

  return response.choices[0]?.message?.content || '';
}
