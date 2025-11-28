import { NextRequest, NextResponse } from 'next/server';

const DO_AI_API_KEY = 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';
const DO_AI_URL = 'https://inference.do-ai.run/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { moduleTitle, transcript, objectives, timestamp, videoDuration } = await request.json();

    const progressPercent = Math.round((timestamp / videoDuration) * 100);
    
    const systemPrompt = `You are an AI tutor helping students learn. Generate ONE focused, engaging question based on video content.

Context:
- Module: ${moduleTitle}
- Video progress: ${progressPercent}%
- Learning objectives: ${objectives}
- Content covered so far: ${transcript?.substring(0, 2000) || 'Introduction to the topic'}

Rules:
1. Ask only ONE question
2. Question should be based on content covered UP TO this point in the video
3. Make it conversational and encouraging
4. Focus on understanding, not memorization
5. Keep question under 100 words`;

    const response = await fetch(DO_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DO_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.3-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a quick comprehension check question for the student based on what they have watched so far.' }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const question = data.choices?.[0]?.message?.content || 'What key concept have you learned so far from this video?';

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error generating question:', error);
    return NextResponse.json({ 
      question: 'Can you summarize what you have learned so far from this section?' 
    });
  }
}
