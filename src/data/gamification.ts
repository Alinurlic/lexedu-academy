export interface Level {
  index: number;
  name: string;
  minXp: number;
}

export const LEVELS: Level[] = [
  { index: 1, name: 'Beginner', minXp: 0 },
  { index: 2, name: 'Explorer', minXp: 500 },
  { index: 3, name: 'Apprentice', minXp: 2000 },
  { index: 4, name: 'Scholar', minXp: 5000 },
  { index: 5, name: 'Expert', minXp: 10000 },
  { index: 6, name: 'Master', minXp: 20000 },
  { index: 7, name: 'Elite', minXp: 35000 },
  { index: 8, name: 'Legend', minXp: 60000 },
];

export const LEVEL_RU: Record<string, string> = {
  Beginner: 'Новичок',
  Explorer: 'Исследователь',
  Apprentice: 'Ученик',
  Scholar: 'Знаток',
  Expert: 'Эксперт',
  Master: 'Мастер',
  Elite: 'Элита',
  Legend: 'Легенда',
};

export function levelFor(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  const next = LEVELS.find((l) => l.minXp > xp) ?? null;
  const progress = next ? (xp - current.minXp) / (next.minXp - current.minXp) : 1;
  return { current, next, progress, toNext: next ? next.minXp - xp : 0 };
}

/** Начисление XP — умеренное, чтобы не отвлекать от учёбы. */
export const XP = {
  correct: 10,
  correctHardBonus: 5,
  sessionComplete: 25,
  examComplete: 100,
  dailyTask: 20,
  mistakeMastered: 15,
  mistakeReviewed: 5,
  streakDay: 10,
  plannerTask: 15,
} as const;

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  tier: 'bronze' | 'silver' | 'gold';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-steps', title: 'Первый шаг', description: 'Завершить первую практическую сессию', icon: 'rocket', xp: 50, tier: 'bronze' },
  { id: 'q100', title: 'Первые 100', description: 'Ответить на 100 вопросов', icon: 'target', xp: 100, tier: 'bronze' },
  { id: 'q500', title: 'Полтысячи', description: 'Ответить на 500 вопросов', icon: 'layers', xp: 200, tier: 'silver' },
  { id: 'q1000', title: 'Тысячник', description: 'Ответить на 1000 вопросов', icon: 'mountain', xp: 400, tier: 'gold' },
  { id: 'streak7', title: 'Неделя в ритме', description: 'Заниматься 7 дней подряд', icon: 'flame', xp: 150, tier: 'silver' },
  { id: 'streak30', title: 'Железная дисциплина', description: 'Заниматься 30 дней подряд', icon: 'flame', xp: 500, tier: 'gold' },
  { id: 'perfect', title: 'Без единой ошибки', description: '100% точности в сессии из 10+ вопросов', icon: 'sparkles', xp: 150, tier: 'silver' },
  { id: 'exam1', title: 'Боевое крещение', description: 'Пройти первый пробный экзамен', icon: 'clipboard', xp: 100, tier: 'bronze' },
  { id: 'exam10', title: 'Ветеран пробников', description: 'Пройти 10 пробных экзаменов', icon: 'medal', xp: 400, tier: 'gold' },
  { id: 'mistakes10', title: 'Работа над ошибками', description: 'Освоить 10 ошибок в тетради ошибок', icon: 'check', xp: 150, tier: 'silver' },
  { id: 'subject-complete', title: 'Предмет закрыт', description: 'Завершить все темы одного предмета', icon: 'book', xp: 300, tier: 'gold' },
  { id: 'planner', title: 'Стратег', description: 'Выполнить 20 задач из плана', icon: 'calendar', xp: 150, tier: 'silver' },
  { id: 'score100', title: 'Сотка', description: 'Прогноз балла ЕНТ достиг 100', icon: 'trophy', xp: 300, tier: 'gold' },
];
