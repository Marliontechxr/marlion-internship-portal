// DigitalOcean Gradient AI Client
// Centralized AI client using DigitalOcean's serverless inference API

const DO_AI_BASE_URL = 'https://inference.do-ai.run/v1';
const DO_AI_API_KEY = process.env.DO_AI_API_KEY || 'sk-do--LMZmnIi-nmJHmVUJTs3p0RyTkQeArAcfoCdCLtFaXMRnPX-AkgIow7QMC';

// Available models on DigitalOcean Gradient
export type DOModel = 'llama3.3-70b-instruct' | 'deepseek-r1-distill-llama-70b';

// Default model
export const DEFAULT_MODEL: DOModel = 'llama3.3-70b-instruct';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: DOModel;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  choices: {
    finish_reason: string;
    index: number;
    message: {
      content: string;
      role: string;
    };
  }[];
  created: number;
  id: string;
  model: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * DigitalOcean Gradient AI Client
 * Uses serverless inference API for LLM calls
 */
export class DOAIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || DO_AI_API_KEY;
    this.baseUrl = DO_AI_BASE_URL;
  }

  /**
   * Create a chat completion using DigitalOcean's inference API
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const {
      model = DEFAULT_MODEL,
      messages,
      temperature = 0.7,
      max_tokens = 500,
    } = options;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DigitalOcean AI API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a chat completion with JSON response format
   * Note: Llama models don't have native JSON mode, so we instruct via system prompt
   */
  async chatCompletionJSON<T = any>(options: ChatCompletionOptions): Promise<T> {
    // Add JSON instruction to system message
    const messagesWithJSON = options.messages.map((msg, index) => {
      if (index === 0 && msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}\n\nIMPORTANT: You must respond with valid JSON only. No markdown, no code blocks, just raw JSON.`,
        };
      }
      return msg;
    });

    const response = await this.chatCompletion({
      ...options,
      messages: messagesWithJSON,
      temperature: 0.3, // Lower temperature for more consistent JSON
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // Clean up the response - remove any markdown code blocks if present
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      return JSON.parse(cleanedContent);
    } catch (e) {
      console.error('Failed to parse JSON response:', cleanedContent);
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    return response.json();
  }
}

// Singleton instance
let clientInstance: DOAIClient | null = null;

export function getAIClient(): DOAIClient {
  if (!clientInstance) {
    clientInstance = new DOAIClient();
  }
  return clientInstance;
}

// Helper function for simple completions
export async function complete(
  prompt: string,
  options?: Partial<ChatCompletionOptions>
): Promise<string> {
  const client = getAIClient();
  const response = await client.chatCompletion({
    messages: [{ role: 'user', content: prompt }],
    ...options,
  });
  return response.choices[0]?.message?.content || '';
}

// Helper function for chat with system prompt
export async function chat(
  systemPrompt: string,
  userMessage: string,
  options?: Partial<ChatCompletionOptions>
): Promise<string> {
  const client = getAIClient();
  const response = await client.chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    ...options,
  });
  return response.choices[0]?.message?.content || '';
}
