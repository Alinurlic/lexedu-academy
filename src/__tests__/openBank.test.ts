import { describe, expect, it } from 'vitest';
import { loadOpenQuestions } from '@/data/questions/open';
import { DEMO_QUESTIONS } from '@/data/questions';
import { DEFAULT_EXAM_FORMAT, PROFILE_COMBOS, TOPIC_MAP } from '@/data/subjects';
import { questionWithPolicySchema } from '@/lib/schemas';
import { planEntFull } from '@/lib/exam';

describe('открытый банк KazMMLU', async () => {
  const open = await loadOpenQuestions();

  it('загружается и содержит тысячи заданий', () => {
    expect(open.length).toBeGreaterThan(8000);
  });

  it('все задания валидны: схема, ключ, тема, источник, без LaTeX', () => {
    const ids = new Set<string>();
    for (const q of open) {
      expect(questionWithPolicySchema.safeParse(q).success, q.id).toBe(true);
      expect(q.type).toBe('single');
      if (q.type !== 'single') continue;
      expect(q.correctAnswer, q.id).toBeLessThan(q.options.length);
      expect(new Set(q.options).size, q.id).toBe(q.options.length);
      expect(TOPIC_MAP[q.topic]?.subject, q.id).toBe(q.subject);
      expect(q.sourceRef, q.id).toMatch(/^https?:\/\//);
      expect(`${q.question} ${q.options.join(' ')}`, q.id).not.toMatch(/\\[a-zA-Z(]/);
      expect(ids.has(q.id), q.id).toBe(false);
      ids.add(q.id);
    }
  });

  it('полный ЕНТ с открытым банком — 120 заданий для каждой комбинации профильных предметов', () => {
    const all = [...DEMO_QUESTIONS, ...open];
    for (const pair of PROFILE_COMBOS) {
      const plan = planEntFull(DEFAULT_EXAM_FORMAT, [pair[0], pair[1]], all);
      const n = plan.modules.reduce((s, m) => s + m.questionIds.length, 0);
      expect(n, pair.join('+')).toBe(120);
    }
  });
});
