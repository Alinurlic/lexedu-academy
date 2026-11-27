import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_QUESTIONS } from '@/data/questions';
import { applyModeration, globalOverride, isGloballyHidden } from '@/data/questions/bank';
import { allQuestions, questionById } from '@/store/useAppStore';
import type { Question } from '@/types';

const bank = { customQuestions: [] as Question[], questionOverrides: {} as Record<string, Question>, deletedQuestionIds: [] as string[] };

describe('общие правки банка (жалобы → скрыть / исправить для всех)', () => {
  afterEach(() => applyModeration([]));
  const q = DEMO_QUESTIONS.find((x) => x.type === 'single')!;

  it('скрытое задание пропадает из банка, но остаётся в карте (история ответов не ломается)', () => {
    applyModeration([{ question_id: q.id, hidden: true, override: null }]);
    expect(isGloballyHidden(q.id)).toBe(true);
    expect(allQuestions(bank).some((x) => x.id === q.id)).toBe(false);
    expect(questionById(bank).get(q.id)?.id).toBe(q.id);
  });

  it('исправленная версия применяется для всех; некорректные правки игнорируются', () => {
    const fixed = { ...q, question: 'Исправленное условие' };
    applyModeration([
      { question_id: q.id, hidden: false, override: fixed },
      { question_id: 'other-id', hidden: false, override: fixed }, // id не совпадает
      { question_id: 'broken', hidden: false, override: { id: 'broken', question: 1 } }, // не проходит схему
    ]);
    expect(globalOverride(q.id)?.question).toBe('Исправленное условие');
    expect(globalOverride('other-id')).toBeUndefined();
    expect(globalOverride('broken')).toBeUndefined();
    expect(allQuestions(bank).find((x) => x.id === q.id)?.question).toBe('Исправленное условие');
    expect(questionById(bank).get(q.id)?.question).toBe('Исправленное условие');
  });

  it('локальная правка администратора важнее общей', () => {
    applyModeration([{ question_id: q.id, hidden: false, override: { ...q, question: 'Общая правка' } }]);
    const local = { ...bank, questionOverrides: { [q.id]: { ...q, question: 'Локальная правка' } } };
    expect(allQuestions(local).find((x) => x.id === q.id)?.question).toBe('Локальная правка');
  });
});
