import type { Attempt, ExamResult, Profile } from '@/types';
import { addDays, dayKey, startOfWeek } from './date';
import { tr } from '@/i18n';

export interface WeeklyGoal {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  xp: number;
  link: string;
}

/** Недельные цели считаются из реальной активности текущей недели (Пн–Вс). */
export function weeklyGoals(s: { profile: Profile; attempts: Attempt[]; studyLog: Record<string, number>; exams: ExamResult[] }, now = new Date()): WeeklyGoal[] {
  const ws = startOfWeek(now);
  const from = ws.toISOString();
  const to = addDays(ws, 7).toISOString();
  const inWeek = (iso: string) => iso >= from && iso < to;
  const weekAttempts = s.attempts.filter((a) => inWeek(a.date));
  const keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(ws, i)));
  const minutes = Math.round(keys.reduce((sum, k) => sum + (s.studyLog[k] ?? 0), 0) / 60);
  const activeDays = keys.filter((k) => (s.studyLog[k] ?? 0) > 0 || weekAttempts.some((a) => dayKey(a.date) === k)).length;
  const reviews = weekAttempts.filter((a) => a.mode === 'review').length;
  const exams = s.exams.filter((e) => inWeek(e.finishedAt)).length;
  const qTarget = Math.max(30, Math.round((s.profile.dailyQuestionGoal * 3.5) / 10) * 10);
  const mTarget = Math.max(60, Math.round((s.profile.dailyGoalMin * 4) / 60) * 60);
  return [
    { id: 'w-questions', title: tr('{0} вопросов за неделю', qTarget), progress: Math.min(qTarget, weekAttempts.length), target: qTarget, unit: tr('вопр.'), xp: 60, link: '/practice' },
    { id: 'w-minutes', title: tr('{0} ч занятий', Math.round(mTarget / 60)), progress: Math.min(mTarget, minutes), target: mTarget, unit: tr('мин'), xp: 60, link: '/planner' },
    { id: 'w-days', title: tr('Заниматься 5 дней из 7'), progress: Math.min(5, activeDays), target: 5, unit: tr('дн.'), xp: 50, link: '/' },
    { id: 'w-review', title: tr('Повторить 20 ошибок'), progress: Math.min(20, reviews), target: 20, unit: tr('повт.'), xp: 40, link: '/mistakes?review=1' },
    { id: 'w-exam', title: tr('Пройти пробный экзамен'), progress: Math.min(1, exams), target: 1, unit: '', xp: 50, link: '/exams' },
  ];
}
