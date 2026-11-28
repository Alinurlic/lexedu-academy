import { describe, expect, it } from 'vitest';
import { KK_LITERACY_QUESTIONS } from '@/data/questions/kkLiteracy';
import { questionWithPolicySchema } from '@/lib/schemas';
import { TOPIC_MAP } from '@/data/subjects';

/** Последнее число в строке: «12 750 теңге» → 12750, «5,8 км» → 5,8, «12:45» → 45. */
const lastNum = (s: string) => {
  const m = s.replace(/(\d)\s(?=\d{3}\b)/g, '$1').match(/\d+(?:,\d+)?/g);
  return m?.[m.length - 1];
};

describe('казахская матграмотность и грамотность чтения', () => {
  const ml = KK_LITERACY_QUESTIONS.filter((q) => q.subject === 'mathlit');
  const read = KK_LITERACY_QUESTIONS.filter((q) => q.subject === 'reading');

  it('хватает на полный ҰБТ без добора: не меньше 40 заданий каждого блока', () => {
    expect(ml.length).toBeGreaterThanOrEqual(200);
    expect(read.length).toBeGreaterThanOrEqual(50);
    expect(ml.filter((q) => q.context).length).toBeGreaterThanOrEqual(40);
  });

  it('все задания на казахском, валидны и с разными вариантами', () => {
    for (const q of KK_LITERACY_QUESTIONS) {
      expect(q.lang, q.id).toBe('kk');
      expect(questionWithPolicySchema.safeParse(q).success, q.id).toBe(true);
      expect(TOPIC_MAP[q.topic]?.subject, q.id).toBe(q.subject);
      expect(q.type, q.id).toBe('single');
      if (q.type !== 'single') continue;
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(q.correctAnswer, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctAnswer, q.id).toBeLessThan(4);
      expect(q.explanation.length, q.id).toBeGreaterThan(5);
    }
  });

  it('матграмотность: ответ в разборе совпадает с ключом', () => {
    for (const q of ml) {
      if (q.type !== 'single') continue;
      expect(lastNum(q.explanation), `${q.id}: ${q.explanation} / ${q.options[q.correctAnswer]}`).toBe(lastNum(q.options[q.correctAnswer]));
    }
  });

  it('матграмотность: условия не повторяются', () => {
    const sigs = ml.map((q) => `${q.passage ?? ''}|${q.question}`);
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it('чтение: 10 текстов по 5 вопросов, правильный ответ не всегда на одном месте', () => {
    const byPassage = new Map<string, number>();
    for (const q of read) byPassage.set(q.passage!, (byPassage.get(q.passage!) ?? 0) + 1);
    expect(byPassage.size).toBe(10);
    expect([...byPassage.values()].every((n) => n === 5)).toBe(true);
    const positions = new Set(read.map((q) => (q.type === 'single' ? q.correctAnswer : -1)));
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });
});
