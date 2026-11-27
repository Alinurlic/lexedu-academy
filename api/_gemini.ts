/**
 * Бесплатный вариант ИИ для Lexi: Google Gemini API (ключ из Google AI Studio, без карты).
 * Файл начинается с «_», поэтому Vercel не делает из него отдельный адрес /api/…
 *
 * Документация REST: https://ai.google.dev/api/generate-content
 */

export const GEMINI_KEY = process.env.GEMINI_API_KEY?.trim();
// «latest»-псевдоним всегда указывает на актуальную модель Flash, доступную на бесплатном тарифе
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
// Запасные модели на случай перегрузки основной (у каждой модели свой бесплатный лимит)
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-flash-lite-latest')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
export const GEMINI_MODELS = [GEMINI_MODEL, ...FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL)];
const RETRY_MS = Number(process.env.GEMINI_RETRY_MS ?? 800);

export const OVERLOADED = 'ИИ Google сейчас перегружен — попробуй ещё раз через минуту.';

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** временная ошибка (перегрузка, лимит в минуту) — имеет смысл повторить или взять другую модель */
    public retryable = false,
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

type GeminiOpts = { system: string; messages: Turn[]; maxTokens?: number; schema?: GSchema; fetchImpl?: typeof fetch };

/**
 * Запрос к Gemini с повтором при перегрузке и переходом на запасную модель.
 * Основная модель → повтор через паузу → запасная модель → повтор. Ошибки ключа, фильтра и запроса не повторяются.
 */
export async function gemini(opts: GeminiOpts): Promise<string> {
  if (!GEMINI_KEY) throw new GeminiError('GEMINI_API_KEY не задан', 503);
  let last: GeminiError | null = null;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callOnce(model, opts);
      } catch (e) {
        if (!(e instanceof GeminiError)) throw e;
        last = e;
        if (e.status === 404) break; // модель недоступна — пробуем следующую
        if (!e.retryable) throw e;
        if (attempt === 0) await new Promise((r) => setTimeout(r, RETRY_MS));
      }
    }
  }
  if (last?.status === 429) throw last;
  throw new GeminiError(OVERLOADED, 503, true);
}

async function callOnce(model: string, opts: GeminiOpts): Promise<string> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY ?? '' },
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
    if (res.status === 429 || st === 'RESOURCE_EXHAUSTED') throw new GeminiError('Бесплатный лимит ИИ Google на сейчас исчерпан — попробуй через минуту.', 429, true);
    if (/API_KEY|API key/i.test(data.error?.message ?? '') || res.status === 401 || res.status === 403) throw new GeminiError('Неверный GEMINI_API_KEY на сервере', 500);
    if (res.status === 404 || st === 'NOT_FOUND') throw new GeminiError(`Модель ${model} недоступна`, 404);
    if (res.status >= 500 || st === 'UNAVAILABLE' || st === 'INTERNAL') throw new GeminiError(OVERLOADED, 503, true);
    throw new GeminiError(`Ошибка запроса к ИИ (${res.status}): ${data.error?.message ?? 'нет ответа'}`, 400);
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
