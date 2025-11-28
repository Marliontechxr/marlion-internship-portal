import { NextRequest, NextResponse } from 'next/server';

const DO_AI_API_KEY = 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';
const DO_AI_ENDPOINT = 'https://inference.do-ai.run/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { messages, taskTitle, taskDescription, problemStatement, problemDescription } = await req.json();

    const systemPrompt = `You are an AI Team Lead at Marlion Technologies, guiding an intern through their project work.

Project Context:
- Problem Statement: ${problemStatement || 'Not specified'}
- Description: ${problemDescription || 'Not specified'}
- Current Task: ${taskTitle || 'Not specified'}
- Task Details: ${taskDescription || 'Not specified'}

Your role:
1. Be encouraging and supportive like a mentor
2. Ask clarifying questions about their approach
3. Provide helpful suggestions without giving direct solutions
4. Guide them to think through problems systematically
5. Celebrate small wins and progress
6. Be conversational and friendly

Keep responses concise (2-3 sentences) and actionable.`;

    const response = await fetch(DO_AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DO_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3.3-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || 'I apologize, I could not process that. Please try again.';

    return NextResponse.json({ message: aiMessage });
  } catch (error) {
    console.error('Project assistant error:', error);
    return NextResponse.json(
      { message: 'Great approach! Let me know if you need any specific guidance.' },
      { status: 200 }
    );
  }
}
