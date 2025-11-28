// Semantic Search
// AI-powered semantic search for students and content
// Uses DigitalOcean Gradient AI (Llama 3.3 70B)
// Note: Uses AI-powered keyword matching since DO doesn't have embeddings API

import { getAIClient } from './client';

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  type: 'student' | 'course' | 'announcement' | 'help';
}

/**
 * Simple keyword-based search with TF-IDF-like scoring
 * Falls back to this since DigitalOcean doesn't have embeddings API
 */
function keywordSearch(
  query: string,
  documents: { id: string; title: string; content: string; type: SearchResult['type'] }[]
): SearchResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  return documents.map(doc => {
    const text = `${doc.title} ${doc.content}`.toLowerCase();
    let score = 0;
    
    for (const term of queryTerms) {
      // Count occurrences
      const regex = new RegExp(term, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
        // Boost for title matches
        if (doc.title.toLowerCase().includes(term)) {
          score += 5;
        }
      }
    }
    
    // Normalize by document length
    score = score / Math.sqrt(text.length);
    
    return {
      id: doc.id,
      title: doc.title,
      snippet: doc.content.substring(0, 150) + '...',
      relevanceScore: score,
      type: doc.type,
    };
  }).filter(r => r.relevanceScore > 0);
}

/**
 * AI-powered semantic search using LLM for reranking
 */
export async function semanticSearch(
  query: string,
  documents: { id: string; title: string; content: string; type: SearchResult['type'] }[],
  topK: number = 5
): Promise<SearchResult[]> {
  // First pass: keyword search to get candidates
  const candidates = keywordSearch(query, documents)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, Math.min(20, documents.length));
  
  if (candidates.length === 0) {
    // If no keyword matches, use AI to find relevant docs
    const client = getAIClient();
    const docsContext = documents.slice(0, 10).map((d, i) => 
      `[${i}] ${d.title}: ${d.content.substring(0, 100)}`
    ).join('\n');
    
    const result = await client.chatCompletionJSON<{ relevantIndices: number[] }>({
      messages: [
        {
          role: 'system',
          content: `Given a search query and a list of documents, return the indices of the most relevant documents.
Return JSON: { "relevantIndices": [0, 2, 5] } (list of document indices, most relevant first)`,
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nDocuments:\n${docsContext}`,
        },
      ],
      max_tokens: 100,
    });
    
    return (result.relevantIndices || []).slice(0, topK).map((idx, rank) => ({
      id: documents[idx]?.id || '',
      title: documents[idx]?.title || '',
      snippet: (documents[idx]?.content || '').substring(0, 150) + '...',
      relevanceScore: 1 - (rank * 0.1),
      type: documents[idx]?.type || 'help',
    })).filter(r => r.id);
  }
  
  return candidates.slice(0, topK);
}

export async function answerHelpQuestion(
  question: string,
  context: { studentName: string; stream: string; currentModule?: string }
): Promise<string> {
  const client = getAIClient();
  const response = await client.chatCompletion({
    messages: [
      {
        role: 'system',
        content: `You are a helpful support assistant for Marlion Technologies internship program.

Student: ${context.studentName}
Stream: ${context.stream}
${context.currentModule ? `Current Module: ${context.currentModule}` : ''}

Provide helpful, accurate answers. If you can't help with something, direct them to create a support ticket or email internship@marliontech.com.`,
      },
      { role: 'user', content: question },
    ],
    max_tokens: 400,
  });

  return response.choices[0]?.message?.content || "I'm not sure about that. Please create a support ticket for further assistance.";
}
