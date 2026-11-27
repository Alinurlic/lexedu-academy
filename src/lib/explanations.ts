import type { Question } from '@/types';
import { SUBJECT_MAP } from '@/data/subjects';
import { questionLang } from '@/data/questions/lang';
import { aiExplain, type ExplainPayload, type ExplainReply } from './ai';
import { getSupabase, isSupabaseConfigured } from './supabase';

/**
 * Подробные разборы от Lexi. Порядок: память вкладки → общий кэш в Supabase (без расхода лимита ИИ) → сервер ИИ.
 * Ключ кэша — id задания + SHA-256 содержимого; та же формула на сервере (api/_explain.ts).
 */
export function explainKey(q: { type: string; question: string; passage?: string; options?: string[]; prompts?: string[]; correctAnswer: unknown }) {
  return JSON.stringify([q.type, q.question, q.passage ?? '', q.options ?? [], q.prompts ?? [], q.correctAnswer ?? null]);
}

export async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function explainPayload(q: Question): ExplainPayload | null {
  if (q.type === 'essay') return null;
  return {
    questionId: q.id,
    subject: SUBJECT_MAP[q.subject]?.name ?? q.subject,
    lang: questionLang(q),
    type: q.type,
    question: q.question,
    passage: q.passage || undefined,
    options: q.type === 'single' || q.type === 'multiple' || q.type === 'matching' ? q.options : undefined,
    prompts: q.type === 'matching' ? q.prompts : undefined,
    correctAnswer: q.correctAnswer,
    unit: q.type === 'numeric' ? q.unit : undefined,
  };
}

const memory = new Map<string, ExplainReply>();

export async function getExplanation(q: Question): Promise<ExplainReply> {
  const payload = explainPayload(q);
  if (!payload) throw new Error('Для эссе подробный разбор не нужен — используйте проверку по критериям');
  const hash = await sha256Hex(explainKey(payload));
  const key = `${q.id}:${hash}`;
  const mem = memory.get(key);
  if (mem) return mem;
  if (isSupabaseConfigured) {
    const sb = await getSupabase();
    if (sb) {
      const { data } = await sb.from('question_explanations').select('explanation, key_suspect, note').eq('question_id', q.id).eq('content_hash', hash).maybeSingle();
      if (data) {
        const r = { explanation: data.explanation as string, keyLooksWrong: !!data.key_suspect, comment: (data.note as string | null) ?? '', cached: true };
        memory.set(key, r);
        return r;
      }
    }
  }
  const r = await aiExplain(payload);
  memory.set(key, r);
  return r;
}
