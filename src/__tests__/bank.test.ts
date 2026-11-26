import { describe, expect, it } from 'vitest';
import { DEMO_QUESTIONS, checkAnswer, rightAnswer, scoreAnswer, maxPoints } from '@/data/questions';
import { GENERATED_QUESTIONS } from '@/data/questions/generated';
import { SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import type { Question } from '@/types';

describe('сгенерированные задания', () => {
  it('корректны: уникальные id и варианты, правильный ответ на месте', () => {
    const ids = new Set<string>();
    for (const q of GENERATED_QUESTIONS) {
      expect(ids.has(q.id), q.id).toBe(false);
      ids.add(q.id);
      expect(TOPIC_MAP[q.topic]?.subject, q.id).toBe(q.subject);
      if (q.type === 'single') {
        expect(new Set(q.options).size, `${q.id}: ${q.options.join(' | ')}`).toBe(q.options.length);
        expect(q.correctAnswer, q.id).toBeGreaterThanOrEqual(0);
        expect(q.correctAnswer, q.id).toBeLessThan(q.options.length);
      }
      if (q.type === 'multiple') {
        expect(q.correctAnswer.length, q.id).toBeGreaterThan(0);
        expect(new Set(q.options).size, q.id).toBe(q.options.length);
      }
      if (q.type === 'matching') {
        expect(q.correctAnswer.length, q.id).toBe(q.prompts.length);
        q.correctAnswer.forEach((c) => expect(c, q.id).toBeGreaterThanOrEqual(0));
        expect(new Set(q.correctAnswer).size, q.id).toBe(q.correctAnswer.length);
      }
      expect(checkAnswer(q, rightAnswer(q)), q.id).toBe(true);
      expect(q.question).not.toMatch(/NaN|undefined|Infinity/);
      expect(q.explanation).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});

describe('баллы ЕНТ за задания с несколькими элементами', () => {
  const multi = DEMO_QUESTIONS.find((q) => q.type === 'multiple' && q.correctAnswer.length >= 2) as Extract<Question, { type: 'multiple' }>;
  const match = DEMO_QUESTIONS.find((q) => q.type === 'matching') as Extract<Question, { type: 'matching' }>;
  it('множественный выбор: 2 / 1 / 0', () => {
    expect(maxPoints(multi, 'ent')).toBe(2);
    expect(scoreAnswer(multi, multi.correctAnswer, 'ent')).toBe(2);
    expect(scoreAnswer(multi, multi.correctAnswer.slice(1), 'ent')).toBe(1);
    expect(scoreAnswer(multi, [], 'ent')).toBe(0);
    expect(scoreAnswer(multi, multi.correctAnswer.slice(1), 'flat')).toBe(0);
  });
  it('соответствие: 2 / 1 / 0', () => {
    const ok = match.correctAnswer;
    const oneWrong = ok.map((c, i) => (i === 0 ? (c + 1) % match.options.length : c));
    const twoWrong = ok.map((c, i) => (i < 2 ? (c + 1) % match.options.length : c));
    expect(scoreAnswer(match, ok, 'ent')).toBe(2);
    expect(scoreAnswer(match, oneWrong, 'ent')).toBe(1);
    expect(scoreAnswer(match, twoWrong, 'ent')).toBe(0);
  });
  it('каждый предмет есть в справочнике', () => {
    for (const q of DEMO_QUESTIONS) expect(SUBJECT_MAP[q.subject], q.id).toBeTruthy();
  });
});
