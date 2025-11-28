// Anti-Cheat Detection
// Detects copy-paste and AI-generated content
// Uses DigitalOcean Gradient AI (Llama 3.3 70B)

import { getAIClient } from './client';

export interface TypingPattern {
  keystrokes: number;
  pauses: number[];
  averageSpeed: number;
  burstTyping: boolean;
  deleteRatio: number;
}

export interface CheatDetectionResult {
  isLikelyCheat: boolean;
  confidence: number;
  flags: string[];
  recommendation: 'allow' | 'warn' | 'review' | 'ban';
}

export function analyzeTypingPattern(pattern: TypingPattern): CheatDetectionResult {
  const flags: string[] = [];
  let suspicionScore = 0;

  // Check for paste-like behavior (sudden burst of text with no pauses)
  if (pattern.burstTyping && pattern.pauses.length < 3) {
    flags.push('Possible paste detected - sudden text burst');
    suspicionScore += 40;
  }

  // Check for unnaturally fast typing (>150 WPM sustained)
  if (pattern.averageSpeed > 750) {
    flags.push('Unnaturally fast typing speed');
    suspicionScore += 30;
  }

  // Check for no deletions (humans typically make mistakes)
  if (pattern.deleteRatio < 0.01 && pattern.keystrokes > 100) {
    flags.push('No corrections made - unusual for natural typing');
    suspicionScore += 20;
  }

  // Uniform pause pattern (bots type evenly)
  const pauseVariance = calculateVariance(pattern.pauses);
  if (pauseVariance < 50 && pattern.pauses.length > 5) {
    flags.push('Uniform typing rhythm detected');
    suspicionScore += 25;
  }

  let recommendation: 'allow' | 'warn' | 'review' | 'ban' = 'allow';
  if (suspicionScore >= 70) recommendation = 'ban';
  else if (suspicionScore >= 50) recommendation = 'review';
  else if (suspicionScore >= 30) recommendation = 'warn';

  return {
    isLikelyCheat: suspicionScore >= 50,
    confidence: Math.min(suspicionScore, 100),
    flags,
    recommendation,
  };
}

function calculateVariance(numbers: number[]): number {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  return numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
}

export async function detectAIContent(text: string): Promise<{ isAIGenerated: boolean; confidence: number; analysis: string }> {
  const client = getAIClient();
  const result = await client.chatCompletionJSON<{ isAIGenerated: boolean; confidence: number; analysis: string }>({
    messages: [
      {
        role: 'system',
        content: `Analyze if this text appears to be AI-generated. Consider:
- Writing style consistency
- Unusual vocabulary patterns
- Generic or templated phrases
- Lack of personal anecdotes
Return JSON: { "isAIGenerated": boolean, "confidence": 0-100, "analysis": "brief explanation" }`,
      },
      { role: 'user', content: text },
    ],
    max_tokens: 200,
  });

  return result || { isAIGenerated: false, confidence: 0, analysis: "Unable to analyze" };
}

export const BAN_MESSAGE = `Your access has been suspended.

We detected patterns indicating you may be copy-pasting AI-generated responses rather than engaging authentically with the material.

At Marlion Technologies, we value genuine learning and original thinking. We would rather work with the AI directly than a human who mindlessly copy-pastes AI-generated responses.

If you believe this is an error, you may submit an appeal through the Help section.`;

export async function checkQuizAnswer(
  question: string,
  answer: string,
  typingPattern: TypingPattern
): Promise<CheatDetectionResult> {
  const typingAnalysis = analyzeTypingPattern(typingPattern);
  
  if (answer.length > 100) {
    const aiAnalysis = await detectAIContent(answer);
    if (aiAnalysis.isAIGenerated && aiAnalysis.confidence > 70) {
      typingAnalysis.flags.push(`AI-generated content detected (${aiAnalysis.confidence}% confidence)`);
      typingAnalysis.confidence = Math.max(typingAnalysis.confidence, aiAnalysis.confidence);
      typingAnalysis.isLikelyCheat = true;
      if (aiAnalysis.confidence > 85) {
        typingAnalysis.recommendation = 'ban';
      } else {
        typingAnalysis.recommendation = 'review';
      }
    }
  }

  return typingAnalysis;
}
