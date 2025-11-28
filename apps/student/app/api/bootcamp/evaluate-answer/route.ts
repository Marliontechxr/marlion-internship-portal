import { NextRequest, NextResponse } from 'next/server';

const DO_AI_API_KEY = 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';
const DO_AI_URL = 'https://inference.do-ai.run/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { question, answer, moduleTitle, transcript, objectives, attemptNumber } = await request.json();

    const systemPrompt = `You are an educational evaluator. Evaluate a student's answer to a quiz question.

Module: ${moduleTitle}
Learning objectives: ${objectives || 'General understanding of the topic'}
Reference content: ${transcript?.substring(0, 1500) || 'Topic introduction'}

Question asked: ${question}
Student's answer: ${answer}
Attempt number: ${attemptNumber}

Evaluate if the student demonstrates understanding. Be encouraging but accurate.
- If the answer shows basic understanding of the concept, mark as PASSED
- If the answer is completely off-topic, wrong, or too vague, mark as FAILED
- Be lenient on minor details but strict on core concepts

Respond in JSON format only:
{
  "passed": true/false,
  "feedback": "Your feedback message here (2-3 sentences max)"
}`;

    const response = await fetch(DO_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DO_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.3-70b-instruct',
        messages: [
          { role: 'system', content: 'You are an educational evaluator. Always respond with valid JSON only.' },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    let result = { passed: false, feedback: 'Unable to evaluate. Please try again.' };
    
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, try to determine from content
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('passed') || lowerContent.includes('correct') || lowerContent.includes('good')) {
        result = { 
          passed: true, 
          feedback: 'Good understanding! You have grasped the key concepts.' 
        };
      } else {
        result = { 
          passed: false, 
          feedback: 'Your answer needs more detail. Try to explain the concept more thoroughly.' 
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return NextResponse.json({ 
      passed: false, 
      feedback: 'Unable to evaluate your answer. Please try again.' 
    });
  }
}
