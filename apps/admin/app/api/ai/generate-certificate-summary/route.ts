import { NextRequest, NextResponse } from 'next/server';

const DO_AI_API_KEY = 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';
const DO_AI_API_URL = 'https://inference.do-ai.run/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { studentName, stream, college, department, completedTasks, interviewSummary, interviewScore } = await request.json();

    // Build context for AI
    const tasksSummary = completedTasks?.length > 0 
      ? completedTasks.map((t: any) => t.title).join(', ')
      : '';

    const systemPrompt = `You write elegant, concise certificate summaries for Marlion Technologies internship certificates.

RULES:
- Write exactly 2 sentences maximum
- First sentence: What they accomplished (skills/project focus)
- Second sentence: Their qualities demonstrated
- Use formal, professional language suitable for printed certificates
- No markdown, no bullet points, no line breaks
- Do not mention specific task names or technical jargon
- Focus on transferable skills and professional qualities
- Keep under 50 words total`;

    const userPrompt = `Write a certificate summary for ${studentName} who completed the ${stream} internship.

Context (do not mention these directly, use to inform tone):
- Tasks worked on: ${tasksSummary || 'capstone project'}
- College: ${college}
${interviewScore ? `- Performance: ${interviewScore > 70 ? 'strong' : 'satisfactory'}` : ''}

Write 2 elegant sentences for the certificate.`;

    const response = await fetch(DO_AI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DO_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.3-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI API Error:', error);
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || 
      `Successfully completed the internship program with dedication and professionalism. Demonstrated strong problem-solving abilities and collaborative spirit.`;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating certificate summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', summary: 'Successfully completed the internship program with dedication and professionalism.' },
      { status: 500 }
    );
  }
}
