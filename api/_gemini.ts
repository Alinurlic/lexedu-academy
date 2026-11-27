/**
 * Бесплатный вариант ИИ для Lexi: Google Gemini API (ключ из Google AI Studio, без карты).
 * Файл начинается с «_», поэтому Vercel не делает из него отдельный адрес /api/…
 *
 * Документация REST: https://ai.google.dev/api/generate-content
 */

export const GEMINI_KEY = process.env.GEMINI_API_KEY?.trim();
// «latest»-псевдоним всегда указывает на актуальную модель Flash, доступную на бесплатном тарифе
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Turn = { role: 'user' | 'assistant'; content: string };

/** Схема ответа в формате Gemini (подмножество OpenAPI). */
export type GSchema = {
  type: 'OBJECT' | 'ARRAY' | 'STRING' | 'NUMBER' | 'INTEGER';
  properties?: Record<string, GSchema>;
  required?: string[];
  items?: GSchema;
  enum?: string[];
};

export async function gemini(opts: { system: string; messages: Turn[]; maxTokens?: number; schema?: GSchema; fetchImpl?: typeof fetch }): Promise<string> {
  if (!GEMINI_KEY) throw new GeminiError('GEMINI_API_KEY не задан', 503);
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: opts.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 8192,
        ...(opts.schema ? { responseMimeType: 'application/json', responseSchema: opts.schema } : {}),
      },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
    promptFeedback?: { blockReason?: string };
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  if (!res.ok) {
    const st = data.error?.status ?? '';
    if (res.status === 429 || st === 'RESOURCE_EXHAUSTED') throw new GeminiError('Бесплатный лимит Gemini на сейчас исчерпан — попробуйте через минуту', 429);
    if (/API_KEY|API key/i.test(data.error?.message ?? '') || res.status === 401 || res.status === 403) throw new GeminiError('Неверный GEMINI_API_KEY на сервере', 500);
    throw new GeminiError(`Ошибка Gemini (${res.status}): ${data.error?.message ?? 'нет ответа'}`, res.status >= 500 ? 502 : 400);
  }
  if (data.promptFeedback?.blockReason) throw new GeminiError('Запрос отклонён фильтром безопасности', 422);
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new GeminiError(cand?.finishReason === 'SAFETY' ? 'Ответ отклонён фильтром безопасности' : 'Пустой ответ модели', 422);
  return text;
}

export const GRADE_SCHEMA: GSchema = {
  type: 'OBJECT',
  properties: {
    band: { type: 'NUMBER' },
    criteria: {
      type: 'OBJECT',
      properties: { task: { type: 'NUMBER' }, coherence: { type: 'NUMBER' }, lexical: { type: 'NUMBER' }, grammar: { type: 'NUMBER' } },
      required: ['task', 'coherence', 'lexical', 'grammar'],
    },
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    improvements: { type: 'ARRAY', items: { type: 'STRING' } },
    summary: { type: 'STRING' },
  },
  required: ['band', 'criteria', 'strengths', 'improvements', 'summary'],
};

export const GENERATED_SCHEMA: GSchema = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctIndex: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
          difficulty: { type: 'STRING', enum: ['easy', 'medium', 'hard'] },
        },
        required: ['question', 'options', 'correctIndex', 'explanation', 'difficulty'],
      },
    },
  },
  required: ['questions'],
};
