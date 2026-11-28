import type { Question } from '@/types';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { applyModeration, getModerationRows, type ModerationRow } from '@/data/questions/bank';
import { useAppStore } from '@/store/useAppStore';
import { tr } from '@/i18n';

/**
 * Жалобы учеников на задания и общие правки банка.
 * С Supabase: жалобы — в таблице question_reports, правки для всех учеников — в question_moderation
 * (читать могут все, менять — только администратор; права проверяет база через RLS).
 * Без Supabase (локальный режим): жалобы хранятся в браузере, правки — локальные правки администратора.
 */
export type ReportReason = 'wrong_answer' | 'wording' | 'options' | 'explanation' | 'other';
export type ReportStatus = 'new' | 'fixed' | 'hidden' | 'rejected';

export const REASON_LABEL: Record<ReportReason, string> = {
  get wrong_answer() {
    return tr('Неверный правильный ответ');
  },
  get wording() {
    return tr('Ошибка или опечатка в условии');
  },
  get options() {
    return tr('Ошибка в вариантах ответа');
  },
  get explanation() {
    return tr('Ошибка в разборе');
  },
  get other() {
    return tr('Другое');
  },
};

export interface QuestionReport {
  id: string;
  questionId: string;
  reason: ReportReason;
  comment?: string;
  createdAt: string;
  status: ReportStatus;
}

export async function submitReport(questionId: string, reason: ReportReason, comment: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const text = comment.trim().slice(0, 1000);
  if (isSupabaseConfigured) {
    const sb = await getSupabase();
    if (!sb) return { ok: false, message: tr('Нет подключения к серверу') };
    const { error } = await sb.from('question_reports').insert({ question_id: questionId, reason, comment: text || null });
    if (!error) return { ok: true };
    if (error.code === '23505') return { ok: false, message: tr('Вы уже сообщили об этом задании — мы его проверим.') };
    if (error.code === 'P0001') return { ok: false, message: tr('Слишком много жалоб за сутки. Попробуйте завтра.') };
    if (error.code === '42501' || /JWT|auth/i.test(error.message)) return { ok: false, message: tr('Войдите в аккаунт, чтобы отправить сообщение.') };
    return { ok: false, message: tr('Не удалось отправить. Попробуйте позже.') };
  }
  const added = useAppStore.getState().addLocalReport({ questionId, reason, comment: text || undefined });
  return added ? { ok: true } : { ok: false, message: tr('Вы уже сообщили об этом задании — оно ждёт проверки.') };
}

/** Открытые жалобы (только для администратора). */
export async function loadOpenReports(): Promise<QuestionReport[]> {
  if (!isSupabaseConfigured) {
    return useAppStore
      .getState()
      .localReports.filter((r) => r.status === 'new')
      .map((r) => ({ id: r.id, questionId: r.questionId, reason: r.reason as ReportReason, comment: r.comment, createdAt: r.date, status: r.status }));
  }
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('question_reports').select('id, question_id, reason, comment, created_at, status').eq('status', 'new').order('created_at', { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  const reports: QuestionReport[] = (data ?? []).map((r) => ({ id: String(r.id), questionId: r.question_id, reason: r.reason as ReportReason, comment: r.comment ?? undefined, createdAt: r.created_at, status: r.status as ReportStatus }));
  // задания, где Lexi при разборе усомнился в ключе ответа
  const { data: sus } = await sb.from('question_explanations').select('question_id, note, created_at').eq('key_suspect', true).order('created_at', { ascending: false }).limit(300);
  for (const r of sus ?? []) {
    reports.push({ id: `ai-${r.question_id}-${r.created_at}`, questionId: r.question_id, reason: 'wrong_answer', comment: tr('Lexi (ИИ): {0}', r.note ?? tr('сомневается в правильном ответе')), createdAt: r.created_at, status: 'new' });
  }
  return reports;
}

/** Закрывает все открытые жалобы на задание с указанным решением. */
export async function resolveReports(questionId: string, status: Exclude<ReportStatus, 'new'>) {
  if (!isSupabaseConfigured) {
    useAppStore.getState().resolveLocalReports(questionId, status);
    return;
  }
  const sb = await getSupabase();
  if (!sb) return;
  const { error } = await sb.from('question_reports').update({ status, resolved_at: new Date().toISOString() }).eq('question_id', questionId).eq('status', 'new');
  if (error) throw new Error(error.message);
  // сомнение Lexi в ключе: отклонили — удаляем такой разбор (создастся заново), иначе снимаем отметку
  const ex =
    status === 'rejected'
      ? await sb.from('question_explanations').delete().eq('question_id', questionId).eq('key_suspect', true)
      : await sb.from('question_explanations').update({ key_suspect: false }).eq('question_id', questionId).eq('key_suspect', true);
  if (ex.error) console.warn('Отметку Lexi снять не удалось', ex.error.message);
}

/** Загружает общие правки банка (при старте; читать могут все). */
export async function loadModeration() {
  if (!isSupabaseConfigured) return;
  const sb = await getSupabase();
  if (!sb) return;
  const { data, error } = await sb.from('question_moderation').select('question_id, hidden, override, note, updated_at');
  if (error) {
    console.warn('Общие правки банка не загрузились', error.message);
    return;
  }
  applyModeration((data ?? []) as ModerationRow[]);
}

/**
 * Скрыть / вернуть / исправить задание для всех учеников.
 * В локальном режиме — правка только на этом устройстве (как обычная правка банка).
 */
export async function moderate(questionId: string, patch: { hidden?: boolean; override?: Question | null; note?: string }) {
  if (!isSupabaseConfigured) {
    const st = useAppStore.getState();
    if (patch.override) st.upsertQuestion(patch.override);
    if (patch.hidden === true) st.deleteQuestion(questionId);
    if (patch.hidden === false) st.restoreQuestion(questionId);
    return;
  }
  const sb = await getSupabase();
  if (!sb) throw new Error(tr('Нет подключения к серверу'));
  const prev = getModerationRows().find((r) => r.question_id === questionId);
  const row = {
    question_id: questionId,
    hidden: patch.hidden ?? prev?.hidden ?? false,
    override: patch.override === undefined ? (prev?.override ?? null) : patch.override,
    note: patch.note ?? prev?.note ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from('question_moderation').upsert(row, { onConflict: 'question_id' });
  if (error) throw new Error(error.message);
  applyModeration([...getModerationRows().filter((r) => r.question_id !== questionId), row]);
}
