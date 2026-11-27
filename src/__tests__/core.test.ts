import { describe, expect, it } from 'vitest';
import { DEMO_QUESTIONS, checkAnswer, parseNumeric, rightAnswer } from '@/data/questions';
import { DEFAULT_EXAM_FORMAT, PROFILE_COMBOS, SUBJECT_MAP, TOPIC_MAP, formatMax } from '@/data/subjects';
import { ieltsBand, ieltsOverall, planEntFull, planIelts, planSat, satModule2, satSectionScore, scoreExam, scoreFull } from '@/lib/exam';
import { predictScore } from '@/lib/analytics';
import { solveEquation } from '@/lib/assistant/solver';
import { GENERATOR_LIST, generateTask } from '@/lib/assistant/generators';
import { DEFAULT_PROFILE } from '@/lib/demo';
import type { Attempt, ExamConfig, Question } from '@/types';

describe('банк демо-вопросов', () => {
  it('id уникальны, темы существуют и принадлежат предмету', () => {
    const ids = new Set<string>();
    for (const q of DEMO_QUESTIONS) {
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      expect(TOPIC_MAP[q.topic]?.subject).toBe(q.subject);
      expect(q.source).toBe('demo');
      expect(q.explanation.length).toBeGreaterThan(5);
    }
  });
  it('правильные ответы ссылаются на существующие варианты', () => {
    for (const q of DEMO_QUESTIONS) {
      if (q.type === 'single') expect(q.correctAnswer).toBeLessThan(q.options.length);
      if (q.type === 'multiple') q.correctAnswer.forEach((i) => expect(i).toBeLessThan(q.options.length));
    }
  });
  it('выполнены минимальные объёмы по предметам', () => {
    const n = (s: string) => DEMO_QUESTIONS.filter((q) => q.subject === s).length;
    expect(n('math')).toBeGreaterThanOrEqual(20);
    expect(n('physics')).toBeGreaterThanOrEqual(20);
    expect(n('history')).toBeGreaterThanOrEqual(15);
    expect(n('geography')).toBeGreaterThanOrEqual(15);
    expect(n('reading')).toBeGreaterThanOrEqual(10);
    expect(n('mathlit')).toBeGreaterThanOrEqual(10);
  });
});

describe('проверка ответов', () => {
  const single = DEMO_QUESTIONS.find((q) => q.type === 'single')!;
  const multiple = DEMO_QUESTIONS.find((q) => q.type === 'multiple')! as Extract<Question, { type: 'multiple' }>;
  const numeric = DEMO_QUESTIONS.find((q) => q.type === 'numeric' && q.correctAnswer === 7.5)! as Extract<Question, { type: 'numeric' }>;
  const bool = DEMO_QUESTIONS.find((q) => q.type === 'boolean')! as Extract<Question, { type: 'boolean' }>;
  it('один вариант', () => {
    expect(checkAnswer(single, single.correctAnswer as number)).toBe(true);
    expect(checkAnswer(single, ((single.correctAnswer as number) + 1) % 4)).toBe(false);
    expect(checkAnswer(single, null)).toBe(false);
  });
  it('несколько вариантов — порядок не важен, частичный ответ неверен', () => {
    expect(checkAnswer(multiple, [...multiple.correctAnswer].reverse())).toBe(true);
    expect(checkAnswer(multiple, multiple.correctAnswer.slice(0, 1))).toBe(multiple.correctAnswer.length === 1);
    expect(checkAnswer(multiple, [])).toBe(false);
  });
  it('числовой — запятая, точка, пробелы, минус', () => {
    expect(checkAnswer(numeric, '7,5')).toBe(true);
    expect(checkAnswer(numeric, ' 7.5 ')).toBe(true);
    expect(checkAnswer(numeric, '7')).toBe(false);
    expect(parseNumeric('−3')).toBe(-3);
    expect(parseNumeric('abc')).toBeNull();
  });
  it('верно/неверно', () => {
    expect(checkAnswer(bool, bool.correctAnswer)).toBe(true);
    expect(checkAnswer(bool, !bool.correctAnswer)).toBe(false);
  });
});

describe('подсчёт баллов экзамена', () => {
  const math = DEMO_QUESTIONS.filter((q) => q.subject === 'math' && q.type !== 'multiple' && q.type !== 'matching').slice(0, 10);
  const qmap = new Map(math.map((q) => [q.id, q]));
  const config: ExamConfig = { title: 't', kind: 'subject', sections: [{ subject: 'math', count: 10, maxPoints: 50 }], timeLimitMin: 20 };
  const right = (q: Question) => rightAnswer(q);
  it('все верно — максимум', () => {
    const answers = Object.fromEntries(math.map((q) => [q.id, right(q)]));
    expect(scoreExam(config, math.map((q) => q.id), answers, qmap).score).toBe(50);
  });
  it('пустые ответы — ноль, половина — пропорционально', () => {
    expect(scoreExam(config, math.map((q) => q.id), {}, qmap).score).toBe(0);
    const half = Object.fromEntries(math.slice(0, 5).map((q) => [q.id, right(q)]));
    const r = scoreExam(config, math.map((q) => q.id), half, qmap);
    expect(r.score).toBe(25);
    expect(r.maxScore).toBe(50);
    expect(r.sectionScores[0].correct).toBe(5);
  });
});

describe('формат ЕНТ', () => {
  it('по умолчанию 140 баллов', () => expect(formatMax(DEFAULT_EXAM_FORMAT)).toBe(140));
  it('полный ЕНТ собирается по регламенту: 120 заданий, 240 минут, 140 баллов', () => {
    // «Казахский язык + литература» есть только в открытом банке — эта пара проверяется в openBank.test.ts
    for (const pair of PROFILE_COMBOS.filter((p) => !p.includes('kazakh'))) {
      const plan = planEntFull(DEFAULT_EXAM_FORMAT, [pair[0], pair[1]], DEMO_QUESTIONS);
      const ids = plan.modules[0].questionIds;
      expect(ids.length, pair.join('+')).toBe(120);
      expect(new Set(ids).size).toBe(120);
      expect(plan.config.timeLimitMin).toBe(240);
      expect(plan.shortened).toBeUndefined();
      const qmap = new Map(DEMO_QUESTIONS.map((q) => [q.id, q]));
      const profile = ids.filter((id) => qmap.get(id)!.subject === pair[0]).map((id) => qmap.get(id)!);
      expect(profile.length).toBe(40);
      expect(profile.filter((q) => q.type === 'matching').length).toBe(5);
      expect(profile.filter((q) => q.type === 'multiple').length).toBe(5);
      expect(profile.filter((q) => q.type === 'single' && q.context).length).toBe(5);
      // все ответы верны → ровно 140 баллов
      const answers = Object.fromEntries(ids.map((id) => [id, rightAnswer(qmap.get(id)!)]));
      const sc = scoreFull(plan.config, plan.modules, answers, qmap);
      expect(sc.score).toBe(140);
      expect(sc.maxScore).toBe(140);
    }
  });
  it('SAT: модули 27/27/22/22, адаптивный второй модуль, шкала 400–1600', () => {
    const plan = planSat(DEMO_QUESTIONS, 'full');
    expect(plan.modules.map((m) => m.questionIds.length)).toEqual([27, 0, 22, 0]);
    const qmap = new Map(DEMO_QUESTIONS.map((q) => [q.id, q]));
    const used = new Set(plan.modules.flatMap((m) => m.questionIds));
    const allRight = Object.fromEntries(plan.modules[0].questionIds.map((id) => [id, rightAnswer(qmap.get(id)!)]));
    const m2 = satModule2('sat-rw', DEMO_QUESTIONS, used, plan.modules[0].questionIds, allRight, qmap);
    expect(m2.adaptive).toBe('hard');
    expect(m2.ids.length).toBe(27);
    expect(m2.ids.some((id) => used.has(id))).toBe(false);
    expect(satSectionScore(54, 54, 'hard')).toBe(800);
    expect(satSectionScore(0, 54, 'easy')).toBe(200);
  });
  it('IELTS: 40/40 вопросов, перевод в band и округление итога', () => {
    const plan = planIelts(DEMO_QUESTIONS, 'full');
    expect(plan.modules.map((m) => m.questionIds.length)).toEqual([40, 40, 2]);
    expect(ieltsBand('listening', 40)).toBe(9);
    expect(ieltsBand('reading', 30)).toBe(7);
    expect(ieltsBand('listening', 30)).toBe(7);
    expect(ieltsOverall([6.5, 6.5, 5, 7])).toBe(6.5); // 6.25 → 6.5
    expect(ieltsOverall([4, 3.5, 4, 4])).toBe(4); // 3.875 → 4
    expect(ieltsOverall([6, 6, 6, 5.5])).toBe(6); // 5.875 → 6
    expect(ieltsOverall([7, 7, 6.5, 6.5])).toBe(7); // 6.75 → 7
    expect(ieltsOverall([6, 6, 6, 6.5])).toBe(6); // 6.125 → 6
  });
  it('прогноз учитывает изменённый формат', () => {
    const custom = { ...DEFAULT_EXAM_FORMAT, blocks: DEFAULT_EXAM_FORMAT.blocks.slice(0, 1) };
    const attempts: Attempt[] = Array.from({ length: 30 }, (_, i) => ({ id: String(i), questionId: 'x', subject: 'history', topic: 'hist-khanate', difficulty: 'medium', correct: true, timeMs: 1000, date: new Date(2026, 0, 1, 0, i).toISOString(), mode: 'practice' }));
    const p = predictScore(attempts, DEFAULT_PROFILE, custom);
    expect(p.max).toBe(20);
    expect(p.total).toBeGreaterThan(15);
    expect(p.total).toBeLessThanOrEqual(20);
  });
});

describe('Lexi: решатель и генератор', () => {
  it('линейное уравнение', () => expect(solveEquation('3x - 7 = 11')?.answer).toBe('x = 6'));
  it('квадратное уравнение', () => expect(solveEquation('x^2 - 5x + 6 = 0')?.answer).toBe('x₁ = 2, x₂ = 3'));
  it('нет корней', () => expect(solveEquation('x^2 + 1 = 0')?.answer).toBe('Действительных корней нет'));
  it('мусор не разбирается', () => expect(solveEquation('привет = мир')).toBeNull());
  it('генераторы дают конечные числовые ответы и шаги', () => {
    for (const g of GENERATOR_LIST)
      for (let i = 0; i < 30; i++) {
        const t = generateTask({ kind: g.id });
        expect(Number.isFinite(t.answer)).toBe(true);
        expect(t.steps.length).toBeGreaterThan(0);
        expect(SUBJECT_MAP[t.subject]).toBeTruthy();
        expect(TOPIC_MAP[t.topic]).toBeTruthy();
      }
  });
  it('ответ сгенерированного линейного уравнения действительно корень', () => {
    for (let i = 0; i < 50; i++) {
      const t = generateTask({ kind: 'linear' });
      const sol = solveEquation(t.question.replace('Решите уравнение ', '').replace('.', ''));
      expect(sol?.answer).toBe(`x = ${String(t.answer).replace('-', '−')}`);
    }
  });
});
