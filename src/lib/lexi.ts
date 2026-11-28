import lexi_default from '@/assets/lexi/lexi-default.webp';
import lexi_graduate from '@/assets/lexi/lexi-graduate.webp';
import lexi_thinking from '@/assets/lexi/lexi-thinking.webp';
import lexi_celebrating from '@/assets/lexi/lexi-celebrating.webp';
import lexi_studying from '@/assets/lexi/lexi-studying.webp';
import lexi_resting from '@/assets/lexi/lexi-resting.webp';
import lexi_perfect from '@/assets/lexi/lexi-perfect.webp';
import lexi_sad from '@/assets/lexi/lexi-sad.webp';
import lexi_confident from '@/assets/lexi/lexi-confident.webp';
import lexi_exam from '@/assets/lexi/lexi-exam.webp';
import lexi_reading from '@/assets/lexi/lexi-reading.webp';
import lexi_motivating from '@/assets/lexi/lexi-motivating.webp';
import lexiAvatar from '@/assets/lexi/lexi-avatar.webp';
import { tr } from '@/i18n';

/**
 * Lexi — официальный маскот LexEdu.
 * Стикеры вырезаны из оригинального листа (public/assets/lexi). Текст на стикере совпадает с настроением,
 * поэтому каждое настроение используется только в подходящем контексте.
 */
export type LexiMood =
  | 'default' // «Отлично!» — большой палец
  | 'graduate' // «Ты молодец!» — шапка выпускника
  | 'thinking' // «Давай разберёмся!» — очки, знак вопроса
  | 'celebrating' // «Ура!»
  | 'studying' // «Отличная работа!» — ноутбук
  | 'resting' // «Отдыхай и возвращайся!»
  | 'perfect' // «Идеально!» — табличка 100%
  | 'sad' // «Не сдавайся...»
  | 'confident' // «Ты можешь больше!» — очки
  | 'exam' // «Удачи на ЕНТ!» — рюкзак
  | 'reading' // «Учись с LexEdu!» — книга
  | 'motivating'; // «Вперёд к цели!»

export const LEXI_SRC: Record<LexiMood, string> = {
  default: lexi_default,
  graduate: lexi_graduate,
  thinking: lexi_thinking,
  celebrating: lexi_celebrating,
  studying: lexi_studying,
  resting: lexi_resting,
  perfect: lexi_perfect,
  sad: lexi_sad,
  confident: lexi_confident,
  exam: lexi_exam,
  reading: lexi_reading,
  motivating: lexi_motivating,
};

export const LEXI_ALT: Record<LexiMood, string> = {
  get default() {
    return tr('Lexi показывает большой палец: «Отлично!»');
  },
  get graduate() {
    return tr('Lexi в шапке выпускника: «Ты молодец!»');
  },
  get thinking() {
    return tr('Lexi в очках размышляет: «Давай разберёмся!»');
  },
  get celebrating() {
    return tr('Lexi радуется: «Ура!»');
  },
  get studying() {
    return tr('Lexi за ноутбуком: «Отличная работа!»');
  },
  get resting() {
    return tr('Lexi отдыхает: «Отдыхай и возвращайся!»');
  },
  get perfect() {
    return tr('Lexi с табличкой 100%: «Идеально!»');
  },
  get sad() {
    return tr('Lexi грустит: «Не сдавайся...»');
  },
  get confident() {
    return tr('Lexi в солнцезащитных очках: «Ты можешь больше!»');
  },
  get exam() {
    return tr('Lexi с рюкзаком: «Удачи на ЕНТ!»');
  },
  get reading() {
    return tr('Lexi с книгой: «Учись с LexEdu!»');
  },
  get motivating() {
    return tr('Решительный Lexi: «Вперёд к цели!»');
  },
};

export const LEXI_AVATAR = lexiAvatar;

export type LexiContext =
  | 'correct'
  | 'incorrect'
  | 'sessionGreat'
  | 'sessionGood'
  | 'sessionWeak'
  | 'perfect'
  | 'examGreat'
  | 'examGood'
  | 'examWeak'
  | 'dailyDone'
  | 'taskDone'
  | 'reviewDone'
  | 'empty'
  | 'recommend'
  | 'greetingMorning'
  | 'greeting'
  | 'greetingStreak'
  | 'examSoon'
  | 'rest'
  | 'achievement';

interface Line {
  mood: LexiMood;
  text: string;
}

const LINES: Record<LexiContext, Line[]> = {
  correct: [
    { mood: 'default', get text() {
    return tr('Отлично! Так держать!');
  } },
    { mood: 'celebrating', get text() {
    return tr('Верно! Ты уверенно идёшь вперёд.');
  } },
    { mood: 'studying', get text() {
    return tr('Правильно! Хорошая работа.');
  } },
  ],
  incorrect: [
    { mood: 'thinking', get text() {
    return tr('Не переживай. Давай разберём решение!');
  } },
    { mood: 'sad', get text() {
    return tr('Ошибки — часть пути. Посмотри объяснение, и в следующий раз получится.');
  } },
    { mood: 'thinking', get text() {
    return tr('Почти! Разберём, где была ловушка.');
  } },
  ],
  sessionGreat: [
    { mood: 'celebrating', get text() {
    return tr('Ура! Отличный результат. Ещё один шаг к цели!');
  } },
    { mood: 'graduate', get text() {
    return tr('Ты молодец! Ещё один шаг к цели.');
  } },
  ],
  sessionGood: [
    { mood: 'studying', get text() {
    return tr('Хорошая работа! Разберём ошибки — и будет ещё лучше.');
  } },
    { mood: 'confident', get text() {
    return tr('Неплохо! Ты можешь больше — давай закрепим слабые темы.');
  } },
  ],
  sessionWeak: [
    { mood: 'sad', get text() {
    return tr('Не сдавайся! Разбери ошибки, и следующая попытка будет лучше.');
  } },
    { mood: 'thinking', get text() {
    return tr('Давай разберёмся вместе: начнём с самой трудной темы.');
  } },
  ],
  perfect: [{ mood: 'perfect', get text() {
    return tr('Идеально! Ни одной ошибки.');
  } }],
  examGreat: [{ mood: 'celebrating', get text() {
    return tr('Ура! Это сильный результат. Так держать на настоящем ЕНТ!');
  } }],
  examGood: [{ mood: 'confident', get text() {
    return tr('Хороший экзамен! Ты можешь больше — подтяни слабые блоки.');
  } }],
  examWeak: [{ mood: 'thinking', get text() {
    return tr('Давай разберёмся, где потерялись баллы, и составим план.');
  } }],
  dailyDone: [{ mood: 'graduate', get text() {
    return tr('Все задачи на сегодня выполнены. Ты молодец!');
  } }],
  taskDone: [{ mood: 'graduate', get text() {
    return tr('Ты молодец! Ещё один шаг к цели.');
  } }],
  reviewDone: [{ mood: 'studying', get text() {
    return tr('Отличная работа над ошибками!');
  } }],
  empty: [{ mood: 'reading', get text() {
    return tr('Здесь пока пусто. Начнём?');
  } }],
  recommend: [
    { mood: 'confident', get text() {
    return tr('Ты можешь больше! Вот что стоит подтянуть.');
  } },
    { mood: 'thinking', get text() {
    return tr('Я посмотрел твои ответы. Давай разберёмся с этим.');
  } },
  ],
  greetingMorning: [{ mood: 'reading', get text() {
    return tr('Сегодня тоже можно стать лучше!');
  } }],
  greeting: [
    { mood: 'motivating', get text() {
    return tr('Вперёд к своей цели!');
  } },
    { mood: 'reading', get text() {
    return tr('Сегодня тоже можно стать лучше!');
  } },
  ],
  greetingStreak: [{ mood: 'default', get text() {
    return tr('Серия продолжается — отлично!');
  } }],
  examSoon: [{ mood: 'exam', get text() {
    return tr('ЕНТ уже близко. Удачи — ты готовишься правильно!');
  } }],
  rest: [{ mood: 'resting', get text() {
    return tr('Ты сегодня много занимался. Отдыхай и возвращайся!');
  } }],
  achievement: [{ mood: 'celebrating', get text() {
    return tr('Ура! Новое достижение!');
  } }],
};

const lastIndex: Partial<Record<LexiContext, number>> = {};

/** Выбирает реплику Lexi для контекста, избегая повтора одной и той же подряд. */
export function lexiSay(ctx: LexiContext, seed?: number): Line {
  const list = LINES[ctx];
  if (list.length === 1) return list[0];
  let i = seed !== undefined ? Math.abs(seed) % list.length : Math.floor(Math.random() * list.length);
  if (seed === undefined && i === lastIndex[ctx]) i = (i + 1) % list.length;
  lastIndex[ctx] = i;
  return list[i];
}
