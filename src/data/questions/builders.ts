import type { BooleanQuestion, Difficulty, EssayQuestion, MatchingQuestion, MultipleQuestion, NumericQuestion, SingleQuestion, SubjectId, TextQuestion } from '@/types';

const DEMO_NOTE = 'Оригинальный учебный демо-вопрос LexEdu. Не является официальным заданием ЕНТ.';

type Meta = { passage?: string; tags?: string[]; audio?: string; group?: string; context?: boolean };

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
    single: (topic: string, d: Difficulty, q: string, options: string[], correct: number, expl: string, meta?: Meta): SingleQuestion => ({
      ...base(topic, d, q, expl, meta),
      type: 'single',
      options,
      correctAnswer: correct,
    }),
    multiple: (topic: string, d: Difficulty, q: string, options: string[], correct: number[], expl: string, meta?: Meta): MultipleQuestion => ({
      ...base(topic, d, q, expl, meta),
      type: 'multiple',
      options,
      correctAnswer: correct,
    }),
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
