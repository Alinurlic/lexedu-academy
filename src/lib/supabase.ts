import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Подготовленная интеграция с Supabase.
 * Приложение полностью работает без неё (LocalStorage). Клиент создаётся лениво
 * и только если заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (см. .env.example
 * и supabase/schema.sql). Ключи никогда не хранятся в коде.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  if (client) return client;
  const { createClient } = await import('@supabase/supabase-js');
  // PKCE: код подтверждения приходит в query (?code=…) и не конфликтует с hash-маршрутизацией
  client = createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  return client;
}

/** Таблицы, соответствующие локальной модели данных. */
export const TABLES = {
  profiles: 'profiles',
  questions: 'questions',
  attempts: 'attempts',
  sessions: 'practice_sessions',
  exams: 'exam_results',
  tasks: 'study_tasks',
  mistakes: 'mistakes',
  achievements: 'user_achievements',
} as const;

/** Пример синхронизации: выгрузка локального снимка в облако (используется после входа). */
export async function pushSnapshot(userId: string, snapshot: { profile: unknown; xp: number }) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, reason: 'not-configured' };
  const { error } = await sb.from(TABLES.profiles).upsert({ id: userId, data: snapshot.profile, xp: snapshot.xp, updated_at: new Date().toISOString() });
  return error ? { ok: false as const, reason: error.message } : { ok: true as const };
}
