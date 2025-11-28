import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DO_AI_URL = 'https://inference.do-ai.run/v1/chat/completions';
const DO_AI_KEY = process.env.DO_AI_API_KEY || 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';

export async function POST(request: Request) {
  try {
    const { messages, systemPrompt } = await request.json();

    const response = await fetch(DO_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DO_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.3-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          }))
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error('AI request failed');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Got it! Anything else?';

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ 
      response: 'Thanks for sharing! Have a great day!' 
    });
  }
}
