/**
 * Подробный разбор задания от Lexi с общим кэшем в Supabase (таблица question_explanations).
 *
 * Кэш хранится по паре (id задания, хэш содержимого). Хэш сервер считает сам из присланного текста,
 * поэтому подменить разбор настоящего задания нельзя: выдуманный текст даст другой хэш.
 * Записывает в кэш только сервер (ключ SUPABASE_SERVICE_ROLE_KEY, хранится только в Vercel);
 * без этого ключа разбор всё равно генерируется, но не сохраняется для других учеников.
 */
import { createHash } from 'node:crypto';
import * as z from 'zod/v4';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GSchema } from './_gemini.js';

const answer = z.union([z.number(), z.array(z.number()), z.string(), z.array(z.string()), z.boolean(), z.null()]);

export const ExplainBody = z.object({
  action: z.literal('explain'),
  questionId: z.string().min(1).max(120),
  subject: z.string().max(80),
  lang: z.enum(['ru', 'kk', 'en']),
  type: z.enum(['single', 'multiple', 'numeric', 'boolean', 'matching', 'text']),
  question: z.string().min(3).max(4000),
  passage: z.string().max(12000).optional(),
  options: z.array(z.string().max(600)).max(10).optional(),
  prompts: z.array(z.string().max(600)).max(10).optional(),
  correctAnswer: answer,
  unit: z.string().max(40).optional(),
});
export type ExplainInput = z.infer<typeof ExplainBody>;

export const ExplainOut = z.object({
  explanation: z.string(),
  keyLooksWrong: z.boolean(),
  comment: z.string(),
});
export type ExplainResult = z.infer<typeof ExplainOut>;

export const EXPLAIN_SCHEMA: GSchema = {
  type: 'OBJECT',
  properties: { explanation: { type: 'STRING' }, keyLooksWrong: { type: 'BOOLEAN' }, comment: { type: 'STRING' } },
  required: ['explanation', 'keyLooksWrong', 'comment'],
};

/** Канонический вид содержимого — то же самое считает браузер (src/lib/explanations.ts). */
export function explainKey(q: { type: string; question: string; passage?: string; options?: string[]; prompts?: string[]; correctAnswer: unknown }) {
  return JSON.stringify([q.type, q.question, q.passage ?? '', q.options ?? [], q.prompts ?? [], q.correctAnswer ?? null]);
}
export const explainHash = (q: Parameters<typeof explainKey>[0]) => createHash('sha256').update(explainKey(q), 'utf8').digest('hex');

export const EXPLAINER = `Ты — Lexi, наставник LexEdu Academy. Сделай подробный разбор тестового задания для школьника.

Структура ответа (Markdown, без вступлений):
1. **Идея** — что проверяет задание и какое правило/факт нужно знать (1–2 предложения).
2. **Решение** — по шагам, с вычислениями или рассуждением.
3. **Почему верный ответ именно такой** и коротко — почему не подходят остальные варианты (по одной строке на вариант).
4. **Запомни** — одно короткое правило или подсказка.

Правила:
- Пиши на языке задания: если задание на казахском — весь разбор на казахском; на русском — на русском; на английском — на английском, но с пояснениями на русском.
- Объём — до 250 слов. Формулы записывай текстом: x², √2, a/b, x₁.
- Ключ ответа тебе сообщают. Проверь его. Если ты уверен, что отмеченный ответ неверен или в задании ошибка (два верных варианта, нет верного, опечатка, меняющая смысл), установи keyLooksWrong = true, в comment кратко объясни проблему и какой ответ, по-твоему, верный, а в explanation честно разбери ситуацию. Если ключ верен — keyLooksWrong = false, comment пустой.
- Не выдумывай факты. Если вопрос спорный (даты, нормы законов), так и скажи.`;

const LETTERS = 'ABCDEFGHIJ';

function answerText(b: ExplainInput) {
  const a = b.correctAnswer;
  if (b.type === 'single' && typeof a === 'number') return `${LETTERS[a]} — ${b.options?.[a] ?? ''}`;
  if (b.type === 'multiple' && Array.isArray(a)) return (a as number[]).map((i) => `${LETTERS[i]} — ${b.options?.[i] ?? ''}`).join('; ');
  if (b.type === 'matching' && Array.isArray(a)) return (a as number[]).map((oi, pi) => `${pi + 1} → ${LETTERS[oi]}`).join(', ');
  if (b.type === 'boolean') return a ? 'Верно' : 'Неверно';
  if (Array.isArray(a)) return (a as unknown[]).join(' / ');
  return `${String(a)}${b.unit ? ` ${b.unit}` : ''}`;
}

export function explainPrompt(b: ExplainInput) {
  const parts = [`Предмет: ${b.subject}`, `Язык задания: ${b.lang === 'kk' ? 'казахский' : b.lang === 'en' ? 'английский' : 'русский'}`];
  if (b.passage) parts.push(`Текст к заданию:\n${b.passage}`);
  parts.push(`Задание:\n${b.question}`);
  if (b.prompts?.length) parts.push(`Пункты для соответствия:\n${b.prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
  if (b.options?.length) parts.push(`Варианты:\n${b.options.map((o, i) => `${LETTERS[i]}) ${o}`).join('\n')}`);
  parts.push(`Отмеченный правильный ответ (ключ): ${answerText(b)}`);
  return parts.join('\n\n');
}

/* ---------------------------- кэш ---------------------------- */

export interface CacheRow {
  explanation: string;
  key_suspect: boolean;
  note: string | null;
}

export async function readCache(sb: SupabaseClient | null, questionId: string, hash: string): Promise<CacheRow | null> {
  if (!sb) return null;
  const { data, error } = await sb.from('question_explanations').select('explanation, key_suspect, note').eq('question_id', questionId).eq('content_hash', hash).maybeSingle();
  if (error) return null;
  return (data as CacheRow | null) ?? null;
}

export function serviceClient(url?: string, serviceKey?: string): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function writeCache(sb: SupabaseClient | null, row: { question_id: string; content_hash: string; lang: string; explanation: string; key_suspect: boolean; note: string | null; model: string }) {
  if (!sb) return false;
  const { error } = await sb.from('question_explanations').upsert(row, { onConflict: 'question_id,content_hash', ignoreDuplicates: true });
  return !error;
}

/** Проверка ответа модели: разбор не пустой и не слишком длинный. */
export function cleanResult(r: ExplainResult): ExplainResult | null {
  const explanation = r.explanation.trim();
  if (explanation.length < 40 || explanation.length > 8000) return null;
  return { explanation, keyLooksWrong: !!r.keyLooksWrong, comment: (r.comment ?? '').trim().slice(0, 1000) };
}
