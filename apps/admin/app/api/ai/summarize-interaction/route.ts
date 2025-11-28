import { NextRequest, NextResponse } from 'next/server';

const DO_AI_API_KEY = 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';
const DO_AI_ENDPOINT = 'https://inference.do-ai.run/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { interactions, taskTitle, explanation } = await req.json();

    const conversationText = interactions
      .map((msg: any) => `${msg.role === 'user' ? 'Student' : 'AI'}: ${msg.content}`)
      .join('\n\n');

    const systemPrompt = `You are an AI evaluator for an internship program. Analyze the following interaction between a student and the AI Team Lead.

Task: ${taskTitle}
Student's Explanation: ${explanation || 'Not provided'}

Conversation:
${conversationText}

Provide:
1. A brief summary (2-3 sentences) of the student's approach and understanding
2. A score from 1-10 based on:
   - Clarity of thought (how well they explained their plan)
   - Technical understanding (do they understand the concepts)
   - Problem-solving approach (is their approach logical)
   - Communication (how well they articulated their ideas)

Respond in JSON format:
{
  "summary": "Brief summary here",
  "score": 7
}`;

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
          { role: 'user', content: 'Please analyze and provide the summary and score.' }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    let summary = 'Unable to generate summary';
    let score = 5;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summary = parsed.summary || summary;
        score = parsed.score || score;
      }
    } catch (e) {
      // If JSON parsing fails, use the content as summary
      summary = content;
    }

    return NextResponse.json({ summary, score });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { summary: 'Student showed good engagement with the task.', score: 6 },
      { status: 200 }
    );
  }
}
