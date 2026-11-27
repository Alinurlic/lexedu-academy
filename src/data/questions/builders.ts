import type { BooleanQuestion, Difficulty, EssayQuestion, MatchingQuestion, MultipleQuestion, NumericQuestion, SingleQuestion, SubjectId, TextQuestion } from '@/types';

const DEMO_NOTE = 'Оригинальный учебный демо-вопрос LexEdu. Не является официальным заданием ЕНТ.';

type Meta = { passage?: string; tags?: string[]; audio?: string; group?: string; context?: boolean };

/** Детерминированное перемешивание вариантов по id вопроса (одинаковое при каждой загрузке). */
function seededOrder(id: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  // mulberry32 — хорошо перемешивает даже для похожих id (law-001, law-002, …)
  let a = h >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * В заданиях ЕНТ правильный ответ не должен стоять на одной и той же позиции,
 * поэтому варианты перемешиваются. В SAT/IELTS порядок сохраняется (True/False/Not Given и т. п.).
 */
const SHUFFLE = (subject: SubjectId) => !subject.startsWith('sat-') && !subject.startsWith('ielts-');

export function builders(subject: SubjectId, prefix: string) {
  let n = 0;
  const id = () => `${prefix}-${String(++n).padStart(3, '0')}`;
  const base = (topic: string, difficulty: Difficulty, question: string, explanation: string, meta?: Meta) => ({
    id: id(),
    subject,
    topic,
    difficulty,
    question,
    explanation,
    passage: meta?.passage,
    audio: meta?.audio,
    group: meta?.group,
    context: meta?.context,
    source: 'demo' as const,
    sourceNote: DEMO_NOTE,
    verification: 'unverified' as const,
    tags: meta?.tags ?? [],
  });

  return {
    single: (topic: string, d: Difficulty, q: string, options: string[], correct: number, expl: string, meta?: Meta): SingleQuestion => {
      const b = base(topic, d, q, expl, meta);
      if (!SHUFFLE(subject)) return { ...b, type: 'single', options, correctAnswer: correct };
      const order = seededOrder(b.id, options.length);
      return { ...b, type: 'single', options: order.map((i) => options[i]), correctAnswer: order.indexOf(correct) };
    },
    multiple: (topic: string, d: Difficulty, q: string, options: string[], correct: number[], expl: string, meta?: Meta): MultipleQuestion => {
      const b = base(topic, d, q, expl, meta);
      if (!SHUFFLE(subject)) return { ...b, type: 'multiple', options, correctAnswer: correct };
      const order = seededOrder(b.id, options.length);
      return { ...b, type: 'multiple', options: order.map((i) => options[i]), correctAnswer: correct.map((c) => order.indexOf(c)).sort((x, y) => x - y) };
    },
    numeric: (topic: string, d: Difficulty, q: string, correct: number, expl: string, meta?: Meta & { unit?: string; tolerance?: number }): NumericQuestion => ({
      ...base(topic, d, q, expl, meta),
      type: 'numeric',
      correctAnswer: correct,
      unit: meta?.unit,
      tolerance: meta?.tolerance,
    }),
    matching: (topic: string, d: Difficulty, q: string, prompts: string[], options: string[], correct: number[], expl: string, meta?: Meta): MatchingQuestion => ({
      ...base(topic, d, q, expl, meta),
      type: 'matching',
      prompts,
      options,
      correctAnswer: correct,
    }),
    text: (topic: string, d: Difficulty, q: string, accepted: string[], expl: string, meta?: Meta & { wordLimit?: number }): TextQuestion => ({
      ...base(topic, d, q, expl, meta),
      type: 'text',
      correctAnswer: accepted,
      wordLimit: meta?.wordLimit,
    }),
    essay: (topic: string, d: Difficulty, q: string, task: EssayQuestion['task'], minWords: number, expl: string, meta?: Meta): EssayQuestion => ({
      ...base(topic, d, q, expl, meta),
      type: 'essay',
      task,
      minWords,
    }),
    bool: (topic: string, d: Difficulty, q: string, correct: boolean, expl: string, meta?: Meta): BooleanQuestion => ({
      ...base(topic, d, q, expl, meta),
      type: 'boolean',
      correctAnswer: correct,
    }),
  };
}
