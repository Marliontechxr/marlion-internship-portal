import { NextRequest, NextResponse } from 'next/server';

const DO_AI_API_KEY = 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';
const DO_AI_URL = 'https://inference.do-ai.run/v1/chat/completions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { message, question, mode, context, conversationHistory } = await request.json();

    const userMessage = message || question;
    const { moduleTitle, transcript, objectives, currentTimestamp, videoDuration, aiQuestion, moduleSummary } = context || {};
    const progressPercent = videoDuration ? Math.round((currentTimestamp / videoDuration) * 100) : 0;

    let systemPrompt = '';
    
    if (mode === 'question') {
      // AI asked a question and student is answering
      systemPrompt = `You are an AI tutor evaluating a student's understanding. Be encouraging and helpful.

Context:
- Module: ${moduleTitle}
- Video progress: ${progressPercent}%
- Learning objectives: ${objectives || 'Understanding core concepts'}
- Content context: ${transcript?.substring(0, 1500) || moduleSummary || 'General introduction'}
- Question you asked: ${aiQuestion}

Rules:
1. Evaluate the student's answer kindly
2. If correct/mostly correct, praise and add a small insight
3. If incorrect, gently correct without being discouraging
4. Keep response under 100 words
5. Be conversational and supportive`;
    } else {
      // Student is asking a doubt
      systemPrompt = `You are an AI tutor helping a student with their doubt during a video lesson.

Context:
- Module: ${moduleTitle}
- Video progress: ${progressPercent}%
- Learning objectives: ${objectives || 'Understanding core concepts'}
- Content context: ${transcript?.substring(0, 1500) || moduleSummary || 'General introduction'}

Rules:
1. Answer the student's doubt clearly and concisely
2. Use simple language and examples when possible
3. Relate your answer to the video content they're watching
4. Keep response under 150 words
5. Be encouraging and supportive`;
    }

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(DO_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DO_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.3-70b-instruct',
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I understand. Let me help you with that. Could you rephrase your question?";

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in bootcamp chat:', error);
    return NextResponse.json({ 
      response: "I'm having trouble processing that. Please try again or continue watching the video." 
    });
  }
}
