import { describe, expect, it } from 'vitest';
import { loadOpenQuestions } from '@/data/questions/open';
import { DEMO_QUESTIONS } from '@/data/questions';
import { forStudy, questionLang } from '@/data/questions/lang';
import { DEFAULT_EXAM_FORMAT, PROFILE_COMBOS, TOPIC_MAP } from '@/data/subjects';
import { questionWithPolicySchema } from '@/lib/schemas';
import { planEntFull } from '@/lib/exam';
import type { Question } from '@/types';

describe('открытый банк KazMMLU (русский и казахский)', async () => {
  const open = await loadOpenQuestions();
  const all = [...DEMO_QUESTIONS, ...open];
  const qmap = new Map<string, Question>(all.map((q) => [q.id, q]));

  it('загружаются обе языковые части, всего в банке больше 20 000 заданий', () => {
    const ru = open.filter((q) => q.lang === 'ru').length;
    const kk = open.filter((q) => q.lang === 'kk').length;
    expect(ru).toBeGreaterThan(9000);
    expect(kk).toBeGreaterThan(9000);
    expect(all.length).toBeGreaterThan(20000);
  });

  it('все задания валидны: схема, ключ, тема, источник, без LaTeX, уникальные id', () => {
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

  it('id русских заданий не изменились (на них ссылаются попытки учеников)', () => {
    expect(open.some((q) => /^km-history-\d+$/.test(q.id) && q.lang === 'ru')).toBe(true);
    expect(open.some((q) => /^km-kk-history-\d+$/.test(q.id) && q.lang === 'kk')).toBe(true);
  });

  const langsOf = (ids: string[]) => ids.map((id) => questionLang(qmap.get(id)!));

  it('ЕНТ на русском: 120 заданий без казахских (кроме пары «казахский язык + литература»)', () => {
    for (const pair of PROFILE_COMBOS) {
      const plan = planEntFull(DEFAULT_EXAM_FORMAT, [pair[0], pair[1]], all, 'ru');
      const ids = plan.modules.flatMap((m) => m.questionIds);
      expect(ids.length, pair.join('+')).toBe(120);
      const kk = ids.filter((id) => questionLang(qmap.get(id)!) === 'kk' && !['kazakh', 'kazlit'].includes(qmap.get(id)!.subject));
      expect(kk, pair.join('+')).toHaveLength(0);
    }
  });

  it('ЕНТ на казахском: 120 заданий; на русском — только добор матграмотности и чтения (с пометкой)', () => {
    for (const pair of PROFILE_COMBOS) {
      const plan = planEntFull(DEFAULT_EXAM_FORMAT, [pair[0], pair[1]], all, 'kk');
      const ids = plan.modules.flatMap((m) => m.questionIds);
      expect(ids.length, pair.join('+')).toBe(120);
      const ruOutside = ids.filter((id) => {
        const q = qmap.get(id)!;
        return questionLang(q) === 'ru' && !['mathlit', 'reading', 'russian', 'ruslit'].includes(q.subject);
      });
      expect(ruOutside, pair.join('+')).toHaveLength(0);
      // история Казахстана — полностью на казахском
      const hist = ids.filter((id) => qmap.get(id)!.subject === 'history');
      expect(langsOf(hist).every((l) => l === 'kk')).toBe(true);
      expect(plan.shortened ?? '').toMatch(/на другом языке/);
    }
    const kz = planEntFull(DEFAULT_EXAM_FORMAT, ['kazakh', 'kazlit'], all, 'kk');
    const prof = kz.modules.flatMap((m) => m.questionIds).filter((id) => ['kazakh', 'kazlit'].includes(qmap.get(id)!.subject));
    expect(prof).toHaveLength(80);
    expect(langsOf(prof).every((l) => l === 'kk')).toBe(true);
  });

  it('forStudy: свой язык первым, добор только там, где своих мало', () => {
    const { list, fallback } = forStudy(all, 'kk');
    expect(fallback.has('mathlit')).toBe(true);
    expect(fallback.has('history')).toBe(false);
    expect(list.filter((q) => q.subject === 'history').every((q) => questionLang(q) === 'kk')).toBe(true);
    const ru = forStudy(all, 'ru');
    expect(ru.list.some((q) => q.lang === 'kk' && !['kazakh', 'kazlit'].includes(q.subject))).toBe(false);
  });
});
