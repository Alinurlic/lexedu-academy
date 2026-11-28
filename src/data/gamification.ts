import { tr } from '@/i18n';
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
  get Beginner() {
    return tr('Новичок');
  },
  get Explorer() {
    return tr('Исследователь');
  },
  get Apprentice() {
    return tr('Ученик');
  },
  get Scholar() {
    return tr('Знаток');
  },
  get Expert() {
    return tr('Эксперт');
  },
  get Master() {
    return tr('Мастер');
  },
  get Elite() {
    return tr('Элита');
  },
  get Legend() {
    return tr('Легенда');
  },
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
  { id: 'first-steps', get title() {
    return tr('Первый шаг');
  }, get description() {
    return tr('Завершить первую практическую сессию');
  }, icon: 'rocket', xp: 50, tier: 'bronze' },
  { id: 'q100', get title() {
    return tr('Первые 100');
  }, get description() {
    return tr('Ответить на 100 вопросов');
  }, icon: 'target', xp: 100, tier: 'bronze' },
  { id: 'q500', get title() {
    return tr('Полтысячи');
  }, get description() {
    return tr('Ответить на 500 вопросов');
  }, icon: 'layers', xp: 200, tier: 'silver' },
  { id: 'q1000', get title() {
    return tr('Тысячник');
  }, get description() {
    return tr('Ответить на 1000 вопросов');
  }, icon: 'mountain', xp: 400, tier: 'gold' },
  { id: 'streak7', get title() {
    return tr('Неделя в ритме');
  }, get description() {
    return tr('Заниматься 7 дней подряд');
  }, icon: 'flame', xp: 150, tier: 'silver' },
  { id: 'streak30', get title() {
    return tr('Железная дисциплина');
  }, get description() {
    return tr('Заниматься 30 дней подряд');
  }, icon: 'flame', xp: 500, tier: 'gold' },
  { id: 'perfect', get title() {
    return tr('Без единой ошибки');
  }, get description() {
    return tr('100% точности в сессии из 10+ вопросов');
  }, icon: 'sparkles', xp: 150, tier: 'silver' },
  { id: 'exam1', get title() {
    return tr('Боевое крещение');
  }, get description() {
    return tr('Пройти первый пробный экзамен');
  }, icon: 'clipboard', xp: 100, tier: 'bronze' },
  { id: 'exam10', get title() {
    return tr('Ветеран пробников');
  }, get description() {
    return tr('Пройти 10 пробных экзаменов');
  }, icon: 'medal', xp: 400, tier: 'gold' },
  { id: 'mistakes10', get title() {
    return tr('Работа над ошибками');
  }, get description() {
    return tr('Освоить 10 ошибок в тетради ошибок');
  }, icon: 'check', xp: 150, tier: 'silver' },
  { id: 'subject-complete', get title() {
    return tr('Предмет закрыт');
  }, get description() {
    return tr('Завершить все темы одного предмета');
  }, icon: 'book', xp: 300, tier: 'gold' },
  { id: 'planner', get title() {
    return tr('Стратег');
  }, get description() {
    return tr('Выполнить 20 задач из плана');
  }, icon: 'calendar', xp: 150, tier: 'silver' },
  { id: 'score100', get title() {
    return tr('Сотка');
  }, get description() {
    return tr('Прогноз балла ЕНТ достиг 100');
  }, icon: 'trophy', xp: 300, tier: 'gold' },
];
