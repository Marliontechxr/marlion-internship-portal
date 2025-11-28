import { NextRequest, NextResponse } from 'next/server';

const DO_AI_API_KEY = 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';
const DO_AI_URL = 'https://inference.do-ai.run/v1/chat/completions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { moduleTitle, transcript, objectives, moduleSummary } = await request.json();

    const contentContext = transcript?.substring(0, 3000) || moduleSummary || 'General introductory content';
    
    const systemPrompt = `You are an AI quiz generator for an educational platform. Generate exactly 5 multiple-choice questions.

Module: ${moduleTitle}
Learning objectives: ${objectives || 'Understanding core concepts'}
Content covered: ${contentContext}

IMPORTANT: You must respond with ONLY a valid JSON array, no other text. Format:
[
  {
    "id": "1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation why this is correct"
  }
]

Rules:
1. Generate exactly 5 questions
2. Each question must have exactly 4 options
3. correctAnswer is the index (0-3) of the correct option
4. Questions should test understanding, not memorization
5. Make questions progressively harder
6. Keep questions concise and clear
7. Return ONLY the JSON array, no markdown, no extra text`;

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
          { role: 'user', content: 'Generate the quiz questions now. Return ONLY the JSON array.' }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse JSON from response
    let questions = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing quiz JSON:', parseError);
      // Return fallback questions
      questions = [
        {
          id: '1',
          question: `What is the main focus of ${moduleTitle}?`,
          options: ['Understanding basics', 'Advanced concepts', 'Practical application', 'Theory only'],
          correctAnswer: 0,
          explanation: 'This module focuses on building foundational understanding.'
        },
        {
          id: '2',
          question: 'Why is this topic important for your learning journey?',
          options: ['It builds core skills', 'It is optional', 'For certification only', 'Not important'],
          correctAnswer: 0,
          explanation: 'Building core skills is essential for your progress.'
        },
        {
          id: '3',
          question: 'How should you approach learning this material?',
          options: ['Practice regularly', 'Read once', 'Skip difficult parts', 'Only watch videos'],
          correctAnswer: 0,
          explanation: 'Regular practice leads to better retention and understanding.'
        },
        {
          id: '4',
          question: 'What comes after understanding the basics?',
          options: ['Application', 'Forgetting', 'Starting over', 'Nothing'],
          correctAnswer: 0,
          explanation: 'Applying what you learn reinforces understanding.'
        },
        {
          id: '5',
          question: 'What should you do if you have doubts?',
          options: ['Ask the AI tutor', 'Ignore them', 'Skip the topic', 'Give up'],
          correctAnswer: 0,
          explanation: 'The AI tutor is here to help clarify your doubts.'
        }
      ];
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({
      questions: [
        {
          id: '1',
          question: 'Error generating quiz. What should you do?',
          options: ['Try again', 'Contact support', 'Continue learning', 'All of the above'],
          correctAnswer: 3,
          explanation: 'All options are valid approaches when encountering technical issues.'
        }
      ]
    });
  }
}
