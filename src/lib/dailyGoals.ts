import type { Attempt, PracticeSessionResult, Profile, SubjectId } from '@/types';
import { SUBJECT_MAP } from '@/data/subjects';
import { dayKey } from './date';

export interface DailyGoal {
  id: string;
  title: string;
  hint: string;
  progress: number;
  target: number;
  link: string;
}

export function dailyGoals(profile: Profile, attempts: Attempt[], sessions: PracticeSessionResult[], today = new Date()): DailyGoal[] {
  const k = dayKey(today);
  const todays = attempts.filter((a) => dayKey(a.date) === k);
  const main: SubjectId = profile.profileSubjects[0];
  const mainCount = todays.filter((a) => a.subject === main).length;
  const reviewCount = todays.filter((a) => a.mode === 'review').length;
  const todaySessions = sessions.filter((s) => dayKey(s.finishedAt) === k);
  const historySession = todaySessions.some((s) => s.subject === 'history' && s.answers.length >= 5) ? 1 : 0;
  const shortTest = todaySessions.some((s) => s.answers.length >= 10) ? 1 : 0;
  const subjAcc = SUBJECT_MAP[main].name.toLowerCase();
  return [
    { id: 'main20', title: `Решить 20 вопросов: ${subjAcc}`, hint: 'Практика по первому профильному предмету', progress: Math.min(20, mainCount), target: 20, link: `/practice?subject=${main}` },
    { id: 'mistakes10', title: 'Повторить 10 ошибок', hint: 'Режим повторения в тетради ошибок', progress: Math.min(10, reviewCount), target: 10, link: '/mistakes?review=1' },
    { id: 'history1', title: 'Пройти одну тему по истории Казахстана', hint: 'Сессия от 5 вопросов по истории', progress: historySession, target: 1, link: '/practice?subject=history' },
    { id: 'short1', title: 'Пройти короткий тест', hint: 'Любая практическая сессия от 10 вопросов', progress: shortTest, target: 1, link: '/practice' },
  ];
}
