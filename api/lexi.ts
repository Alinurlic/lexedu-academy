/**
 * Vercel Serverless Function: ИИ-помощник Lexi (Claude).
 *
 * Переменные окружения (Vercel → Project → Settings → Environment Variables):
 *   ANTHROPIC_API_KEY        — ключ Claude API (обязателен для ИИ; хранится только на сервере)
 *   SUPABASE_URL / SUPABASE_ANON_KEY (или VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *                            — если заданы, ИИ доступен только вошедшим пользователям с подтверждённым email
 *   AI_DAILY_LIMIT           — запросов на пользователя в сутки (по умолчанию 60)
 *   LEXI_MODEL               — модель (по умолчанию claude-opus-5-5)
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod/v4';
import { createClient } from '@supabase/supabase-js';

const MODEL = process.env.LEXI_MODEL || 'claude-opus-5-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 60);
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

/* ---------------------------- схемы ---------------------------- */

const ChatBody = z.object({
  action: z.literal('chat'),
  context: z.string().max(6000).optional(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) })).min(1).max(24),
});
const GradeBody = z.object({ action: z.literal('grade'), task: z.enum(['writing1', 'writing2', 'speaking']), prompt: z.string().min(5).max(4000), answer: z.string().min(1).max(12000) });
const GenerateBody = z.object({ action: z.literal('generate'), subject: z.string().max(80), topic: z.string().max(120), count: z.number().int().min(1).max(10), language: z.string().max(20), difficulty: z.string().max(20) });
const AnalyzeBody = z.object({ action: z.literal('analyze'), summary: z.string().min(20).max(8000) });
const Body = z.discriminatedUnion('action', [ChatBody, GradeBody, GenerateBody, AnalyzeBody]);

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
  if (!API_KEY) return json({ enabled: false, reason: 'На сервере не задан ANTHROPIC_API_KEY.' });
  if (!(SB_URL && SB_KEY) && !ALLOW_ANON) return json({ enabled: false, reason: 'Не настроены аккаунты (SUPABASE_URL / SUPABASE_ANON_KEY).' });
  return json({ enabled: true, model: MODEL, requiresAuth: Boolean(SB_URL && SB_KEY) });
}

export async function POST(req: Request) {
  if (!API_KEY) return json({ error: 'ИИ не подключён: не задан ANTHROPIC_API_KEY' }, 503);
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }
  const auth = await authorize(req);
  if (!auth.ok) return auth.res;

  const client = new Anthropic({ apiKey: API_KEY });
  try {
    if (body.action === 'chat') {
      const msg = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        ...FALLBACK,
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: TUTOR, cache_control: { type: 'ephemeral' } }, ...(body.context ? [{ type: 'text' as const, text: `Данные ученика (из приложения):\n${body.context}` }] : [])],
        messages: body.messages,
      });
      if (msg.stop_reason === 'refusal') return json({ reply: 'Извини, на этот запрос я ответить не могу. Давай вернёмся к подготовке к экзамену.' });
      return json({ reply: textOf(msg.content) });
    }
    if (body.action === 'analyze') {
      const msg = await client.beta.messages.create({ model: MODEL, max_tokens: 4000, ...FALLBACK, output_config: { effort: 'medium' }, system: ANALYST, messages: [{ role: 'user', content: body.summary }] });
      if (msg.stop_reason === 'refusal') return json({ error: 'Не удалось составить план' }, 422);
      return json({ reply: textOf(msg.content) });
    }
    if (body.action === 'grade') {
      const minWords = body.task === 'writing1' ? 150 : body.task === 'writing2' ? 250 : 0;
      const words = body.answer.trim().split(/\s+/).length;
      const msg = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 8000,
        ...FALLBACK,
        output_config: { effort: 'medium', format: betaZodOutputFormat(Grade) },
        system: GRADER,
        messages: [{ role: 'user', content: `Task type: ${body.task}${minWords ? ` (minimum ${minWords} words)` : ''}\nWord count: ${words}\n\nPROMPT:\n${body.prompt}\n\nCANDIDATE RESPONSE:\n${body.answer}` }],
      });
      const g = msg.parsed_output;
      if (msg.stop_reason === 'refusal' || !g) return json({ error: 'Не удалось оценить ответ' }, 422);
      const half = (n: number) => Math.max(0, Math.min(9, Math.round(n * 2) / 2));
      const criteria = { task: half(g.criteria.task), coherence: half(g.criteria.coherence), lexical: half(g.criteria.lexical), grammar: half(g.criteria.grammar) };
      const band = half((criteria.task + criteria.coherence + criteria.lexical + criteria.grammar) / 4);
      return json({ ...g, criteria, band });
    }
    // generate
    const msg = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      ...FALLBACK,
      output_config: { effort: 'medium', format: betaZodOutputFormat(Generated) },
      system: GENERATOR,
      messages: [{ role: 'user', content: `Предмет: ${body.subject}\nТема: ${body.topic}\nКоличество: ${body.count}\nСложность: ${body.difficulty}\nЯзык заданий: ${body.language}` }],
    });
    const out = msg.parsed_output;
    if (msg.stop_reason === 'refusal' || !out) return json({ error: 'Не удалось сгенерировать задания' }, 422);
    const valid = out.questions.filter((q) => q.options.length === 4 && q.correctIndex >= 0 && q.correctIndex < 4 && new Set(q.options).size === 4).slice(0, body.count);
    return json({ questions: valid });
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
