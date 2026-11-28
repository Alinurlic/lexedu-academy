import type { Attempt, Difficulty, ExamFormat, ExamResult, Profile, Question, SubjectId, TopicStatus, Track } from '@/types';
import { DEFAULT_EXAM_FORMAT, SUBJECTS, SUBJECT_MAP, TOPIC_MAP, formatMax } from '@/data/subjects';
import { addDays, dayKey, fmtDate, fromKey, startOfWeek } from './date';
import { tr } from '@/i18n';

const DIFF_W: Record<Difficulty, number> = { easy: 0.8, medium: 1, hard: 1.25 };
const PRIOR_ACC = 0.35;
const PRIOR_W = 5;

export interface Acc {
  correct: number;
  total: number;
  accuracy: number; // 0..1
}

export function accOf(attempts: Attempt[]): Acc {
  const correct = attempts.reduce((s, a) => s + (a.correct ? 1 : 0), 0);
  return { correct, total: attempts.length, accuracy: attempts.length ? correct / attempts.length : 0 };
}

/** Взвешенная точность по последним попыткам с байесовским сглаживанием. */
export function weightedAccuracy(attempts: Attempt[], window = 60): number {
  const recent = attempts.slice(-window);
  let wc = 0;
  let wt = 0;
  recent.forEach((a, i) => {
    const recency = 0.6 + 0.4 * ((i + 1) / recent.length);
    const w = DIFF_W[a.difficulty] * recency;
    wt += w;
    if (a.correct) wc += w;
  });
  return (wc + PRIOR_ACC * PRIOR_W) / (wt + PRIOR_W);
}

export function blockSubjects(profile: Profile, format: ExamFormat = DEFAULT_EXAM_FORMAT): { key: string; label: string; subject: SubjectId; maxPoints: number; questions: number }[] {
  return format.blocks.flatMap((b) => {
    const subject = b.slot === 'profile1' ? profile.profileSubjects[0] : b.slot === 'profile2' ? profile.profileSubjects[1] : b.subject;
    if (!subject || !SUBJECT_MAP[subject]) return [];
    return [{ key: b.key, label: b.slot === 'fixed' ? b.label : SUBJECT_MAP[subject].name, subject, maxPoints: b.maxPoints, questions: b.questions }];
  });
}

export function groupBySubject(attempts: Attempt[]) {
  const m = new Map<SubjectId, Attempt[]>();
  for (const a of attempts) {
    const arr = m.get(a.subject);
    if (arr) arr.push(a);
    else m.set(a.subject, [a]);
  }
  return m;
}

/** Прогноз балла ЕНТ (из 140) по накопленным попыткам. */
export function predictScore(attempts: Attempt[], profile: Profile, format: ExamFormat = DEFAULT_EXAM_FORMAT) {
  const by = groupBySubject(attempts);
  const blocks = blockSubjects(profile, format).map((b) => {
    const acc = weightedAccuracy(by.get(b.subject) ?? []);
    return { ...b, accuracy: acc, points: acc * b.maxPoints, attempts: (by.get(b.subject) ?? []).length };
  });
  const total = Math.round(blocks.reduce((s, b) => s + b.points, 0));
  const enoughData = blocks.every((b) => b.attempts >= 5);
  return { total, blocks, enoughData, max: formatMax(format) };
}

/** Прогноз по неделям — для графика динамики. */
export function scoreHistory(attempts: Attempt[], profile: Profile, weeks = 26, format: ExamFormat = DEFAULT_EXAM_FORMAT) {
  const sorted = attempts;
  const res: { date: string; label: string; score: number }[] = [];
  const thisWeek = startOfWeek();
  let idx = 0;
  const acc: Attempt[] = [];
  const firstDate = sorted.length ? new Date(sorted[0].date) : new Date();
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(thisWeek, -7 * w + 7);
    while (idx < sorted.length && new Date(sorted[idx].date) < end) acc.push(sorted[idx++]);
    if (end < firstDate) continue;
    if (acc.length < 10) continue;
    const label = fmtDate(addDays(end, -1));
    res.push({ date: dayKey(addDays(end, -1)), label, score: predictScore(acc, profile, format).total });
  }
  return res;
}

export function activityByDay(attempts: Attempt[], studyLog: Record<string, number>) {
  const m: Record<string, { questions: number; correct: number; seconds: number }> = {};
  for (const a of attempts) {
    const k = dayKey(a.date);
    const e = (m[k] ??= { questions: 0, correct: 0, seconds: 0 });
    e.questions++;
    if (a.correct) e.correct++;
  }
  for (const [k, sec] of Object.entries(studyLog)) {
    const e = (m[k] ??= { questions: 0, correct: 0, seconds: 0 });
    e.seconds += sec;
  }
  return m;
}

export function computeStreak(activeDays: Set<string>, today = new Date()) {
  let d = today;
  if (!activeDays.has(dayKey(d))) d = addDays(d, -1);
  let streak = 0;
  while (activeDays.has(dayKey(d))) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

export function longestStreak(activeDays: Set<string>) {
  const keys = [...activeDays].sort();
  let best = 0;
  let cur = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = fromKey(k);
    if (prev && dayKey(addDays(prev, 1)) === k) cur++;
    else cur = 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

export interface TopicStat {
  id: string;
  name: string;
  subject: SubjectId;
  attempts: number;
  accuracy: number;
  coverage: number; // 0..1 доля вопросов темы, на которые хотя бы раз ответили верно
  progress: number; // 0..100
  status: TopicStatus;
  questionCount: number;
}

export function topicStats(subject: SubjectId, attempts: Attempt[], questions: Question[], manual: Record<string, TopicStatus>): TopicStat[] {
  const subj = SUBJECT_MAP[subject];
  return subj.topics.map((tp) => {
    const tAtt = attempts.filter((a) => a.topic === tp.id);
    const qs = questions.filter((q) => q.topic === tp.id);
    const correctIds = new Set(tAtt.filter((a) => a.correct).map((a) => a.questionId));
    const coverage = qs.length ? qs.filter((q) => correctIds.has(q.id)).length / qs.length : 0;
    const recent = tAtt.slice(-30);
    const accuracy = recent.length ? recent.filter((a) => a.correct).length / recent.length : 0;
    // Прогресс темы: охват вопросов темы (50%) + уровень владения по последним ответам (50%)
    const mastery = recent.length >= 3 ? Math.min(1, accuracy / 0.85) : 0;
    const raw = Math.round(coverage * 50 + mastery * 50);
    const auto: TopicStatus = raw >= 95 ? 'completed' : tAtt.length ? 'in_progress' : 'not_started';
    const status = manual[tp.id] ?? auto;
    const progress = status === 'completed' ? 100 : status === 'not_started' ? 0 : raw;
    return { id: tp.id, name: tp.name, subject, attempts: tAtt.length, accuracy, coverage, progress, status, questionCount: qs.length };
  });
}

export function subjectSummary(subject: SubjectId, attempts: Attempt[], questions: Question[], manual: Record<string, TopicStatus>) {
  const sAtt = attempts.filter((a) => a.subject === subject);
  const topics = topicStats(subject, sAtt, questions, manual);
  const progress = topics.length ? Math.round(topics.reduce((s, t) => s + t.progress, 0) / topics.length) : 0;
  const recent = sAtt.slice(-100);
  const accuracy = recent.length ? recent.filter((a) => a.correct).length / recent.length : 0;
  const attempted = topics.filter((t) => t.attempts >= 3);
  const weakest = attempted.length ? [...attempted].sort((a, b) => a.accuracy - b.accuracy)[0] : null;
  const hardShare = recent.length ? recent.filter((a) => a.difficulty === 'hard').length / recent.length : 0;
  const level = accuracy >= 0.8 && hardShare > 0.2 ? tr('Продвинутый') : accuracy >= 0.6 ? tr('Средний') : sAtt.length ? tr('Базовый') : '—';
  return { subject, attempts: sAtt.length, accuracy, progress, topics, weakest, level, completedTopics: topics.filter((t) => t.status === 'completed').length };
}

export interface WeakTopic {
  topicId: string;
  subject: SubjectId;
  accuracy: number;
  attempts: number;
  message: string;
  recommendedCount: number;
}

/** Определение слабых тем по реальным данным пользователя. */
export function weakTopics(attempts: Attempt[], profile: Profile, limit = 5, format: ExamFormat = DEFAULT_EXAM_FORMAT): WeakTopic[] {
  const relevant = new Set<SubjectId>(allRelevantSubjects(profile, format));
  const byTopic = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!relevant.has(a.subject)) continue;
    const arr = byTopic.get(a.topic);
    if (arr) arr.push(a);
    else byTopic.set(a.topic, [a]);
  }
  const list: WeakTopic[] = [];
  for (const [topicId, arr] of byTopic) {
    const recent = arr.slice(-25);
    if (recent.length < 4) continue;
    const accuracy = recent.filter((a) => a.correct).length / recent.length;
    if (accuracy >= 0.7) continue;
    const tp = TOPIC_MAP[topicId];
    if (!tp) continue;
    const recommendedCount = accuracy < 0.5 ? 15 : 10;
    const genitive = subjectGenitive(tp.subject);
    list.push({
      topicId,
      subject: tp.subject,
      accuracy,
      attempts: arr.length,
      recommendedCount,
      message: tr('Самая слабая тема {0} — «{1}». Точность {2}%. Рекомендуем {3} и решить {4} практических вопросов.', genitive, tp.name, Math.round(accuracy * 100), tp.advice, recommendedCount),
    });
  }
  return list.sort((a, b) => a.accuracy - b.accuracy).slice(0, limit);
}

export function subjectGenitive(id: SubjectId) {
  const g: Record<SubjectId, string> = {
    math: tr('по математике'),
    physics: tr('по физике'),
    geography: tr('по географии'),
    biology: tr('по биологии'),
    chemistry: tr('по химии'),
    history: tr('по истории Казахстана'),
    reading: tr('по грамотности чтения'),
    mathlit: tr('по математической грамотности'),
    english: tr('по английскому языку'),
    informatics: tr('по информатике'),
    worldhistory: tr('по всемирной истории'),
    law: tr('по основам права'),
    russian: tr('по русскому языку'),
    ruslit: tr('по русской литературе'),
    kazakh: tr('по казахскому языку'),
    kazlit: tr('по казахской литературе'),
    'sat-rw': tr('в SAT Reading & Writing'),
    'sat-math': tr('в SAT Math'),
    'ielts-listening': tr('в IELTS Listening'),
    'ielts-reading': tr('в IELTS Reading'),
    'ielts-writing': tr('в IELTS Writing'),
    'ielts-speaking': tr('в IELTS Speaking'),
  };
  return g[id];
}

export function difficultyStats(attempts: Attempt[]) {
  return (['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
    const arr = attempts.filter((a) => a.difficulty === d);
    return { difficulty: d, ...accOf(arr) };
  });
}

export function weeklySeries(attempts: Attempt[], studyLog: Record<string, number>, weeks = 12) {
  const act = activityByDay(attempts, studyLog);
  const start = startOfWeek();
  const out: { label: string; hours: number; questions: number; accuracy: number | null }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const ws = addDays(start, -7 * w);
    let sec = 0;
    let q = 0;
    let c = 0;
    for (let i = 0; i < 7; i++) {
      const e = act[dayKey(addDays(ws, i))];
      if (e) {
        sec += e.seconds;
        q += e.questions;
        c += e.correct;
      }
    }
    out.push({
      label: fmtDate(ws),
      hours: Math.round((sec / 3600) * 10) / 10,
      questions: q,
      accuracy: q ? Math.round((c / q) * 100) : null,
    });
  }
  return out;
}

export function examComparable(e: ExamResult) {
  return e.maxScore ? Math.round((e.score / e.maxScore) * 100) : 0;
}

export function allRelevantSubjects(profile: Profile, format: ExamFormat = DEFAULT_EXAM_FORMAT): SubjectId[] {
  return [...new Set(blockSubjects(profile, format).map((b) => b.subject))];
}

export function orderedSubjects() {
  return SUBJECTS;
}

/* ---------------- Прогноз по трекам LexEdu Academy ---------------- */

export interface TrackPrediction {
  track: Track;
  label: string;
  value: number;
  max: number;
  min: number;
  parts: { label: string; value: number | null; max: number; subject?: SubjectId }[];
  enoughData: boolean;
  unit: string;
}

const ieltsFromAcc = (acc: number) => {
  // доля верных → сырые баллы из 40 → band по распространённой таблице
  const raw = Math.round(acc * 40);
  const table: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5]];
  for (const [min, band] of table) if (raw >= min) return band;
  return 2;
};

/** Прогноз для выбранного трека по реальным ответам ученика. */
export function predictTrack(track: Track, attempts: Attempt[], profile: Profile, format: ExamFormat = DEFAULT_EXAM_FORMAT, essayBands: { subject: SubjectId; band: number }[] = []): TrackPrediction {
  const by = groupBySubject(attempts);
  if (track === 'sat') {
    const parts = (['sat-rw', 'sat-math'] as SubjectId[]).map((s) => {
      const arr = by.get(s) ?? [];
      const v = Math.round((200 + 600 * weightedAccuracy(arr)) / 10) * 10;
      return { label: s === 'sat-rw' ? 'Reading & Writing' : 'Math', value: v, max: 800, subject: s, n: arr.length };
    });
    return { track, label: tr('Прогноз SAT'), value: parts.reduce((a, p) => a + p.value, 0), max: 1600, min: 400, parts, enoughData: parts.every((p) => p.n >= 10), unit: '' };
  }
  if (track === 'ielts') {
    const lr = (['ielts-listening', 'ielts-reading'] as SubjectId[]).map((s) => {
      const arr = by.get(s) ?? [];
      return { label: s === 'ielts-listening' ? 'Listening' : 'Reading', value: arr.length ? ieltsFromAcc(weightedAccuracy(arr)) : null, max: 9, subject: s, n: arr.length };
    });
    const ws = (['ielts-writing', 'ielts-speaking'] as SubjectId[]).map((s) => {
      const bands = essayBands.filter((e) => e.subject === s).slice(-3).map((e) => e.band);
      return { label: s === 'ielts-writing' ? 'Writing' : 'Speaking', value: bands.length ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2 : null, max: 9, subject: s, n: bands.length };
    });
    const parts = [...lr, ...ws];
    const known = parts.map((p) => p.value).filter((v): v is number => v !== null);
    const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
    const overall = Math.round(avg * 2) / 2;
    return { track, label: tr('Прогноз IELTS'), value: overall, max: 9, min: 0, parts, enoughData: lr.every((p) => p.n >= 10) && known.length >= 3, unit: 'band' };
  }
  const p = predictScore(attempts, profile, format);
  return { track, label: tr('Прогноз ЕНТ'), value: p.total, max: p.max, min: 0, parts: p.blocks.map((b) => ({ label: b.label, value: Math.round(b.points * 10) / 10, max: b.maxPoints, subject: b.subject })), enoughData: p.enoughData, unit: tr('баллов') };
}

/** Динамика прогноза по неделям для любого трека. */
export function trackHistory(track: Track, attempts: Attempt[], profile: Profile, weeks = 26, format: ExamFormat = DEFAULT_EXAM_FORMAT) {
  const res: { date: string; label: string; score: number }[] = [];
  const thisWeek = startOfWeek();
  const rel = new Set(SUBJECTS.filter((s) => s.track === track).map((s) => s.id));
  const sorted = attempts.filter((a) => rel.has(a.subject));
  let idx = 0;
  const acc: Attempt[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(thisWeek, -7 * w + 7);
    while (idx < sorted.length && new Date(sorted[idx].date) < end) acc.push(sorted[idx++]);
    if (acc.length < 10) continue;
    const label = fmtDate(addDays(end, -1));
    res.push({ date: dayKey(addDays(end, -1)), label, score: predictTrack(track, acc, profile, format).value });
  }
  return res;
}
