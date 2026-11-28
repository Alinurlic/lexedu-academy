/**
 * Vercel Serverless Function: ИИ-помощник Lexi.
 *
 * Переменные окружения (Vercel → Project → Settings → Environment Variables), нужен ОДИН из ключей:
 *   ANTHROPIC_API_KEY        — ключ Claude API (платный, лучшее качество); если задан, используется он
 *   GEMINI_API_KEY           — ключ Google Gemini (есть бесплатный тариф, aistudio.google.com)
 *   GEMINI_MODEL             — модель Gemini (по умолчанию gemini-flash-latest)
 *   SUPABASE_URL / SUPABASE_ANON_KEY (или VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *                            — если заданы, ИИ доступен только вошедшим пользователям с подтверждённым email
 *   AI_DAILY_LIMIT           — запросов на пользователя в сутки (по умолчанию 60)
 *   LEXI_MODEL               — модель (по умолчанию claude-opus-5-5)
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod/v4';
import { createClient } from '@supabase/supabase-js';
import { GEMINI_KEY, GEMINI_MODEL, GENERATED_SCHEMA, GRADE_SCHEMA, GeminiError, gemini } from './_gemini.js';
import { EXPLAINER, EXPLAIN_SCHEMA, ExplainBody, ExplainOut, cleanResult, explainHash, explainPrompt, readCache, serviceClient, writeCache, type ExplainInput, type ExplainResult } from './_explain.js';

const MODEL = process.env.LEXI_MODEL || 'claude-opus-5-5';
const API_KEY = process.env.ANTHROPIC_API_KEY?.trim();
/** Какой ИИ используется: Claude (если есть ключ), иначе бесплатный Gemini. */
const PROVIDER: 'claude' | 'gemini' | null = API_KEY ? 'claude' : GEMINI_KEY ? 'gemini' : null;
const NO_KEY = 'На сервере не задан ключ ИИ (ANTHROPIC_API_KEY или GEMINI_API_KEY).';
const env = (...names: string[]) => names.map((n) => process.env[n]?.trim()).find(Boolean);
// поддерживаем и свои имена, и те, что создаёт интеграция Supabase в Vercel
const SB_URL = env('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const SB_KEY = env('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 60);
/** Только для сервера: запись общего кэша разборов. Никогда не добавляйте префикс VITE_. */
const SB_SERVICE = env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');
/** Без Supabase ИИ доступен всем, кто знает адрес — только для локальной разработки */
const ALLOW_ANON = process.env.AI_ALLOW_ANONYMOUS === '1';
// Отказ модели по соображениям безопасности сервер автоматически перезапускает на рекомендованной резервной модели
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/* ---------------------------- системные промпты ---------------------------- */

const TUTOR = `Ты — Lexi, ИИ-наставник платформы LexEdu Academy (маскот — лис в синем пиджаке). Помогаешь школьникам Казахстана готовиться к ЕНТ, а также к SAT и IELTS.

Как отвечать:
- Язык ответа — язык вопроса ученика (обычно русский; для SAT/IELTS можно давать примеры на английском).
- Объясняй понятно и по шагам, особенно в математике, физике и химии: сначала идея, затем вычисления, затем ответ и короткая проверка.
- Если ученик просит решить задачу, сначала дай подсказку и спроси, хочет ли он полное решение, — кроме случаев, когда он явно просит полное решение.
- Будь честен: если не уверен в факте (даты, нормы законодательства РК, формат экзамена), так и скажи и посоветуй сверить с учебником или официальным сайтом (testcenter.kz, collegeboard.org, ielts.org).
- Не выдавай придуманные задания за официальные задания НЦТ, College Board или IELTS.
- Пиши кратко: обычно до 200 слов, без лишних вступлений. Можно использовать списки и простые формулы в тексте (x², √, ≤).
- Поддерживай доброжелательно, но без лишних восклицаний.`;

const GRADER = `You are an experienced IELTS examiner. Assess the candidate's response strictly according to the public IELTS band descriptors.
Writing: Task Achievement/Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.
Speaking (transcript): Fluency and Coherence, Pronunciation (estimate cautiously from the transcript and say so), Lexical Resource, Grammatical Range and Accuracy — map them to the fields task, coherence, lexical, grammar in that order.
Band per criterion: 0–9 in steps of 0.5. Overall band: average of the four criteria rounded to the nearest 0.5. Penalise responses that are under the minimum word count or off-topic.
Write "summary", "strengths" and "improvements" in Russian so a Kazakhstani student can understand them; quote short examples from the response where helpful. Give 2–4 strengths and 3–5 concrete improvements.`;

const GENERATOR = `Ты составляешь оригинальные учебные тестовые задания для подготовки к экзаменам (ЕНТ, SAT, IELTS).
Требования: ровно 4 варианта ответа, ровно один верный, правдоподобные неверные варианты, краткое объяснение решения.
Факты должны быть общепринятыми и проверяемыми; если тема спорная — не используй её. Не копируй задания из официальных сборников.
Язык заданий — как указано в запросе.`;

const ANALYST = `Ты — Lexi, наставник LexEdu Academy. По сводке статистики ученика составь персональный план на 7 дней на русском языке:
1) главная проблема (1–2 предложения, с цифрами из сводки);
2) 3–5 приоритетных тем с конкретными действиями и количеством заданий;
3) план по дням (кратко, реалистично для школьника, 60–120 минут в день);
4) один совет по технике сдачи экзамена.
Опирайся только на данные из сводки, не выдумывай результаты. До 300 слов.`;

/** Язык интерфейса ученика: при казахском Lexi отвечает и пишет планы и отзывы на казахском. */
type UiLang = 'ru' | 'kk' | undefined;
const tutorFor = (lang: UiLang) =>
  lang === 'kk' ? `${TUTOR}\n- Ученик выбрал казахский язык интерфейса: отвечай на казахском языке (термины можно дублировать по-русски в скобках), если ученик сам не пишет на другом языке.` : TUTOR;
const analystFor = (lang: UiLang) => (lang === 'kk' ? ANALYST.replace('на русском языке', 'на казахском языке') : ANALYST);
const graderFor = (lang: UiLang) => (lang === 'kk' ? GRADER.replace('in Russian so a Kazakhstani student', 'in Kazakh so a Kazakhstani student') : GRADER);

/* ---------------------------- схемы ---------------------------- */

const UiLangField = z.enum(['ru', 'kk']).optional();
const ChatBody = z.object({
  action: z.literal('chat'),
  lang: UiLangField,
  context: z.string().max(6000).optional(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) })).min(1).max(24),
});
const GradeBody = z.object({ action: z.literal('grade'), lang: UiLangField, task: z.enum(['writing1', 'writing2', 'speaking']), prompt: z.string().min(5).max(4000), answer: z.string().min(1).max(12000) });
const GenerateBody = z.object({ action: z.literal('generate'), subject: z.string().max(80), topic: z.string().max(120), count: z.number().int().min(1).max(10), language: z.string().max(20), difficulty: z.string().max(20) });
const AnalyzeBody = z.object({ action: z.literal('analyze'), lang: UiLangField, summary: z.string().min(20).max(8000) });
const Body = z.discriminatedUnion('action', [ChatBody, GradeBody, GenerateBody, AnalyzeBody, ExplainBody]);

const Grade = z.object({
  band: z.number(),
  criteria: z.object({ task: z.number(), coherence: z.number(), lexical: z.number(), grammar: z.number() }),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  summary: z.string(),
});
const Generated = z.object({
  questions: z.array(z.object({ question: z.string(), options: z.array(z.string()), correctIndex: z.number().int(), explanation: z.string(), difficulty: z.enum(['easy', 'medium', 'hard']) })),
});

/* ---------------------------- доступ ---------------------------- */

async function authorize(req: Request): Promise<{ ok: true } | { ok: false; res: Response }> {
  if (!SB_URL || !SB_KEY) {
    // аккаунты не настроены: не даём открытый доступ к ключу ИИ, если это явно не разрешено
    return ALLOW_ANON ? { ok: true } : { ok: false, res: json({ error: 'ИИ доступен только после настройки аккаунтов (Supabase)' }, 503) };
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, res: json({ error: 'Войдите в аккаунт, чтобы пользоваться ИИ' }, 401) };
  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { ok: false, res: json({ error: 'Сессия истекла — войдите снова' }, 401) };
  if (!data.user.email_confirmed_at) return { ok: false, res: json({ error: 'Подтвердите email, чтобы пользоваться ИИ' }, 403) };
  // Дневной лимит: строки в ai_usage (RLS: пользователь видит и добавляет только свои, удалить не может)
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error: cErr } = await sb.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', data.user.id).gte('created_at', since.toISOString());
  if (!cErr && (count ?? 0) >= DAILY_LIMIT) return { ok: false, res: json({ error: `Дневной лимит ИИ (${DAILY_LIMIT} запросов) исчерпан. Возвращайся завтра!` }, 429) };
  await sb.from('ai_usage').insert({ user_id: data.user.id });
  return { ok: true };
}

/* ---------------------------- обработчики ---------------------------- */

export async function GET() {
  if (!PROVIDER) return json({ enabled: false, reason: NO_KEY });
  if (!(SB_URL && SB_KEY) && !ALLOW_ANON) return json({ enabled: false, reason: 'Не настроены аккаунты (SUPABASE_URL / SUPABASE_ANON_KEY).' });
  return json({ enabled: true, provider: PROVIDER, model: PROVIDER === 'claude' ? MODEL : GEMINI_MODEL, requiresAuth: Boolean(SB_URL && SB_KEY), explainCache: Boolean(SB_URL && SB_SERVICE) });
}

/* ---------------------------- общая постобработка ---------------------------- */

const minWordsOf = (task: 'writing1' | 'writing2' | 'speaking') => (task === 'writing1' ? 150 : task === 'writing2' ? 250 : 0);
const gradePrompt = (b: z.infer<typeof GradeBody>) => {
  const minWords = minWordsOf(b.task);
  const words = b.answer.trim().split(/\s+/).length;
  return `Task type: ${b.task}${minWords ? ` (minimum ${minWords} words)` : ''}\nWord count: ${words}\n\nPROMPT:\n${b.prompt}\n\nCANDIDATE RESPONSE:\n${b.answer}`;
};
const generatePrompt = (b: z.infer<typeof GenerateBody>) => `Предмет: ${b.subject}\nТема: ${b.topic}\nКоличество: ${b.count}\nСложность: ${b.difficulty}\nЯзык заданий: ${b.language}`;

function finishGrade(g: z.infer<typeof Grade>) {
  // band пересчитываем сами по официальному правилу: среднее четырёх критериев, округление до 0,5
  const half = (n: number) => Math.max(0, Math.min(9, Math.round(n * 2) / 2));
  const criteria = { task: half(g.criteria.task), coherence: half(g.criteria.coherence), lexical: half(g.criteria.lexical), grammar: half(g.criteria.grammar) };
  const band = half((criteria.task + criteria.coherence + criteria.lexical + criteria.grammar) / 4);
  return json({ ...g, criteria, band });
}

function finishGenerate(out: z.infer<typeof Generated>, count: number) {
  const valid = out.questions.filter((q) => q.options.length === 4 && q.correctIndex >= 0 && q.correctIndex < 4 && new Set(q.options).size === 4).slice(0, count);
  return json({ questions: valid });
}

/** Бесплатный вариант: Google Gemini. */
async function viaGemini(body: z.infer<typeof Body>, fetchImpl?: typeof fetch): Promise<Response> {
  try {
    if (body.action === 'chat') {
      const tutor = tutorFor(body.lang);
      const system = body.context ? `${tutor}\n\nДанные ученика (из приложения):\n${body.context}` : tutor;
      return json({ reply: await gemini({ system, messages: body.messages, maxTokens: 4096, fetchImpl }) });
    }
    if (body.action === 'analyze') {
      return json({ reply: await gemini({ system: analystFor(body.lang), messages: [{ role: 'user', content: body.summary }], maxTokens: 4096, fetchImpl }) });
    }
    if (body.action === 'explain') {
      const raw = await gemini({ system: EXPLAINER, messages: [{ role: 'user', content: explainPrompt(body) }], schema: EXPLAIN_SCHEMA, maxTokens: 4096, fetchImpl });
      const out = ExplainOut.safeParse(JSON.parse(raw));
      const clean = out.success ? cleanResult(out.data) : null;
      return clean ? json(clean) : json({ error: 'Не удалось подготовить разбор, попробуйте ещё раз' }, 502);
    }
    if (body.action === 'grade') {
      const raw = await gemini({ system: graderFor(body.lang), messages: [{ role: 'user', content: gradePrompt(body) }], schema: GRADE_SCHEMA, fetchImpl });
      const g = Grade.safeParse(JSON.parse(raw));
      return g.success ? finishGrade(g.data) : json({ error: 'Не удалось оценить ответ' }, 422);
    }
    const raw = await gemini({ system: GENERATOR, messages: [{ role: 'user', content: generatePrompt(body) }], schema: GENERATED_SCHEMA, fetchImpl });
    const out = Generated.safeParse(JSON.parse(raw));
    return out.success ? finishGenerate(out.data, body.count) : json({ error: 'Не удалось сгенерировать задания' }, 422);
  } catch (e) {
    if (e instanceof GeminiError) return json({ error: e.message }, e.status);
    if (e instanceof SyntaxError) return json({ error: 'ИИ вернул некорректный ответ, попробуйте ещё раз' }, 502);
    return json({ error: 'Внутренняя ошибка сервера' }, 500);
  }
}
/**
 * Разбор задания: сначала общий кэш (без расхода лимита), затем генерация и сохранение для всех учеников.
 * Хэш содержимого считает сервер — поэтому разбор нельзя «подложить» под настоящее задание.
 */
async function explain(req: Request, body: ExplainInput): Promise<Response> {
  const hash = explainHash(body);
  const service = serviceClient(SB_URL, SB_SERVICE);
  const reader = service ?? (SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false } }) : null);
  const hit = await readCache(reader, body.questionId, hash);
  if (hit) return json({ explanation: hit.explanation, keyLooksWrong: hit.key_suspect, comment: hit.note ?? '', cached: true });

  const auth = await authorize(req);
  if (!auth.ok) return auth.res;
  let res: Response;
  if (PROVIDER === 'gemini') res = await viaGemini(body);
  else res = await explainWithClaude(body);
  if (!res.ok) return res;
  const out = (await res.json()) as ExplainResult;
  const saved = await writeCache(service, {
    question_id: body.questionId,
    content_hash: hash,
    lang: body.lang,
    explanation: out.explanation,
    key_suspect: out.keyLooksWrong,
    note: out.comment || null,
    model: PROVIDER === 'claude' ? MODEL : GEMINI_MODEL,
  });
  return json({ ...out, cached: false, saved });
}

async function explainWithClaude(body: ExplainInput): Promise<Response> {
  const client = new Anthropic({ apiKey: API_KEY });
  try {
    const msg = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      ...FALLBACK,
      output_config: { effort: 'medium', format: betaZodOutputFormat(ExplainOut) },
      system: EXPLAINER,
      messages: [{ role: 'user', content: explainPrompt(body) }],
    });
    const clean = msg.parsed_output && msg.stop_reason !== 'refusal' ? cleanResult(msg.parsed_output) : null;
    return clean ? json(clean) : json({ error: 'Не удалось подготовить разбор' }, 502);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'ИИ перегружен, попробуйте через минуту' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `Ошибка ИИ (${e.status ?? 'сеть'})` }, 502);
    return json({ error: 'Внутренняя ошибка сервера' }, 500);
  }
}

export const __test = { viaGemini };

export async function POST(req: Request) {
  if (!PROVIDER) return json({ error: `ИИ не подключён. ${NO_KEY}` }, 503);
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }
  if (body.action === 'explain') return explain(req, body);
  const auth = await authorize(req);
  if (!auth.ok) return auth.res;

  if (PROVIDER === 'gemini') return viaGemini(body);
  const client = new Anthropic({ apiKey: API_KEY });
  try {
    if (body.action === 'chat') {
      const msg = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        ...FALLBACK,
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: tutorFor(body.lang), cache_control: { type: 'ephemeral' } }, ...(body.context ? [{ type: 'text' as const, text: `Данные ученика (из приложения):\n${body.context}` }] : [])],
        messages: body.messages,
      });
      if (msg.stop_reason === 'refusal') return json({ reply: 'Извини, на этот запрос я ответить не могу. Давай вернёмся к подготовке к экзамену.' });
      return json({ reply: textOf(msg.content) });
    }
    if (body.action === 'analyze') {
      const msg = await client.beta.messages.create({ model: MODEL, max_tokens: 4000, ...FALLBACK, output_config: { effort: 'medium' }, system: analystFor(body.lang), messages: [{ role: 'user', content: body.summary }] });
      if (msg.stop_reason === 'refusal') return json({ error: 'Не удалось составить план' }, 422);
      return json({ reply: textOf(msg.content) });
    }
    if (body.action === 'grade') {
      const msg = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 8000,
        ...FALLBACK,
        output_config: { effort: 'medium', format: betaZodOutputFormat(Grade) },
        system: graderFor(body.lang),
        messages: [{ role: 'user', content: gradePrompt(body) }],
      });
      const g = msg.parsed_output;
      if (msg.stop_reason === 'refusal' || !g) return json({ error: 'Не удалось оценить ответ' }, 422);
      return finishGrade(g);
    }
    // generate
    const msg = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      ...FALLBACK,
      output_config: { effort: 'medium', format: betaZodOutputFormat(Generated) },
      system: GENERATOR,
      messages: [{ role: 'user', content: generatePrompt(body) }],
    });
    const out = msg.parsed_output;
    if (msg.stop_reason === 'refusal' || !out) return json({ error: 'Не удалось сгенерировать задания' }, 422);
    return finishGenerate(out, body.count);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'ИИ перегружен, попробуйте через минуту' }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'Неверный ANTHROPIC_API_KEY на сервере' }, 500);
    if (e instanceof Anthropic.BadRequestError) return json({ error: `Ошибка запроса к ИИ: ${e.message}` }, 400);
    if (e instanceof Anthropic.APIError) return json({ error: `Ошибка ИИ (${e.status ?? 'сеть'})` }, 502);
    return json({ error: 'Внутренняя ошибка сервера' }, 500);
  }
}

function textOf(content: { type: string; text?: string }[]) {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();
}
