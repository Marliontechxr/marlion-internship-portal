import { NextResponse } from 'next/server';
import { getAIClient } from '@marlion/lib/ai';

export const dynamic = 'force-dynamic';

// Detailed stream contexts with welcoming, learning-focused approach
const getStreamContext = (stream: string) => {
  const contexts: Record<string, {
    displayName: string;
    welcomeNote: string;
    relevantTechStack: string[];
    missionHooks: string[];
    technicalDomains: string[];
    realScenarios: string[];
    challengeAreas: string[];
    friendlyQuestions: string[];
    curiosityProbes: string[];
  }> = {
    'ar-vr': {
      displayName: "Immersive Tech (AR/VR)",
      welcomeNote: "AR/VR is such an exciting space right now! Whether you've built full games or just experimented with basic 3D, we're looking for people who are curious and eager to learn.",
      relevantTechStack: ["Unity", "Unreal Engine", "Blender", "Substance Painter", "C#", "Godot", "WebXR", "Three.js", "A-Frame", "Spark AR", "Lens Studio", "Maya", "ZBrush", "Oculus SDK", "SteamVR"],
      missionHooks: [
        "creating calming virtual environments for children who get overwhelmed easily",
        "making games that adapt to how a child is feeling in real-time",
        "building body tracking experiences that work without expensive VR headsets",
        "using sensors and textures to create therapeutic play experiences",
        "designing safe virtual spaces for kids to practice life skills"
      ],
      technicalDomains: ["Unity", "Unreal", "Blender", "3D modeling", "game design", "body tracking", "sensor integration"],
      realScenarios: [
        "Imagine a child gets anxious during a VR experience. How might you design a 'calm down' feature that helps them feel safe?",
        "We want to track hand movements using just a webcam. What tools or approaches come to mind?",
        "A school has basic laptops, not gaming PCs. How would you approach making a game that runs smoothly on limited hardware?"
      ],
      challengeAreas: ["making games calming instead of overwhelming", "handling hardware limitations", "designing for accessibility"],
      friendlyQuestions: [
        "What got you interested in AR/VR? Was there a specific game or experience that sparked it?",
        "Have you built anything in Unity or Unreal, even something simple? I'd love to hear about it.",
        "What part of 3D development do you find most interesting - the coding, the design, or the art side?",
        "If you could build any VR/AR experience, what would it be?"
      ],
      curiosityProbes: [
        "What's a feature in your favorite game that you've always wanted to recreate?",
        "If you had to explain how VR works to a 10-year-old, what would you say?",
        "What part of AR/VR development seems most challenging to you right now?"
      ]
    },
    'agentic-ai': {
      displayName: "Agentic AI",
      welcomeNote: "AI agents are the future of software! Whether you've played with LangChain, built chatbots, or just used ChatGPT a lot, we're excited to see what you bring.",
      relevantTechStack: ["LangChain", "LangGraph", "CrewAI", "AutoGen", "Google ADK", "OpenAI API", "Anthropic API", "HuggingFace", "LlamaIndex", "Pinecone", "Weaviate", "ChromaDB", "Python", "FastAPI", "Streamlit", "Gradio"],
      missionHooks: [
        "building AI assistants that help therapists and parents communicate better",
        "creating agents that can understand and summarize therapy notes",
        "designing AI that can answer questions about child development sensitively",
        "building multi-agent systems where different AI experts collaborate",
        "automating repetitive administrative work for special schools"
      ],
      technicalDomains: ["LLM APIs", "prompt engineering", "RAG", "vector databases", "agent frameworks", "Python"],
      realScenarios: [
        "Imagine building an AI assistant for a tired parent who needs simple answers about their child's therapy. What would you keep in mind?",
        "How would you approach building a chatbot that summarizes long therapy documents into simple language?",
        "If you wanted to make an AI that connects different information sources (like documents and databases), what tools would you use?"
      ],
      challengeAreas: ["making AI responses reliable", "handling sensitive topics", "building useful multi-agent systems"],
      friendlyQuestions: [
        "What got you interested in AI? Was there a specific moment or project that sparked it?",
        "Have you tried building anything with ChatGPT API, LangChain, or similar tools?",
        "What's the coolest AI application you've seen recently that made you think 'wow'?",
        "If you could build any AI assistant, what would it do?"
      ],
      curiosityProbes: [
        "What do you think is the hardest part about building AI applications?",
        "Have you ever had an AI give you a wrong answer? How did you feel about that?",
        "What's something you wish AI could do that it currently can't?"
      ]
    },
    'data-science': {
      displayName: "Data Science",
      welcomeNote: "Data science is all about finding patterns and insights! Whether you've done Kaggle competitions, built simple ML models, or just love working with data, we'd love to hear about your experience.",
      relevantTechStack: ["Python", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "Jupyter", "Matplotlib", "Seaborn", "SQL", "Excel", "Power BI", "Tableau", "R", "Keras", "XGBoost"],
      missionHooks: [
        "analyzing patterns in how children learn and respond to different activities",
        "building recommendation systems for personalized learning",
        "creating visualizations that help parents understand their child's progress",
        "predicting which interventions might work best for each child",
        "making data insights accessible to non-technical users"
      ],
      technicalDomains: ["Python", "ML basics", "data visualization", "statistics", "pandas", "predictive modeling"],
      realScenarios: [
        "Imagine you have data showing a child's activity levels throughout the day. How would you visualize this for a parent?",
        "If you had to predict which activities a child might enjoy based on their past behavior, how would you approach it?",
        "How would you explain a machine learning prediction to someone who has never heard of ML?"
      ],
      challengeAreas: ["working with limited data", "making insights understandable", "handling messy real-world data"],
      friendlyQuestions: [
        "What got you interested in data science? Was it a specific project or course?",
        "Have you worked with Python or any data tools before? Even small projects count!",
        "What's the most interesting thing you've learned from analyzing data?",
        "If you could analyze any dataset in the world, what would you choose?"
      ],
      curiosityProbes: [
        "What do you find most challenging about working with data?",
        "Have you ever found a surprising pattern in data that you didn't expect?",
        "How do you think data science can help make people's lives better?"
      ]
    },
    'fullstack': {
      displayName: "Full Stack Development",
      welcomeNote: "Full stack development is where ideas become reality! Whether you've built complete apps or just dabbled in web development, we're interested in your journey.",
      relevantTechStack: ["React", "Next.js", "React Native", "Flutter", "Node.js", "Express", "MongoDB", "PostgreSQL", "Firebase", "Supabase", "Tailwind CSS", "TypeScript", "JavaScript", "HTML/CSS", "Vue.js", "Django", "Flask"],
      missionHooks: [
        "building apps that parents can use to track their child's progress",
        "creating interfaces that work well for users with different abilities",
        "designing dashboards that make complex data easy to understand",
        "building real-time features for collaboration between parents and therapists",
        "creating mobile apps that work offline in areas with poor internet"
      ],
      technicalDomains: ["React", "Next.js", "Node.js", "databases", "APIs", "mobile development"],
      realScenarios: [
        "You're building an app for a parent who isn't tech-savvy. How would you make the interface as simple as possible?",
        "How would you design an app that needs to work even when the internet connection is slow or drops?",
        "If you needed to build a feature that updates in real-time across multiple devices, what tools would you consider?"
      ],
      challengeAreas: ["making apps intuitive", "handling offline scenarios", "building accessible interfaces"],
      friendlyQuestions: [
        "What got you into web/app development? What was your first project?",
        "Have you built anything with React, Next.js, or similar frameworks?",
        "What's a website or app that you think has really great design?",
        "If you could build any app, what would it be?"
      ],
      curiosityProbes: [
        "What part of building apps do you enjoy most - the frontend, backend, or design?",
        "What's the trickiest bug you've ever had to fix?",
        "How do you approach learning new technologies or frameworks?"
      ]
    }
  };
  return contexts[stream] || contexts['fullstack'];
};

// Generate a unique, FRIENDLY opening based on randomized elements
const generateDynamicOpening = (candidateName: string, stream: string, context: ReturnType<typeof getStreamContext>) => {
  // Friendly welcome openers
  const welcomeOpeners = [
    `Hi ${candidateName}! 👋 Welcome to Marlion. ${context.welcomeNote} I'm excited to chat with you today. So, what got you interested in ${context.displayName}?`,
    `Hey ${candidateName}! Great to meet you. ${context.welcomeNote} Tell me - what's your story? What brought you to ${context.displayName}?`,
    `${candidateName}, welcome! ${context.welcomeNote} Before we dive into anything technical, I'd love to hear what sparked your interest in this field.`,
    `Hi ${candidateName}! Thanks for applying. ${context.welcomeNote} Let's start simple - what made you choose ${context.displayName}?`,
    `Hey there ${candidateName}! ${context.welcomeNote} I'm curious to learn about your journey. What drew you to ${context.displayName}?`
  ];
  
  const techStackOpeners = [
    `Hi ${candidateName}! 👋 Quick question to kick us off - what tools or technologies have you worked with in ${context.displayName.toLowerCase()}? Even if it's just tutorials or small projects, I'd love to hear about it!`,
    `Hey ${candidateName}! Before anything else - tell me about your tech stack. What have you played with? (${context.relevantTechStack.slice(0, 5).join(', ')} - any of these ring a bell?)`,
    `${candidateName}, welcome! Let's start fun - if you had to pick your favorite tool in the ${context.displayName.toLowerCase()} space, what would it be and why?`,
    `Hi ${candidateName}! I'm curious - what's your experience level with ${context.displayName.toLowerCase()}? Complete beginner, some projects under your belt, or somewhere in between?`
  ];
  
  const projectOpeners = [
    `Hey ${candidateName}! 👋 I always love hearing about what people have built. Have you worked on any projects in ${context.displayName.toLowerCase()}, even small ones? Tell me about them!`,
    `Hi ${candidateName}! What's the coolest thing you've built or worked on? Doesn't have to be related to ${context.displayName.toLowerCase()} - I just want to know what gets you excited!`,
    `${candidateName}, welcome! Let's skip the formal stuff - tell me about something you've created that you're proud of. Big or small, finished or not!`,
    `Hey ${candidateName}! Before we get into details - what got you into tech in the first place? Was there a specific moment or project that hooked you?`
  ];
  
  // Randomly pick a category and then an opener
  const categories = [welcomeOpeners, techStackOpeners, projectOpeners];
  const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  const selectedOpener = selectedCategory[Math.floor(Math.random() * selectedCategory.length)];
  
  return selectedOpener;
};

// Analyze response quality to adapt conversation style
const analyzeResponseQuality = (response: string): {
  isGeneric: boolean;
  showsCuriosity: boolean;
  showsEmpathy: boolean;
  isShort: boolean;
  hasQuestions: boolean;
} => {
  const genericPhrases = [
    'i want to make a difference',
    'i\'m passionate about',
    'i love technology',
    'i want to help people',
    'it\'s my dream',
    'since childhood',
    'always wanted to',
    'very interested in'
  ];
  
  const isGeneric = genericPhrases.some(phrase => 
    response.toLowerCase().includes(phrase)
  ) && response.length < 200;
  
  const showsCuriosity = response.includes('?') || 
    /how|why|what if|wonder|curious|interesting/i.test(response);
  
  const empathyIndicators = /child|kid|parent|family|struggle|feel|experience|understand|perspective/i;
  const showsEmpathy = empathyIndicators.test(response);
  
  const isShort = response.split(' ').length < 20;
  const hasQuestions = (response.match(/\?/g) || []).length > 0;
  
  return { isGeneric, showsCuriosity, showsEmpathy, isShort, hasQuestions };
};

const getSystemPrompt = (candidateName: string, selectedStream: string, turnContext: string = '', responseAnalysis?: ReturnType<typeof analyzeResponseQuality>): string => {
  const context = getStreamContext(selectedStream);
  const missionHook = context.missionHooks[Math.floor(Math.random() * context.missionHooks.length)];
  const friendlyQ = context.friendlyQuestions[Math.floor(Math.random() * context.friendlyQuestions.length)];
  const curiosity = context.curiosityProbes[Math.floor(Math.random() * context.curiosityProbes.length)];
  const relevantTools = context.relevantTechStack.slice(0, 8).join(', ');
  
  // Adapt style based on response analysis - BE SUPPORTIVE
  let adaptationNote = '';
  if (responseAnalysis) {
    if (responseAnalysis.isGeneric) {
      adaptationNote = `\n**ADAPTATION:** Their answer was a bit general - that's okay! Help them get specific by asking a follow-up. Example: "That's a good start! Can you tell me more about a specific example?"`;
    } else if (responseAnalysis.showsCuriosity && responseAnalysis.hasQuestions) {
      adaptationNote = `\n**ADAPTATION:** They're curious and asking questions - excellent! Answer their question warmly and continue the conversation.`;
    } else if (responseAnalysis.isShort) {
      adaptationNote = `\n**ADAPTATION:** Short answer - they might be nervous. Give them encouragement and ask an easier follow-up question.`;
    }
  }
  
  return `### WHO YOU ARE
You are a **friendly interviewer** at Marlion Technologies, chatting with **${candidateName}** about the **${context.displayName}** internship.

**Your Personality:**
- Warm, encouraging, and genuinely interested in the candidate
- You understand students come from tier 2/3 colleges and may not have extensive experience - THAT'S OKAY
- You're looking for WILLINGNESS TO LEARN, curiosity, and genuine interest
- You appreciate honesty like "I haven't tried that yet, but I'd love to learn"
- You're a supportive mentor, not a harsh judge

### WHAT WE'RE BUILDING
We build technology to help children who learn differently - things like ${missionHook}. 
The candidate doesn't need to know about neurodiversity or special education beforehand - they'll learn during the internship!

### YOUR INTERVIEW APPROACH
**Be Supportive:**
- This is a FRIENDLY conversation, not an interrogation
- If they don't know something, that's fine! Say "No worries, that's something you'd learn here"
- Celebrate small wins: "Oh, you've used ${context.relevantTechStack[0]}? That's great!"
- If they're nervous, help them relax with a lighter question

**Focus on Their Tech Experience:**
- What tools have they used? (${relevantTools})
- What projects have they built, even small ones?
- What do they enjoy learning?
- Are they willing to work hard and figure things out?

**Questions You Can Ask:**
- "${friendlyQ}"
- "${curiosity}"
${adaptationNote}

**Conversation Rules:**
- Keep responses under 50 words - be concise and warm
- One question at a time
- Acknowledge what they said before asking the next question
- Use their name occasionally
- If they ask YOU a question, answer it helpfully!

### WHAT YOU'RE EVALUATING (But Don't Be Harsh)
1. **Willingness to Learn:** Are they eager to pick up new skills?
2. **Technical Exposure:** What have they tried? Even YouTube tutorials count!
3. **Genuine Interest:** Do they seem excited about building things?
4. **Work Ethic:** Are they ready for a real internship, not just a certificate?

${turnContext}

**Output:** Respond with ONLY your next friendly message. Be warm and encouraging!`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, stream, conversationHistory, studentName } = body;
    
    const client = getAIClient();
    const candidateName = studentName || 'there';
    const context = getStreamContext(stream);

    if (action === 'start') {
      // Generate a unique, friendly opening - no need for AI follow-up
      const baseOpening = generateDynamicOpening(candidateName, stream, context);
      
      return NextResponse.json({ question: baseOpening });
    }

    if (action === 'next_question') {
      const turnCount = conversationHistory.filter((m: {role: string}) => m.role === 'user').length;
      const lastUserMessage = conversationHistory.filter((m: {role: string}) => m.role === 'user').pop()?.content || '';
      const lastAIMessage = conversationHistory.filter((m: {role: string}) => m.role === 'assistant').pop()?.content || '';
      const includeScoring = body.includeScoring || false;
      
      // Analyze the student's response to adapt
      const responseAnalysis = analyzeResponseQuality(lastUserMessage);
      
      // FRIENDLY SCORING: Focus on willingness to learn and genuine engagement
      let responseQuality: 'excellent' | 'good' | 'medium' | 'poor' = 'medium';
      
      if (includeScoring) {
        const wordCount = lastUserMessage.split(/\s+/).length;
        const lowerMsg = lastUserMessage.toLowerCase();
        const context = getStreamContext(stream);
        
        // Check if they mention relevant tech stack for their stream
        const mentionsRelevantTool = context.relevantTechStack.some(tool => 
          lowerMsg.includes(tool.toLowerCase())
        );
        
        // POSITIVE SIGNALS - what we want to see
        const showsEnthusiasm = /\b(love|enjoy|excited|interesting|cool|awesome|amazing|fascinated|curious|fun)\b/i.test(lastUserMessage);
        const mentionsProject = /\b(built|made|created|worked on|project|app|website|game|bot|tool|portfolio)\b/i.test(lastUserMessage);
        const mentionsLearning = /\b(learning|learned|studied|tutorial|course|youtube|trying|practice|experiment)\b/i.test(lastUserMessage);
        const showsHonesty = /\b(haven't|don't know|not sure|new to|beginner|still learning|want to learn|would love to)\b/i.test(lastUserMessage);
        const asksQuestion = (lastUserMessage.match(/\?/g) || []).length > 0;
        const givesDetail = wordCount >= 25;
        const explainsReasoning = /\b(because|since|so|that's why|the reason|I think)\b/i.test(lastUserMessage);
        
        // NEGATIVE SIGNALS - what we don't want
        const veryShort = wordCount < 10;
        const justYesNo = /^(yes|no|yeah|nope|ok|okay|sure|maybe)\.?$/i.test(lastUserMessage.trim());
        const seemsDisinterested = /\b(don't care|whatever|i guess|not really|doesn't matter)\b/i.test(lastUserMessage);
        
        // Score calculation - START AT 50, more forgiving
        let score = 50;
        
        // POSITIVE FACTORS (+12 for good responses)
        if (mentionsRelevantTool) score += 12;
        if (mentionsProject) score += 12;
        if (showsEnthusiasm) score += 10;
        if (mentionsLearning) score += 8;
        if (showsHonesty) score += 5; // Honesty is valued!
        if (asksQuestion) score += 8;
        if (givesDetail) score += 8;
        if (explainsReasoning) score += 6;
        
        // NEGATIVE FACTORS (-10 for poor responses)
        if (veryShort && !showsEnthusiasm) score -= 10;
        if (justYesNo) score -= 15;
        if (seemsDisinterested) score -= 20;
        if (responseAnalysis.isGeneric && veryShort) score -= 8;
        
        // Cap score
        score = Math.max(0, Math.min(100, score));
        
        // Map to quality levels - FORGIVING thresholds
        if (score >= 70) responseQuality = 'excellent';
        else if (score >= 55) responseQuality = 'good';
        else if (score >= 35) responseQuality = 'medium';
        else responseQuality = 'poor';
      }
      
      // Dynamic context based on conversation stage
      let turnContext = '';
      let temperature = 0.75;
      
      // Friendly conversation stages
      const stages = {
        warmup: turnCount <= 1,
        techExperience: turnCount === 2 || turnCount === 3,
        projects: turnCount === 4 || turnCount === 5,
        closing: turnCount >= 6
      };
      
      if (stages.warmup) {
        const adaptiveDirection = responseAnalysis.isShort
          ? "They gave a short answer - totally fine! Help them open up with an encouraging follow-up."
          : responseAnalysis.showsCuriosity 
            ? "They showed curiosity - great sign! Build on that enthusiasm."
            : "Nice start! Learn more about their background and interests.";
        
        turnContext = `
### CURRENT STAGE: Getting to Know Them (Turn ${turnCount})
${adaptiveDirection}
Ask about their tech experience or what they enjoy learning. Keep it light and friendly!`;
      } else if (stages.techExperience) {
        const relevantTools = context.relevantTechStack.slice(0, 6).join(', ');
        turnContext = `
### CURRENT STAGE: Exploring Tech Experience (Turn ${turnCount})
Ask about specific tools they've used: ${relevantTools}
- "Have you tried any of these?"
- "What's your favorite part of working with [tool they mentioned]?"
- If they're beginners, that's okay! Ask what they want to learn.

Be encouraging! If they haven't used something, say "No worries, that's something you'd pick up during the internship!"`;
        temperature = 0.7;
      } else if (stages.projects) {
        const friendlyQ = context.friendlyQuestions[Math.floor(Math.random() * context.friendlyQuestions.length)];
        turnContext = `
### CURRENT STAGE: Learning About Their Projects (Turn ${turnCount})
Ask about any projects they've built - even small ones count!
- "${friendlyQ}"
- If they haven't built much yet, ask what they'd LIKE to build
- Celebrate any hands-on experience

Remember: We're looking for enthusiasm and willingness to learn, not expertise!`;
      } else if (stages.closing) {
        const closingOptions = [
          `"This has been great, ${candidateName}! One last thing - any questions about the internship or what we're building?"`,
          `"We're almost done! What excites you most about the possibility of working on these projects?"`,
          `"Last question: If you join us, what skill would you most want to develop during the internship?"`,
          `"Before we wrap up - is there anything else you'd like me to know about you?"`
        ];
        const closingChoice = closingOptions[Math.floor(Math.random() * closingOptions.length)];
        
        turnContext = `
### CURRENT STAGE: Wrapping Up (Turn ${turnCount})
Time to close on a positive note. Use: ${closingChoice}

Be warm and encouraging! Thank them for their time regardless of how it went.`;
      }

      // Build the conversation messages
      const messages = [
        { role: 'system' as const, content: getSystemPrompt(candidateName, stream, turnContext, responseAnalysis) },
        ...conversationHistory.map((msg: {role: string; content: string}) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const response = await client.chatCompletion({
        messages,
        temperature,
        max_tokens: 180,
      });

      let nextQuestion = response.choices[0]?.message?.content || 
        "Interesting. Here's what I'm wondering - how does any of this actually help a child who experiences the world differently? That's what we're here for.";
      
      // Ensure variety - if the response starts too similarly to previous AI messages, regenerate
      const previousAIMessages = conversationHistory
        .filter((m: {role: string}) => m.role === 'assistant')
        .map((m: {content: string}) => m.content.toLowerCase().substring(0, 30));
      
      if (previousAIMessages.some((prev: string) => nextQuestion.toLowerCase().startsWith(prev.substring(0, 15)))) {
        // Regenerate with higher temperature for variety
        const retryResponse = await client.chatCompletion({
          messages,
          temperature: 0.9,
          max_tokens: 180,
        });
        nextQuestion = retryResponse.choices[0]?.message?.content || nextQuestion;
      }

      return NextResponse.json({ question: nextQuestion, responseQuality });
    }

    if (action === 'evaluate') {
      const transcript = conversationHistory
        .map((msg: {role: string; content: string}) => 
          `${msg.role === 'assistant' ? 'Marlion' : candidateName}: ${msg.content}`
        )
        .join('\n\n');

      const evaluationPrompt = `You are evaluating an internship interview for **${context.displayName}** at Marlion Technologies.

### THE MISSION
We build assistive technology for neurodiverse children - autism, ADHD, sensory processing disorders. This includes:
- ${context.missionHooks.slice(0, 2).join('\n- ')}

This is NOT a generic internship. We need people who:
1. Are genuinely curious and can handle "we don't know yet"
2. Care about the HUMANS using the tech, not just building cool stuff
3. Will stay when things get hard and ambiguous
4. Can think through novel problems without a StackOverflow answer

### INTERVIEW TRANSCRIPT
${transcript}

### EVALUATION FRAMEWORK

**Curiosity (0-25 points):**
- 20-25: Asked thoughtful questions back, admitted gaps honestly, showed genuine desire to understand
- 15-19: Showed some curiosity, asked at least one good question
- 10-14: Mostly answered without engaging deeply
- 0-9: No curiosity shown, just trying to give "right" answers

**Empathy (0-25 points):**
- 20-25: Consistently thought about child/parent/therapist experience, not just tech
- 15-19: Mentioned users genuinely at least once
- 10-14: Acknowledged users when prompted but didn't initiate
- 0-9: Focused only on tech/themselves

**Grit (0-25 points):**
- 20-25: Authentic about challenges, ready for hard work, resilient mindset
- 15-19: Acknowledged difficulty honestly, seems willing to push through
- 10-14: Mixed signals - some enthusiasm but unclear on commitment
- 0-9: Seemed to want an easy path or showed red flags about work ethic

**Thinking (0-25 points):**
- 20-25: Reasoned from first principles, asked clarifying questions, handled ambiguity well
- 15-19: Showed logical thinking, could work through scenarios
- 10-14: Gave textbook answers without much original thought
- 0-9: Couldn't engage with open-ended problems

### OUTPUT FORMAT
Provide your evaluation as valid JSON:
{
  "candidate_name": "${candidateName}",
  "stream": "${context.displayName}",
  "scores": {
    "curiosity": <0-25>,
    "empathy": <0-25>,
    "grit": <0-25>,
    "thinking": <0-25>
  },
  "overallScore": <sum of above, 0-100>,
  "technical_depth": "High/Medium/Low",
  "empathy_score": "High/Medium/Low",
  "culture_fit": "Strong/Good/Moderate/Weak",
  "key_observation": "<Quote ONE specific memorable thing they said - use their exact words in quotes>",
  "standout_moment": "<What was their best moment in the interview?>",
  "concern": "<What's your biggest concern about this candidate? Or 'None'>",
  "recommendation": "Strong Hire/Hire/Maybe/Pass",
  "summary": "<2 sentences max: Would you want this person on your team? Why or why not?>"
}

Be fair but discerning. We're looking for diamonds in the rough, not polish.
Respond with ONLY valid JSON, no markdown.`;

      const response = await client.chatCompletion({
        messages: [
          { role: 'system', content: 'You are an expert talent evaluator at a mission-driven tech company. You evaluate with both warmth and rigor. You can spot genuine passion vs. rehearsed answers. Output only valid JSON.' },
          { role: 'user', content: evaluationPrompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      });

      let evaluation;
      try {
        const content = response.choices[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        evaluation = JSON.parse(cleaned);
      } catch {
        evaluation = {
          candidate_name: candidateName,
          stream: context.displayName,
          scores: { curiosity: 15, empathy: 15, grit: 15, thinking: 15 },
          overallScore: 60,
          technical_depth: "Medium",
          empathy_score: "Medium", 
          culture_fit: "Moderate",
          key_observation: "Interview completed - manual review recommended.",
          standout_moment: "Unable to parse - review transcript.",
          concern: "Evaluation parsing failed - review transcript directly.",
          recommendation: "Maybe",
          summary: "Candidate completed the interview. Manual review of transcript recommended to assess mission alignment.",
        };
      }

      return NextResponse.json({ evaluation });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Interview API error:', error);
    return NextResponse.json({ error: 'Interview processing failed' }, { status: 500 });
  }
}
