import { LANG_LABEL, inStudyLang, studyLang, type EntLang } from '@/data/questions/lang';
import type { Answer, Difficulty, ExamConfig, ExamFormat, ExamModule, ExamResult, Question, SubjectId, Track } from '@/types';
import { checkAnswer, maxPoints, scoreAnswer } from '@/data/questions';
import { SUBJECT_MAP } from '@/data/subjects';
import { plural, shuffle, uid } from './utils';

/* ------------------------------------------------------------------ */
/* Общие помощники                                                     */
/* ------------------------------------------------------------------ */

const groupKey = (q: Question) => q.group ?? q.passage ?? q.audio ?? q.id;

/** Берёт n вопросов, не разрывая группы с общим текстом/записью (вопросы группы идут подряд). */
function takeGrouped(pool: Question[], n: number, exclude: Set<string>): Question[] {
  const groups = new Map<string, Question[]>();
  for (const q of shuffle(pool)) {
    if (exclude.has(q.id)) continue;
    const k = groupKey(q);
    const arr = groups.get(k) ?? [];
    arr.push(q);
    groups.set(k, arr);
  }
  const out: Question[] = [];
  // сначала одиночные и маленькие группы, чтобы точнее попасть в n
  const ordered = shuffle([...groups.values()]);
  for (const g of ordered) {
    if (out.length >= n) break;
    const room = n - out.length;
    out.push(...g.slice(0, room));
  }
  return out;
}

const isSingle = (q: Question) => q.type === 'single' && !q.context;

/** Делит пул на задания на языке ученика и остальные (добор, если своих не хватит). */
function byLang(pool: Question[], entLang: EntLang) {
  return { pref: pool.filter((q) => inStudyLang(q, entLang)), rest: pool.filter((q) => !inStudyLang(q, entLang)) };
}

function langNote(subject: SubjectId, count: number, entLang: EntLang) {
  const study = studyLang(subject, entLang);
  const other = study === 'kk' ? 'ru' : 'kk';
  return `${SUBJECT_MAP[subject].name}: ${count} ${plural(count, ['задание', 'задания', 'заданий'])} ${LANG_LABEL[other]} (${LANG_LABEL[study]} пока не хватает)`;
}
const isContext = (q: Question) => q.type === 'single' && !!q.context;

/* ------------------------------------------------------------------ */
/* Старый простой режим (предметный пробник, свой вариант)             */
/* ------------------------------------------------------------------ */

export function buildExamQuestions(config: ExamConfig, questions: Question[], entLang: EntLang = 'ru') {
  const ids: string[] = [];
  const used = new Set<string>();
  const notes: string[] = [];
  const sections = config.sections.map((s) => {
    const { pref, rest } = byLang(questions.filter((q) => q.subject === s.subject && q.type !== 'essay'), entLang);
    let picked = takeGrouped(pref, s.count, used);
    if (picked.length < s.count) {
      const extra = takeGrouped(rest, s.count - picked.length, used);
      if (extra.length) notes.push(langNote(s.subject, extra.length, entLang));
      picked = [...picked, ...extra];
    }
    picked.forEach((q) => used.add(q.id));
    ids.push(...picked.map((q) => q.id));
    return { ...s, count: picked.length };
  });
  return { ids, config: { ...config, sections }, langNote: notes.length ? `Часть заданий на другом языке — ${notes.join('; ')}.` : undefined };
}

/** Простой подсчёт (совместимость): доля верных × баллы раздела. */
export function scoreExam(config: ExamConfig, questionIds: string[], answers: Record<string, Answer | null>, qmap: Map<string, Question>) {
  const sectionScores: ExamResult['sectionScores'] = config.sections.map((s) => {
    const ids = questionIds.filter((id) => qmap.get(id)?.subject === s.subject);
    const correct = ids.filter((id) => {
      const q = qmap.get(id);
      return q ? checkAnswer(q, answers[id]) : false;
    }).length;
    return { subject: s.subject, correct, total: ids.length, maxPoints: s.maxPoints, score: ids.length ? Math.round((correct / ids.length) * s.maxPoints) : 0 };
  });
  const score = sectionScores.reduce((s, x) => s + x.score, 0);
  const maxScore = sectionScores.reduce((s, x) => s + x.maxPoints, 0);
  return { sectionScores, score, maxScore };
}

/* ------------------------------------------------------------------ */
/* План экзамена (модули)                                              */
/* ------------------------------------------------------------------ */

export interface ExamPlan {
  config: ExamConfig;
  modules: ExamModule[];
  /** Заметка, если банк не позволил собрать полный вариант */
  shortened?: string;
}

/** Простой экзамен из конфигурации — один модуль. */
export function planSimple(config: ExamConfig, questions: Question[], entLang: EntLang = 'ru'): ExamPlan {
  const built = buildExamQuestions(config, questions, entLang);
  return {
    config: built.config,
    modules: [{ id: uid('mod'), title: built.config.title, subject: built.config.sections[0]?.subject ?? 'math', questionIds: built.ids, timeLimitSec: built.config.timeLimitMin * 60 }],
    shortened: built.langNote,
  };
}

/**
 * Полный ЕНТ по формату (по умолчанию — 120 заданий, 240 минут, 140 баллов).
 * Профильные блоки собираются по регламенту: 25 заданий с одним ответом, 5 контекстных,
 * 5 на соответствие, 5 с выбором нескольких ответов. Все задания — в одном модуле со свободной навигацией.
 */
export function planEntFull(format: ExamFormat, profileSubjects: [SubjectId, SubjectId], questions: Question[], entLang: EntLang = 'ru'): ExamPlan {
  const used = new Set<string>();
  const ids: string[] = [];
  const sections: ExamConfig['sections'] = [];
  const shortages: string[] = [];
  const langNotes: string[] = [];
  for (const b of format.blocks) {
    const subject = b.slot === 'profile1' ? profileSubjects[0] : b.slot === 'profile2' ? profileSubjects[1] : b.subject;
    if (!subject) continue;
    // сначала задания на языке ученика; задания на другом языке — только добор при нехватке
    const { pref: pool, rest } = byLang(questions.filter((q) => q.subject === subject && q.type !== 'essay'), entLang);
    let picked: Question[] = [];
    if (b.composition) {
      const c = b.composition;
      const parts = [
        takeGrouped(pool.filter(isSingle), c.single, used),
        takeGrouped(pool.filter(isContext), c.context, used),
        takeGrouped(pool.filter((q) => q.type === 'matching'), c.matching, used),
        takeGrouped(pool.filter((q) => q.type === 'multiple'), c.multiple, used),
      ];
      picked = parts.flat();
    } else {
      picked = takeGrouped(pool.filter((q) => q.type === 'single'), b.questions, used);
    }
    // если по составу не хватило — добираем любыми заданиями с выбором ответа
    if (picked.length < b.questions) {
      const extra = takeGrouped(pool.filter((q) => (q.type === 'single' || q.type === 'boolean') && !picked.includes(q)), b.questions - picked.length, new Set([...used, ...picked.map((q) => q.id)]));
      picked = [...picked, ...extra];
    }
    // на языке ученика заданий не хватило — добираем на другом языке и честно предупреждаем
    if (picked.length < b.questions && rest.length) {
      const extra = takeGrouped(rest.filter((q) => q.type === 'single' || q.type === 'boolean' || q.type === 'multiple' || q.type === 'matching'), b.questions - picked.length, new Set([...used, ...picked.map((q) => q.id)]));
      if (extra.length) langNotes.push(langNote(subject, extra.length, entLang));
      picked = [...picked, ...extra];
    }
    picked.forEach((q) => used.add(q.id));
    if (picked.length < b.questions) shortages.push(`${SUBJECT_MAP[subject].name}: ${picked.length} из ${b.questions}`);
    ids.push(...picked.map((q) => q.id));
    sections.push({ subject, count: picked.length, maxPoints: b.maxPoints });
  }
  const total = ids.length;
  const formatQuestions = format.blocks.reduce((s, b) => s + b.questions, 0);
  const timeLimitMin = total >= formatQuestions ? format.totalMinutes : Math.max(10, Math.round((format.totalMinutes * total) / formatQuestions));
  const config: ExamConfig = { title: total >= formatQuestions ? 'Полный пробный ЕНТ' : 'Полный пробный ЕНТ (сокращённый)', kind: 'full', sections, timeLimitMin, track: 'ent', scoring: 'ent' };
  return {
    config,
    modules: [{ id: uid('mod'), title: 'ЕНТ', subject: sections[0]?.subject ?? 'history', questionIds: ids, timeLimitSec: timeLimitMin * 60 }],
    shortened: [shortages.length ? `В банке не хватило заданий: ${shortages.join('; ')}.` : '', langNotes.length ? `Часть заданий на другом языке — ${langNotes.join('; ')}.` : ''].filter(Boolean).join(' ') || undefined,
  };
}

/* ---------------------------- SAT ---------------------------- */

export const SAT_SPEC = {
  rw: { subject: 'sat-rw' as SubjectId, perModule: 27, minutes: 32, title: 'Reading and Writing' },
  math: { subject: 'sat-math' as SubjectId, perModule: 22, minutes: 35, title: 'Math' },
  breakSec: 10 * 60,
};

function pickByDifficulty(pool: Question[], n: number, weights: Record<Difficulty, number>, exclude: Set<string>) {
  const avail = shuffle(pool.filter((q) => !exclude.has(q.id)));
  const target = {
    easy: Math.round(n * weights.easy),
    medium: Math.round(n * weights.medium),
    hard: 0,
  };
  target.hard = n - target.easy - target.medium;
  const out: Question[] = [];
  for (const d of ['hard', 'medium', 'easy'] as Difficulty[]) out.push(...avail.filter((q) => q.difficulty === d).slice(0, target[d]));
  // добор при нехватке нужной сложности
  for (const q of avail) if (out.length < n && !out.includes(q)) out.push(q);
  return shuffle(out).slice(0, n);
}

/** Digital SAT: 2 модуля R&W + перерыв + 2 модуля Math. Второй модуль формируется адаптивно после первого. */
export function planSat(questions: Question[], part: 'full' | 'rw' | 'math'): ExamPlan {
  const used = new Set<string>();
  const modules: ExamModule[] = [];
  const add = (key: 'rw' | 'math', breakBefore?: number) => {
    const spec = SAT_SPEC[key];
    const pool = questions.filter((q) => q.subject === spec.subject && q.type !== 'essay');
    const m1 = pickByDifficulty(pool, spec.perModule, { easy: 0.33, medium: 0.34, hard: 0.33 }, used);
    m1.forEach((q) => used.add(q.id));
    modules.push({ id: uid('mod'), title: `${spec.title} — Module 1`, subject: spec.subject, questionIds: m1.map((q) => q.id), timeLimitSec: spec.minutes * 60, breakBeforeSec: breakBefore });
    modules.push({ id: uid('mod'), title: `${spec.title} — Module 2`, subject: spec.subject, questionIds: [], timeLimitSec: spec.minutes * 60 });
  };
  if (part !== 'math') add('rw');
  if (part !== 'rw') add('math', part === 'full' ? SAT_SPEC.breakSec : undefined);
  const sections = [...new Set(modules.map((m) => m.subject))].map((s) => ({ subject: s, count: (s === 'sat-rw' ? SAT_SPEC.rw.perModule : SAT_SPEC.math.perModule) * 2, maxPoints: 800 }));
  const minutes = modules.reduce((s, m) => s + m.timeLimitSec / 60, 0);
  const title = part === 'full' ? 'Digital SAT — полный пробный тест' : part === 'rw' ? 'SAT Reading and Writing' : 'SAT Math';
  return { config: { title, kind: part === 'full' ? 'full' : 'subject', sections, timeLimitMin: minutes, track: 'sat', scoring: 'flat' }, modules };
}

/** Адаптивный второй модуль SAT: при ≥ 60% верных в первом — сложнее, иначе — проще. */
export function satModule2(subject: SubjectId, questions: Question[], used: Set<string>, module1: string[], answers: Record<string, Answer | null>, qmap: Map<string, Question>) {
  const correct = module1.filter((id) => {
    const q = qmap.get(id);
    return q ? checkAnswer(q, answers[id]) : false;
  }).length;
  const ratio = module1.length ? correct / module1.length : 0;
  const adaptive: 'easy' | 'hard' = ratio >= 0.6 ? 'hard' : 'easy';
  const spec = subject === 'sat-rw' ? SAT_SPEC.rw : SAT_SPEC.math;
  const pool = questions.filter((q) => q.subject === subject && q.type !== 'essay');
  const weights = adaptive === 'hard' ? { easy: 0.1, medium: 0.4, hard: 0.5 } : { easy: 0.5, medium: 0.4, hard: 0.1 };
  const picked = pickByDifficulty(pool, spec.perModule, weights, used);
  return { ids: picked.map((q) => q.id), adaptive };
}

/** Приблизительная шкала раздела SAT (200–800). Официальная шкала College Board использует IRT. */
export function satSectionScore(correct: number, total: number, path: 'easy' | 'hard' | undefined) {
  if (!total) return 200;
  const f = correct / total;
  const raw = path === 'easy' ? 200 + 440 * f : 200 + 600 * f;
  return Math.max(200, Math.min(800, Math.round(raw / 10) * 10));
}

/* ---------------------------- IELTS ---------------------------- */

/** Распространённые таблицы перевода сырых баллов (из 40) в band. Точные границы зависят от версии теста. */
const LISTENING_BANDS: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1],
];
const READING_BANDS: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1],
];

export function ieltsBand(kind: 'listening' | 'reading', correct: number, total = 40) {
  const raw = total ? Math.round((correct / total) * 40) : 0;
  const table = kind === 'listening' ? LISTENING_BANDS : READING_BANDS;
  for (const [min, band] of table) if (raw >= min) return band;
  return 0;
}

/** Итоговый band IELTS: среднее, округлённое до ближайшей половины (x.25 → x.5, x.75 → x+1). */
export function ieltsOverall(bands: number[]) {
  if (!bands.length) return 0;
  const avg = bands.reduce((a, b) => a + b, 0) / bands.length;
  return Math.floor(avg * 4 + 0.5 + 1e-9) / 4 >= Math.floor(avg) + 0.75 ? Math.floor(avg) + 1 : Math.floor(avg * 4 + 1e-9) / 4 >= Math.floor(avg) + 0.25 ? Math.floor(avg) + 0.5 : Math.floor(avg);
}

export function planIelts(questions: Question[], part: 'full' | 'listening' | 'reading' | 'writing'): ExamPlan {
  const modules: ExamModule[] = [];
  const by = (s: SubjectId) => questions.filter((q) => q.subject === s);
  const ordered = (list: Question[]) => {
    // сохраняем порядок частей: группы по возрастанию ключа (il-p1…p4, ir-p1…p3)
    const keys = [...new Set(list.map((q) => q.group ?? ''))].sort();
    return keys.flatMap((k) => list.filter((q) => (q.group ?? '') === k));
  };
  if (part === 'full' || part === 'listening') modules.push({ id: uid('mod'), title: 'Listening', subject: 'ielts-listening', questionIds: ordered(by('ielts-listening')).slice(0, 40).map((q) => q.id), timeLimitSec: 32 * 60 });
  if (part === 'full' || part === 'reading') modules.push({ id: uid('mod'), title: 'Reading', subject: 'ielts-reading', questionIds: ordered(by('ielts-reading')).slice(0, 40).map((q) => q.id), timeLimitSec: 60 * 60 });
  if (part === 'full' || part === 'writing') {
    const w = by('ielts-writing').filter((q) => q.type === 'essay');
    const t1 = shuffle(w.filter((q) => q.type === 'essay' && q.task === 'writing1'))[0];
    const t2 = shuffle(w.filter((q) => q.type === 'essay' && q.task === 'writing2'))[0];
    modules.push({ id: uid('mod'), title: 'Writing', subject: 'ielts-writing', questionIds: [t1, t2].filter(Boolean).map((q) => q.id), timeLimitSec: 60 * 60 });
  }
  const sections = modules.map((m) => ({ subject: m.subject, count: m.questionIds.length, maxPoints: 9 }));
  const title = part === 'full' ? 'IELTS Academic — пробный тест' : `IELTS ${modules[0]?.title ?? ''}`;
  return { config: { title, kind: part === 'full' ? 'full' : 'subject', sections, timeLimitMin: modules.reduce((s, m) => s + m.timeLimitSec / 60, 0), track: 'ielts', scoring: 'flat' }, modules };
}

/* ------------------------------------------------------------------ */
/* Итоговый подсчёт                                                    */
/* ------------------------------------------------------------------ */

export interface FullScore {
  sectionScores: ExamResult['sectionScores'];
  score: number;
  maxScore: number;
  scaled: NonNullable<ExamResult['scaled']>;
}

export function scoreFull(
  config: ExamConfig,
  modules: { subject: SubjectId; questionIds: string[]; adaptive?: 'easy' | 'hard' }[],
  answers: Record<string, Answer | null>,
  qmap: Map<string, Question>,
  essays: ExamResult['essays'] = {},
): FullScore {
  const track: Track = config.track ?? 'ent';
  const scheme = config.scoring ?? 'flat';
  const allIds = modules.flatMap((m) => m.questionIds);
  const subjects = [...new Set(modules.flatMap((m) => m.questionIds.map((id) => qmap.get(id)?.subject).filter(Boolean) as SubjectId[]))];
  const raw = subjects.map((s) => {
    const ids = allIds.filter((id) => qmap.get(id)?.subject === s);
    let earned = 0;
    let max = 0;
    let correct = 0;
    for (const id of ids) {
      const q = qmap.get(id);
      if (!q || q.type === 'essay') continue;
      earned += scoreAnswer(q, answers[id], scheme);
      max += maxPoints(q, scheme);
      if (checkAnswer(q, answers[id])) correct++;
    }
    return { subject: s, ids, earned, max, correct, total: ids.filter((id) => qmap.get(id)?.type !== 'essay').length };
  });

  if (track === 'sat') {
    const parts = raw.map((r) => {
      const path = modules.find((m) => m.subject === r.subject && m.adaptive)?.adaptive;
      return { label: r.subject === 'sat-rw' ? 'Reading and Writing' : 'Math', value: satSectionScore(r.correct, r.total, path), max: 800, r };
    });
    const total = parts.reduce((s, p) => s + p.value, 0);
    const sectionScores = parts.map((p) => ({ subject: p.r.subject, score: p.value, maxPoints: 800, correct: p.r.correct, total: p.r.total }));
    const max = parts.length * 800;
    return {
      sectionScores,
      score: total,
      maxScore: max,
      scaled: { label: parts.length === 2 ? 'SAT Total' : parts[0]?.label ?? 'SAT', value: total, max, parts: parts.map((p) => ({ label: p.label, value: p.value, max: 800 })), note: 'Приблизительная оценка по доле верных ответов и пути адаптивного модуля. Официальная шкала College Board рассчитывается методом IRT.' },
    };
  }

  if (track === 'ielts') {
    const parts: { label: string; value: number; max: number }[] = [];
    const sectionScores: ExamResult['sectionScores'] = [];
    for (const r of raw) {
      if (r.subject === 'ielts-listening' || r.subject === 'ielts-reading') {
        const band = ieltsBand(r.subject === 'ielts-listening' ? 'listening' : 'reading', r.correct, Math.max(r.total, 1));
        parts.push({ label: r.subject === 'ielts-listening' ? 'Listening' : 'Reading', value: band, max: 9 });
        sectionScores.push({ subject: r.subject, score: band, maxPoints: 9, correct: r.correct, total: r.total });
      }
    }
    const writingIds = allIds.filter((id) => qmap.get(id)?.subject === 'ielts-writing');
    if (writingIds.length) {
      const graded = writingIds.map((id) => essays[id]?.band).filter((b): b is number => typeof b === 'number');
      // Task 2 весит вдвое больше Task 1
      let band: number | null = null;
      if (graded.length === writingIds.length) {
        const weights = writingIds.map((id) => {
          const q = qmap.get(id);
          return q?.type === 'essay' && q.task === 'writing2' ? 2 : 1;
        });
        const sum = writingIds.reduce((s, id, i) => s + (essays[id]!.band as number) * weights[i], 0);
        band = Math.round((sum / weights.reduce((a, b) => a + b, 0)) * 2) / 2;
      }
      if (band !== null) parts.push({ label: 'Writing', value: band, max: 9 });
      sectionScores.push({ subject: 'ielts-writing', score: band ?? 0, maxPoints: 9, correct: graded.length, total: writingIds.length });
    }
    const overall = ieltsOverall(parts.map((p) => p.value));
    const missingWriting = writingIds.length > 0 && !parts.some((p) => p.label === 'Writing');
    return {
      sectionScores,
      score: overall,
      maxScore: 9,
      scaled: { label: 'IELTS Overall', value: overall, max: 9, parts, note: `Перевод Listening/Reading — по распространённым таблицам (границы немного различаются между версиями теста).${missingWriting ? ' Writing ещё не оценён — оцените эссе, чтобы получить итоговый band.' : ''}` },
    };
  }

  // ЕНТ: баллы по схеме 1/2 балла; если блок неполный — пропорционально максимуму блока по формату
  const sectionScores = config.sections.map((sec) => {
    const r = raw.find((x) => x.subject === sec.subject);
    if (!r || !r.max) return { subject: sec.subject, score: 0, maxPoints: sec.maxPoints, correct: 0, total: r?.total ?? 0 };
    const score = r.max === sec.maxPoints ? r.earned : Math.round((r.earned / r.max) * sec.maxPoints);
    return { subject: sec.subject, score, maxPoints: sec.maxPoints, correct: r.correct, total: r.total };
  });
  const score = sectionScores.reduce((s, x) => s + x.score, 0);
  const maxScore = sectionScores.reduce((s, x) => s + x.maxPoints, 0);
  return { sectionScores, score, maxScore, scaled: { label: 'Баллы ЕНТ', value: score, max: maxScore, parts: sectionScores.map((s) => ({ label: SUBJECT_MAP[s.subject]?.name ?? s.subject, value: s.score, max: s.maxPoints })) } };
}
