// Bootcamp Helper Agent
// AI assistant for course content and learning support
// Uses DigitalOcean Gradient AI (Llama 3.3 70B)

import { getAIClient, type ChatMessage } from './client';

export interface CourseContext {
  moduleTitle: string;
  moduleSummary: string;
  currentTopic: string;
  studentProgress: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function generateModuleSummary(
  videoTitle: string,
  videoTranscript: string
): Promise<string> {
  const client = getAIClient();
  const response = await client.chatCompletion({
    messages: [
      {
        role: 'system',
        content: `You are creating educational summaries for a tech internship bootcamp. Create a clear, structured summary that highlights key concepts, uses bullet points, includes practical examples, and is suitable for undergraduate students. Keep it concise (300-500 words).`,
      },
      {
        role: 'user',
        content: `Create a summary for this module:\n\nTitle: ${videoTitle}\n\nContent: ${videoTranscript}`,
      },
    ],
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content || '';
}

export async function answerQuestion(
  question: string,
  context: CourseContext,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const client = getAIClient();
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a helpful AI tutor for the Marlion Technologies internship bootcamp.

Current Module: ${context.moduleTitle}
Topic: ${context.currentTopic}
Module Summary: ${context.moduleSummary}

Guidelines:
- Give clear, educational explanations
- Use examples relevant to the module content
- Encourage critical thinking
- Keep responses focused and helpful
- Use code examples when relevant

IMPORTANT: Guide students to understand concepts, don't just give answers.`,
    },
    ...conversationHistory.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: question },
  ];

  const response = await client.chatCompletion({
    messages,
    max_tokens: 600,
  });

  return response.choices[0]?.message?.content || "I'm not sure about that. Could you rephrase your question?";
}

export async function generateQuiz(
  moduleTitle: string,
  moduleSummary: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  questionCount: number = 5
): Promise<QuizQuestion[]> {
  const client = getAIClient();
  const result = await client.chatCompletionJSON<{ questions: QuizQuestion[] }>({
    messages: [
      {
        role: 'system',
        content: `Generate a ${questionCount}-question ${difficulty} quiz for the module. Return a JSON array with questions in this format:
{
  "questions": [
    { "id": "unique-id", "question": "Question text", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "Why this is correct", "difficulty": "${difficulty}" }
  ]
}`,
      },
      {
        role: 'user',
        content: `Module: ${moduleTitle}\n\nContent Summary: ${moduleSummary}`,
      },
    ],
    max_tokens: 1500,
  });

  return result.questions || [];
}
