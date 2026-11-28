import type { Answer, Question } from '@/types';
import { MATH_QUESTIONS } from './math';
import { PHYSICS_QUESTIONS } from './physics';
import { HISTORY_QUESTIONS } from './history';
import { GEOGRAPHY_QUESTIONS } from './geography';
import { MATHLIT_QUESTIONS, READING_QUESTIONS } from './literacy';
import { BIOLOGY_QUESTIONS, CHEMISTRY_QUESTIONS, ENGLISH_QUESTIONS, INFORMATICS_QUESTIONS } from './other';

import { ENT_EXTRA_QUESTIONS } from './entExtra';
import { ENT_NEW_SUBJECTS } from './entNew';
import { SAT_QUESTIONS } from './sat';
import { IELTS_QUESTIONS } from './ielts';
import { GENERATED_QUESTIONS } from './generated';
import { ENT_HISTORY_QUESTIONS } from './entHistory';
import { ENT_READING_QUESTIONS } from './entReading';
import { KK_LITERACY_QUESTIONS } from './kkLiteracy';

/** Весь встроенный банк LexEdu Academy: оригинальные демо-вопросы + сгенерированные по шаблонам. */
export const DEMO_QUESTIONS: Question[] = [
  ...MATH_QUESTIONS,
  ...PHYSICS_QUESTIONS,
  ...HISTORY_QUESTIONS,
  ...GEOGRAPHY_QUESTIONS,
  ...READING_QUESTIONS,
  ...MATHLIT_QUESTIONS,
  ...BIOLOGY_QUESTIONS,
  ...CHEMISTRY_QUESTIONS,
  ...ENGLISH_QUESTIONS,
  ...INFORMATICS_QUESTIONS,
  ...ENT_EXTRA_QUESTIONS,
  ...ENT_NEW_SUBJECTS,
  ...SAT_QUESTIONS,
  ...IELTS_QUESTIONS,
  ...ENT_HISTORY_QUESTIONS,
  ...ENT_READING_QUESTIONS,
  ...GENERATED_QUESTIONS,
  ...KK_LITERACY_QUESTIONS,
];

export const SOURCE_LABEL: Record<Question['source'], string> = {
  demo: 'Демо-вопрос',
  user: 'Мой вопрос',
  verified: 'Официальный источник',
  open: 'Открытый источник',
};

export const VERIFICATION_LABEL: Record<NonNullable<Question['verification']>, string> = {
  unverified: 'Не проверен экспертом',
  reviewed: 'Проверен',
  needs_review: 'Требует проверки',
};

export const TYPE_LABEL: Record<Question['type'], string> = {
  single: 'Один ответ',
  multiple: 'Несколько ответов',
  numeric: 'Числовой ответ',
  boolean: 'Верно / Неверно',
  matching: 'Соответствие',
  text: 'Краткий ответ',
  essay: 'Развёрнутый ответ',
};

export const DIFFICULTY_LABEL = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' } as const;

export function parseNumeric(value: string): number | null {
  const normalized = value.replace(/\s/g, '').replace(',', '.').replace('−', '-');
  if (normalized === '' || normalized === '-' || normalized === '.') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function normalizeText(s: string) {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,;:!?"'«»()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAnswered(answer: Answer | null | undefined): boolean {
  if (answer === null || answer === undefined) return false;
  if (Array.isArray(answer)) return answer.some((v) => v !== -1);
  if (typeof answer === 'string') return answer.trim().length > 0;
  return true;
}

/** Число ошибок для заданий с несколькими элементами (ЕНТ: 0 ошибок — 2 балла, 1 — 1 балл). */
function errorsOf(q: Question, answer: Answer | null | undefined): number {
  if (q.type === 'multiple') {
    const a = new Set(Array.isArray(answer) ? answer : []);
    const c = new Set(q.correctAnswer);
    let e = 0;
    for (const x of a) if (!c.has(x)) e++;
    for (const x of c) if (!a.has(x)) e++;
    return e;
  }
  if (q.type === 'matching') {
    const a = Array.isArray(answer) ? answer : [];
    return q.correctAnswer.reduce((n, c, i) => n + (a[i] === c ? 0 : 1), 0);
  }
  return checkAnswer(q, answer) ? 0 : 1;
}

export function checkAnswer(q: Question, answer: Answer | null | undefined): boolean {
  if (!isAnswered(answer)) return false;
  switch (q.type) {
    case 'single':
      return answer === q.correctAnswer;
    case 'multiple':
    case 'matching':
      return Array.isArray(answer) && errorsOf(q, answer) === 0;
    case 'numeric': {
      const n = typeof answer === 'string' ? parseNumeric(answer) : typeof answer === 'number' ? answer : null;
      if (n === null) return false;
      return Math.abs(n - q.correctAnswer) <= (q.tolerance ?? 1e-6);
    }
    case 'boolean':
      return answer === q.correctAnswer;
    case 'text':
      return typeof answer === 'string' && q.correctAnswer.some((c) => normalizeText(c) === normalizeText(answer));
    case 'essay':
      return false;
  }
}

/** Максимальный балл задания по схеме оценивания. */
export function maxPoints(q: Question, scheme: 'ent' | 'flat' = 'flat') {
  if (q.type === 'essay') return 0;
  return scheme === 'ent' && (q.type === 'multiple' || q.type === 'matching') ? 2 : 1;
}

/** Баллы за ответ. ЕНТ: соответствие и множественный выбор — 2 балла, при одной ошибке 1, иначе 0. */
export function scoreAnswer(q: Question, answer: Answer | null | undefined, scheme: 'ent' | 'flat' = 'flat') {
  if (!isAnswered(answer) || q.type === 'essay') return 0;
  if (scheme === 'ent' && (q.type === 'multiple' || q.type === 'matching')) {
    const e = errorsOf(q, answer);
    return e === 0 ? 2 : e === 1 ? 1 : 0;
  }
  return checkAnswer(q, answer) ? 1 : 0;
}

/** Эталонный ответ в формате, который принимает checkAnswer (для тестов и демо-истории). */
export function rightAnswer(q: Question): Answer | null {
  switch (q.type) {
    case 'numeric':
      return String(q.correctAnswer);
    case 'text':
      return q.correctAnswer[0];
    case 'essay':
      return null;
    default:
      return q.correctAnswer;
  }
}

export function formatAnswer(q: Question, answer: Answer | null | undefined): string {
  if (!isAnswered(answer)) return 'Нет ответа';
  switch (q.type) {
    case 'single':
      return typeof answer === 'number' ? (q.options[answer] ?? '—') : '—';
    case 'multiple':
      return Array.isArray(answer) ? answer.map((i) => q.options[i]).join('; ') : '—';
    case 'matching':
      return Array.isArray(answer) ? q.prompts.map((_, i) => `${i + 1} → ${answer[i] !== undefined && answer[i] >= 0 ? String.fromCharCode(65 + answer[i]) : '—'}`).join(', ') : '—';
    case 'numeric':
      return `${String(answer).replace('.', ',')}${q.unit ? ' ' + q.unit : ''}`;
    case 'boolean':
      return answer ? 'Верно' : 'Неверно';
    case 'text':
    case 'essay':
      return String(answer).length > 160 ? String(answer).slice(0, 160) + '…' : String(answer);
  }
}

export function formatCorrect(q: Question): string {
  switch (q.type) {
    case 'single':
      return q.options[q.correctAnswer];
    case 'multiple':
      return q.correctAnswer.map((i) => q.options[i]).join('; ');
    case 'matching':
      return q.prompts.map((_, i) => `${i + 1} → ${String.fromCharCode(65 + q.correctAnswer[i])}`).join(', ');
    case 'numeric':
      return `${String(q.correctAnswer).replace('.', ',')}${q.unit ? ' ' + q.unit : ''}`;
    case 'boolean':
      return q.correctAnswer ? 'Верно' : 'Неверно';
    case 'text':
      return q.correctAnswer.join(' / ');
    case 'essay':
      return 'Оценивается по критериям';
  }
}
