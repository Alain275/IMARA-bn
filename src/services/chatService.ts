import { AppError } from '../utils/AppError';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionResult {
  provider: 'openai' | 'gemini' | 'fallback';
  model: string;
  text: string;
}

type ChatProvider = 'openai' | 'gemini';

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const DEFAULT_PROVIDER = (process.env.CHAT_PROVIDER || 'openai').toLowerCase() as ChatProvider;

const GEMINI_FALLBACK_MODELS = [
  DEFAULT_GEMINI_MODEL,
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
].filter((model, index, all) => all.indexOf(model) === index);

const IMARA_SYSTEM_PROMPT = `
You are the IMARA Assistant for an agriculture platform serving farmers in Rwanda.

Your job:
- Explain IMARA clearly, warmly, and simply.
- Be practical, relatable, and encouraging.
- Focus on crop advisory, weather, disease detection, market prices, agronomist support, onboarding, and platform usage.
- Prefer short, direct answers with concrete examples when useful.
- If the user asks something outside IMARA or agriculture, still be helpful, but say when you are making a general suggestion.
- Never claim to have completed actions in the user's account unless the conversation explicitly says so.
- Do not invent pricing, partnerships, district counts, user counts, or medical certainty.
- When you are unsure, say what you do know and suggest the next best step.
`.trim();

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateChatMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AppError('At least one chat message is required', 400);
  }

  const normalized = messages.map((message) => {
    if (!message || typeof message !== 'object') {
      throw new AppError('Each chat message must be an object', 400);
    }

    const role = (message as { role?: unknown }).role;
    const content = (message as { content?: unknown }).content;

    if (role !== 'system' && role !== 'user' && role !== 'assistant') {
      throw new AppError('Chat message role must be system, user, or assistant', 400);
    }

    if (!hasText(content)) {
      throw new AppError('Chat message content cannot be empty', 400);
    }

    return {
      role: role as ChatRole,
      content: content.trim(),
    };
  });

  const hasUserMessage = normalized.some((message) => message.role === 'user');
  if (!hasUserMessage) {
    throw new AppError('A user message is required to generate a reply', 400);
  }

  return normalized;
}

function resolveProvider(requestedProvider?: string): ChatProvider {
  const preferred = requestedProvider?.toLowerCase();
  const provider = preferred === 'gemini' || preferred === 'openai' ? preferred : DEFAULT_PROVIDER;

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  if (provider === 'openai' && hasOpenAI) return 'openai';
  if (provider === 'gemini' && hasGemini) return 'gemini';

  if (hasOpenAI) return 'openai';
  if (hasGemini) return 'gemini';

  throw new AppError(
    'No chat provider is configured. Add OPENAI_API_KEY or GEMINI_API_KEY in the backend environment.',
    500
  );
}

function buildConversation(messages: ChatMessage[]): ChatMessage[] {
  const withoutSystem = messages.filter((message) => message.role !== 'system');
  return [{ role: 'system', content: IMARA_SYSTEM_PROMPT }, ...withoutSystem];
}

function buildFallbackReply(messages: ChatMessage[]): ChatCompletionResult {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content.toLowerCase() || '';

  let text =
    'I am here to help with IMARA. You can ask me about crop advisory, disease detection, weather guidance, market information, or how to get started using the platform.';

  if (lastUserMessage.includes('hello') || lastUserMessage.includes('hi')) {
    text =
      'Hello! I am here to help you use IMARA. You can ask about crops, weather, disease detection, market support, or how to get started.';
  } else if (
    lastUserMessage.includes('disease') ||
    lastUserMessage.includes('pest') ||
    lastUserMessage.includes('sick')
  ) {
    text =
      'I can help with crop disease questions. If a plant looks sick, describe the crop, the visible symptoms, and when the problem started so I can guide you better.';
  } else if (
    lastUserMessage.includes('weather') ||
    lastUserMessage.includes('rain') ||
    lastUserMessage.includes('forecast')
  ) {
    text =
      'I can help you think through weather-based farming decisions. Tell me your crop and whether you are planting, irrigating, or harvesting.';
  } else if (
    lastUserMessage.includes('market') ||
    lastUserMessage.includes('price') ||
    lastUserMessage.includes('sell')
  ) {
    text =
      'I can help with market questions. Tell me which crop you want to sell or compare, and I will help you frame the next step clearly.';
  }

  return {
    provider: 'fallback',
    model: 'local-help-fallback',
    text,
  };
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isGeminiModelNotFoundError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('is not found for api version') ||
    normalized.includes('not supported for generatecontent') ||
    normalized.includes('call modelservice.listmodels')
  );
}

async function callOpenAI(messages: ChatMessage[]): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError('OPENAI_API_KEY is not configured', 500);
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      temperature: 0.7,
      messages,
    }),
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : 'OpenAI request failed';

    throw new AppError(message || 'OpenAI request failed', response.status);
  }

  const text =
    typeof payload === 'object' &&
    payload &&
    'choices' in payload &&
    Array.isArray((payload as { choices?: unknown[] }).choices)
      ? ((payload as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message?.content ?? '')
      : '';

  if (!hasText(text)) {
    throw new AppError('OpenAI returned an empty response', 502);
  }

  return {
    provider: 'openai',
    model: DEFAULT_OPENAI_MODEL,
    text: text.trim(),
  };
}

async function callGemini(messages: ChatMessage[]): Promise<ChatCompletionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError('GEMINI_API_KEY is not configured', 500);
  }

  const [systemMessage, ...conversation] = messages;
  let lastError: AppError | null = null;

  for (const model of GEMINI_FALLBACK_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemMessage?.content || IMARA_SYSTEM_PROMPT }],
        },
        contents: conversation.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload && 'error' in payload
          ? (payload as { error?: { message?: string } }).error?.message
          : 'Gemini request failed';

      lastError = new AppError(message || 'Gemini request failed', response.status);

      if (message && isGeminiModelNotFoundError(message)) {
        continue;
      }

      throw lastError;
    }

    const text =
      typeof payload === 'object' &&
      payload &&
      'candidates' in payload &&
      Array.isArray((payload as { candidates?: unknown[] }).candidates)
        ? ((payload as {
            candidates: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          }).candidates[0]?.content?.parts?.map((part) => part.text || '').join('') ?? '')
        : '';

    if (!hasText(text)) {
      throw new AppError('Gemini returned an empty response', 502);
    }

    return {
      provider: 'gemini',
      model,
      text: text.trim(),
    };
  }

  throw lastError || new AppError('No supported Gemini model was available for generateContent', 502);
}

export async function generateChatReply(
  messages: ChatMessage[],
  requestedProvider?: string
): Promise<ChatCompletionResult> {
  const provider = resolveProvider(requestedProvider);
  const conversation = buildConversation(messages);

  try {
    if (provider === 'gemini') {
      return await callGemini(conversation);
    }

    return await callOpenAI(conversation);
  } catch (error) {
    if (provider === 'gemini') {
      console.error('Gemini chat failed, using fallback reply:', error);
      return buildFallbackReply(conversation);
    }

    throw error;
  }
}
