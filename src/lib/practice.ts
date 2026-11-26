import type { Attempt, Difficulty, Mistake, Question, SubjectId } from '@/types';
import type { ActivePractice } from '@/store/session';
import { shuffle } from './utils';

export type PoolSource = 'all' | 'unseen' | 'bookmarks' | 'mistakes';

export interface PoolFilter {
  subject: SubjectId | 'all';
  topics: string[];
  difficulty: Difficulty | 'any';
  source: PoolSource;
}

export function buildPool(questions: Question[], f: PoolFilter, ctx: { attempts: Attempt[]; bookmarks: string[]; mistakes: Mistake[] }) {
  const seen = new Set(ctx.attempts.map((a) => a.questionId));
  const bm = new Set(ctx.bookmarks);
  const mk = new Set(ctx.mistakes.filter((m) => m.status !== 'mastered').map((m) => m.questionId));
  return questions.filter((q) => {
    if (f.subject !== 'all' && q.subject !== f.subject) return false;
    if (f.topics.length && !f.topics.includes(q.topic)) return false;
    if (f.difficulty !== 'any' && q.difficulty !== f.difficulty) return false;
    if (f.source === 'unseen' && seen.has(q.id)) return false;
    if (f.source === 'bookmarks' && !bm.has(q.id)) return false;
    if (f.source === 'mistakes' && !mk.has(q.id)) return false;
    return true;
  });
}

/** Отбор вопросов: в приоритете новые и те, где чаще ошибаются. */
export function pickQuestions(pool: Question[], count: number, attempts: Attempt[]) {
  const stat = new Map<string, { n: number; c: number }>();
  for (const a of attempts) {
    const s = stat.get(a.questionId) ?? { n: 0, c: 0 };
    s.n++;
    if (a.correct) s.c++;
    stat.set(a.questionId, s);
  }
  const scored = shuffle(pool).map((q) => {
    const s = stat.get(q.id);
    const priority = !s ? 2 : 1 - s.c / s.n + Math.random() * 0.5;
    return { q, priority };
  });
  return scored
    .sort((a, b) => b.priority - a.priority)
    .slice(0, count)
    .map((x) => x.q);
}

/**
 * Быстрая практика: 10 вопросов, половина — из слабых тем (если они есть), остальное — по предметам ЕНТ ученика.
 */
export function quickPractice(questions: Question[], attempts: Attempt[], subjects: SubjectId[], weakTopicIds: string[], count = 10): ActivePractice | null {
  const rel = questions.filter((q) => subjects.includes(q.subject));
  if (!rel.length) return null;
  const weakPool = rel.filter((q) => weakTopicIds.includes(q.topic));
  const fromWeak = pickQuestions(weakPool, Math.min(Math.ceil(count / 2), weakPool.length), attempts);
  const rest = pickQuestions(rel.filter((q) => !fromWeak.includes(q)), count - fromWeak.length, attempts);
  const picked = shuffle([...fromWeak, ...rest]);
  const counts = new Map<SubjectId, number>();
  picked.forEach((q) => counts.set(q.subject, (counts.get(q.subject) ?? 0) + 1));
  const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return {
    subject: main,
    topics: [...new Set(picked.map((q) => q.topic))],
    questionIds: picked.map((q) => q.id),
    current: 0,
    entries: {},
    startedAt: new Date().toISOString(),
    timeLimitSec: null,
    label: 'Быстрая практика',
  };
}
