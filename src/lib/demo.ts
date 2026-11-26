import type {
  Answer,
  Attempt,
  ExamResult,
  Mistake,
  PracticeSessionResult,
  Profile,
  Question,
  StudyTask,
  SubjectId,
} from '@/types';
import { DEMO_QUESTIONS, checkAnswer, rightAnswer } from '@/data/questions';
import { addDays, dayKey, startOfWeek } from './date';
import { seededRandom, shuffle } from './utils';
import { UNT_MAX } from '@/data/subjects';

export const DEFAULT_PROFILE: Profile = {
  name: 'Алинур',
  avatarColor: '#2563eb',
  avatarEmoji: '',
  grade: 11,
  targetScore: 120,
  profileSubjects: ['math', 'physics'],
  examDate: `${new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear()}-06-15`,
  dailyGoalMin: 90,
  dailyQuestionGoal: 40,
  theme: 'dark',
  language: 'ru',
  notifications: { reminders: true, achievements: true, weeklyReport: true },
  sidebarCollapsed: false,
  activeTrack: 'ent',
  onboarded: true,
};

/** Профиль нового пользователя: пустой, до прохождения онбординга. */
export const NEW_PROFILE: Profile = {
  ...DEFAULT_PROFILE,
  name: '',
  onboarded: false,
  tracks: undefined,
};

/** Базовая «сила» ученика по темам: стартовая и финальная вероятность верного ответа. */
const SKILL: Record<string, [number, number]> = {
  'phys-dynamics': [0.3, 0.45],
  'phys-thermo': [0.35, 0.55],
  'math-trig': [0.35, 0.6],
  'math-combinatorics': [0.4, 0.62],
  'hist-colonial': [0.35, 0.55],
  'hist-medieval': [0.4, 0.6],
  'read-inference': [0.45, 0.65],
};

function skillFor(topic: string, subject: SubjectId, t: number) {
  const base: Record<string, [number, number]> = {
    math: [0.5, 0.82],
    physics: [0.45, 0.74],
    history: [0.5, 0.78],
    reading: [0.6, 0.85],
    mathlit: [0.6, 0.88],
  };
  const [a, b] = SKILL[topic] ?? base[subject] ?? [0.45, 0.7];
  return a + (b - a) * t;
}

const WRONG_ANSWER = (q: Question, rnd: () => number): Answer | null => {
  switch (q.type) {
    case 'single': {
      const opts = q.options.map((_, i) => i).filter((i) => i !== q.correctAnswer);
      return opts[Math.floor(rnd() * opts.length)];
    }
    case 'multiple':
      return q.correctAnswer.length > 1 ? q.correctAnswer.slice(0, 1) : [...q.correctAnswer, (q.correctAnswer[0] + 1) % q.options.length];
    case 'matching':
      return q.correctAnswer.map((c, i) => (i === 0 ? (c + 1) % q.options.length : c));
    case 'numeric':
      return String(q.correctAnswer + (rnd() > 0.5 ? 1 : -2));
    case 'boolean':
      return !q.correctAnswer;
    case 'text':
      return 'unknown';
    case 'essay':
      return null;
  }
};

const RIGHT_ANSWER = (q: Question): Answer | null => rightAnswer(q);

export interface DemoData {
  attempts: Attempt[];
  sessions: PracticeSessionResult[];
  exams: ExamResult[];
  mistakes: Mistake[];
  tasks: StudyTask[];
  studyLog: Record<string, number>;
  bookmarks: string[];
}

export function generateDemo(profile: Profile = DEFAULT_PROFILE, seed = 20261124): DemoData {
  const rnd = seededRandom(seed);
  const today = new Date();
  const attempts: Attempt[] = [];
  const sessions: PracticeSessionResult[] = [];
  const studyLog: Record<string, number> = {};
  const subjects: SubjectId[] = ['history', 'mathlit', 'reading', ...profile.profileSubjects];
  const weights = [0.18, 0.12, 0.12, 0.32, 0.26];
  const bySubject = new Map<SubjectId, Question[]>();
  for (const q of DEMO_QUESTIONS) {
    const arr = bySubject.get(q.subject) ?? [];
    arr.push(q);
    bySubject.set(q.subject, arr);
  }

  const DAYS = 364;
  for (let d = DAYS; d >= 0; d--) {
    const date = addDays(today, -d);
    const t = 1 - d / DAYS; // 0 → 1 со временем
    const recentStreak = d <= 12;
    const pActive = recentStreak ? 1 : 0.22 + 0.55 * t;
    if (rnd() > pActive) continue;
    if (d === 0 && today.getHours() < 10) continue;
    const nSessions = 1 + (rnd() < 0.25 + 0.3 * t ? 1 : 0) + (rnd() < 0.1 * t ? 1 : 0);
    let daySeconds = 0;
    for (let s = 0; s < nSessions; s++) {
      let r = rnd();
      let subject = subjects[0];
      for (let i = 0; i < subjects.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          subject = subjects[i];
          break;
        }
      }
      const pool = bySubject.get(subject) ?? [];
      if (!pool.length) continue;
      const n = Math.min(pool.length, 6 + Math.floor(rnd() * 10));
      const qs = shuffle(pool, rnd).slice(0, n);
      const startHour = 15 + Math.floor(rnd() * 6);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, Math.floor(rnd() * 60));
      let cursor = start.getTime();
      const answers: PracticeSessionResult['answers'] = [];
      for (const q of qs) {
        const p = skillFor(q.topic, subject, t) - (q.difficulty === 'hard' ? 0.12 : q.difficulty === 'easy' ? -0.08 : 0);
        const correct = rnd() < p;
        const timeMs = Math.round((35 + rnd() * 70 + (q.difficulty === 'hard' ? 40 : 0)) * 1000);
        cursor += timeMs;
        const answer = correct ? RIGHT_ANSWER(q) : WRONG_ANSWER(q, rnd);
        attempts.push({
          id: `a_${attempts.length}`,
          questionId: q.id,
          subject,
          topic: q.topic,
          difficulty: q.difficulty,
          correct: checkAnswer(q, answer),
          timeMs,
          date: new Date(cursor).toISOString(),
          mode: 'practice',
        });
        answers.push({ questionId: q.id, answer, correct: checkAnswer(q, answer), timeMs });
      }
      const durationSec = Math.round((cursor - start.getTime()) / 1000);
      daySeconds += durationSec + 300 + Math.floor(rnd() * 900);
      sessions.push({
        id: `s_${sessions.length}`,
        subject,
        topics: [...new Set(qs.map((q) => q.topic))],
        startedAt: start.toISOString(),
        finishedAt: new Date(cursor).toISOString(),
        answers,
        durationSec,
        xpEarned: answers.filter((a) => a.correct).length * 10 + 25,
      });
    }
    if (daySeconds) studyLog[dayKey(date)] = daySeconds;
  }

  // Пробные экзамены (демо) — раз в ~3 недели
  const exams: ExamResult[] = [];
  for (let k = 6; k >= 1; k--) {
    const date = addDays(today, -k * 20 - 2);
    const t = 1 - (k * 20) / DAYS;
    const sections = [
      { subject: 'history' as SubjectId, count: 15, maxPoints: 20 },
      { subject: 'mathlit' as SubjectId, count: 10, maxPoints: 10 },
      { subject: 'reading' as SubjectId, count: 10, maxPoints: 10 },
      { subject: profile.profileSubjects[0], count: 20, maxPoints: 50 },
      { subject: profile.profileSubjects[1], count: 20, maxPoints: 50 },
    ];
    const questionIds: string[] = [];
    const answers: Record<string, Answer | null> = {};
    const sectionScores: ExamResult['sectionScores'] = [];
    let examTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0).getTime();
    for (const sec of sections) {
      const pool = shuffle(bySubject.get(sec.subject) ?? [], rnd).slice(0, sec.count);
      let correct = 0;
      for (const q of pool) {
        questionIds.push(q.id);
        const unanswered = rnd() < 0.04;
        const ok = !unanswered && rnd() < skillFor(q.topic, sec.subject, t) - 0.03;
        const ans = unanswered ? null : ok ? RIGHT_ANSWER(q) : WRONG_ANSWER(q, rnd);
        answers[q.id] = ans;
        const isCorrect = checkAnswer(q, ans);
        if (isCorrect) correct++;
        const timeMs = Math.round((50 + rnd() * 80) * 1000);
        examTime += timeMs;
        if (ans !== null) {
          attempts.push({
            id: `a_${attempts.length}`,
            questionId: q.id,
            subject: sec.subject,
            topic: q.topic,
            difficulty: q.difficulty,
            correct: isCorrect,
            timeMs,
            date: new Date(examTime).toISOString(),
            mode: 'exam',
          });
        }
      }
      sectionScores.push({
        subject: sec.subject,
        correct,
        total: pool.length,
        maxPoints: sec.maxPoints,
        score: pool.length ? Math.round((correct / pool.length) * sec.maxPoints) : 0,
      });
    }
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0);
    const durationSec = Math.round((examTime - start.getTime()) / 1000);
    studyLog[dayKey(date)] = (studyLog[dayKey(date)] ?? 0) + durationSec;
    exams.push({
      id: `e_demo_${k}`,
      config: { title: 'Полный пробный ЕНТ (демо-формат)', kind: 'full', sections, timeLimitMin: 150 },
      startedAt: start.toISOString(),
      finishedAt: new Date(examTime).toISOString(),
      questionIds,
      answers,
      flagged: [],
      durationSec,
      autoSubmitted: false,
      score: sectionScores.reduce((s, x) => s + x.score, 0),
      maxScore: UNT_MAX,
      sectionScores,
    });
  }

  attempts.sort((a, b) => a.date.localeCompare(b.date));
  attempts.forEach((a, i) => (a.id = `a_${i}`));

  // Тетрадь ошибок — из неверных ответов последних 45 дней
  const cutoff = addDays(today, -45).toISOString();
  const mistakeMap = new Map<string, Mistake>();
  const lastAnswer = new Map<string, Answer | null>();
  for (const s of sessions) for (const a of s.answers) if (!a.correct) lastAnswer.set(a.questionId, a.answer);
  for (const a of attempts) {
    if (a.date < cutoff || a.correct || a.mode === 'review') continue;
    if (mistakeMap.has(a.questionId)) continue;
    const r = rnd();
    const status = r < 0.5 ? 'new' : r < 0.8 ? 'learning' : 'mastered';
    mistakeMap.set(a.questionId, {
      id: `m_${mistakeMap.size}`,
      questionId: a.questionId,
      studentAnswer: lastAnswer.get(a.questionId) ?? null,
      date: a.date,
      status,
      reviewCount: status === 'new' ? 0 : 1 + Math.floor(rnd() * 3),
      lastReviewed: status === 'new' ? undefined : addDays(new Date(a.date), 2).toISOString(),
    });
  }

  // План на текущую неделю
  const ws = startOfWeek(today);
  const tpl: [number, string, SubjectId | undefined, StudyTask['kind'], number, StudyTask['priority'], string][] = [
    [0, 'Математика — 40 вопросов', profile.profileSubjects[0], 'questions', 40, 'high', '16:00'],
    [0, 'Физика — 2 темы', profile.profileSubjects[1], 'topics', 2, 'medium', '17:30'],
    [0, 'История Казахстана — 30 минут', 'history', 'minutes', 30, 'medium', '19:00'],
    [1, 'Грамотность чтения — 3 текста', 'reading', 'custom', 3, 'low', '16:30'],
    [1, 'Тригонометрия: формулы приведения', 'math', 'topics', 1, 'high', '18:00'],
    [2, 'Пробный экзамен по профильным предметам', undefined, 'custom', 1, 'high', '10:00'],
    [3, 'Динамика — 20 вопросов', 'physics', 'questions', 20, 'high', '17:00'],
    [3, 'Повторить ошибки — 15 штук', undefined, 'questions', 15, 'medium', '19:30'],
    [4, 'Математическая грамотность — 20 вопросов', 'mathlit', 'questions', 20, 'medium', '16:00'],
    [5, 'Полный пробный ЕНТ', undefined, 'custom', 1, 'high', '10:00'],
    [6, 'Отдых и лёгкое повторение — 30 минут', undefined, 'minutes', 30, 'low', '12:00'],
  ];
  const todayIdx = (today.getDay() + 6) % 7;
  const tasks: StudyTask[] = tpl.map(([day, title, subject, kind, target, priority, startTime], i) => {
    const done = day < todayIdx ? rnd() < 0.8 : false;
    return {
      id: `t_${i}`,
      date: dayKey(addDays(ws, day)),
      title,
      subject,
      kind,
      target,
      progress: done ? target : day < todayIdx ? Math.floor(target * 0.5) : day === todayIdx && i % 2 === 0 ? Math.floor(target / 3) : 0,
      priority,
      done,
      startTime,
      createdAt: addDays(ws, -1).toISOString(),
    };
  });

  const bookmarks = shuffle(DEMO_QUESTIONS.filter((q) => q.difficulty === 'hard'), rnd)
    .slice(0, 6)
    .map((q) => q.id);

  return { attempts, sessions, exams: exams.sort((a, b) => a.startedAt.localeCompare(b.startedAt)), mistakes: [...mistakeMap.values()], tasks, studyLog, bookmarks };
}
