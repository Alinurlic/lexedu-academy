import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Answer,
  AppNotification,
  Attempt,
  AttemptMode,
  ChatMessage,
  ChatThread,
  DailyGoalState,
  ExamFormat,
  ExamResult,
  Mistake,
  MistakeStatus,
  PracticeSessionResult,
  Profile,
  Question,
  SessionAnswer,
  StudyTask,
  SubjectId,
  Taxonomy,
  TopicStatus,
  WeeklyGoalState,
  XpEvent,
} from '@/types';
import { checkAnswer as checkCorrect } from '@/data/questions';
import { builtinQuestions, isBuiltinQuestionId, useBank } from '@/data/questions/bank';
import { importSchema } from '@/lib/schemas';
import { ACHIEVEMENTS, LEVEL_RU, XP, levelFor } from '@/data/gamification';
import { DEFAULT_EXAM_FORMAT, EMPTY_TAXONOMY, SUBJECTS, applyTaxonomy } from '@/data/subjects';
import { DEFAULT_PROFILE, NEW_PROFILE, generateDemo } from '@/lib/demo';
import { addDays, dayKey, daysBetween, fromKey, startOfWeek } from '@/lib/date';
import { weeklyGoals } from '@/lib/weeklyGoals';
import { scoreFull } from '@/lib/exam';
import { computeStreak, predictScore, subjectSummary } from '@/lib/analytics';
import { dailyGoals } from '@/lib/dailyGoals';
import { uid } from '@/lib/utils';
import { toast } from './toast';

export const STORE_KEY = 'lexedu-store';
export const LEGACY_STORE_KEY = 'exampilot-store';
export const STORE_VERSION = 2;

/**
 * Миграция после ребрендинга: если данных LexEdu ещё нет, но есть данные ExamPilot —
 * копируем их под новый ключ. Старые данные НЕ удаляются.
 */
function migrateLegacyKey() {
  try {
    if (localStorage.getItem('lexedu-migrated') !== null) return;
    if (localStorage.getItem(STORE_KEY) === null) {
      const legacy = localStorage.getItem(LEGACY_STORE_KEY);
      if (legacy !== null) localStorage.setItem(STORE_KEY, legacy);
    }
    localStorage.setItem('lexedu-migrated', new Date().toISOString());
  } catch {
    /* хранилище недоступно (приватный режим) — работаем в памяти */
  }
}
migrateLegacyKey();

export interface PersistedState {
  profile: Profile;
  attempts: Attempt[];
  sessions: PracticeSessionResult[];
  exams: ExamResult[];
  mistakes: Mistake[];
  bookmarks: string[];
  tasks: StudyTask[];
  daily: DailyGoalState;
  xp: number;
  xpEvents: XpEvent[];
  achievements: Record<string, string>;
  notifications: AppNotification[];
  customQuestions: Question[];
  topicStatus: Record<string, TopicStatus>;
  studyLog: Record<string, number>;
  lastStreakAward: string | null;
  lastReminderDay: string | null;
  dataMode: 'demo' | 'clean';
  // v2 — LexEdu
  questionOverrides: Record<string, Question>;
  deletedQuestionIds: string[];
  taxonomy: Taxonomy;
  examFormat: ExamFormat;
  assistantHistory: ChatMessage[];
  chatThreads: ChatThread[];
  activeChatId: string | null;
  weekly: WeeklyGoalState;
  adminPinHash: string | null;
  lastSyncAt: string | null;
  /** Эссе и ответы Speaking из «Студии» с оценкой ИИ или самооценкой */
  essayAttempts: EssayAttempt[];
}

export interface EssayAttempt {
  id: string;
  questionId: string;
  text: string;
  date: string;
  band: number | null;
  feedback?: string;
  criteria?: Record<string, number>;
  source: 'ai' | 'self';
}

export type QuestionBankSlice = Pick<PersistedState, 'customQuestions' | 'questionOverrides' | 'deletedQuestionIds'>;

interface Actions {
  // результаты
  recordPractice: (input: { subject: SubjectId; topics: string[]; startedAt: string; answers: SessionAnswer[]; durationSec: number }) => PracticeSessionResult;
  recordExam: (exam: Omit<ExamResult, 'id'>) => ExamResult;
  recordReview: (questionId: string, answer: Answer | null, correct: boolean, timeMs: number) => MistakeStatus | null;
  addStudyTime: (sec: number) => void;
  // ошибки
  setMistakeStatus: (id: string, status: MistakeStatus) => void;
  deleteMistake: (id: string) => void;
  // закладки
  toggleBookmark: (questionId: string) => boolean;
  // планировщик
  addTask: (t: Omit<StudyTask, 'id' | 'createdAt' | 'progress' | 'done'>) => void;
  updateTask: (id: string, patch: Partial<StudyTask>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  // ежедневные цели
  toggleDailyGoal: (goalId: string) => void;
  syncDailyGoals: () => void;
  // профиль
  updateProfile: (patch: Partial<Profile>) => void;
  setTopicStatus: (topicId: string, status: TopicStatus | null) => void;
  // вопросы
  addCustomQuestion: (q: Question) => void;
  deleteCustomQuestion: (id: string) => void;
  upsertQuestion: (q: Question) => void;
  deleteQuestion: (id: string) => void;
  restoreQuestion: (id: string) => void;
  importQuestions: (qs: Question[]) => { added: number; updated: number };
  // админ
  setExamFormat: (f: ExamFormat) => void;
  setTaxonomy: (t: Taxonomy) => void;
  setAdminPinHash: (h: string | null) => void;
  deleteExam: (id: string) => void;
  gradeEssay: (examId: string, questionId: string, grade: { band?: number; feedback?: string; self?: boolean }) => void;
  addEssayAttempt: (a: Omit<EssayAttempt, 'id' | 'date'>) => void;
  // ассистент
  addChatMessages: (m: ChatMessage[]) => void;
  clearChat: () => void;
  newChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  // недельные цели
  syncWeeklyGoals: () => void;
  markSynced: () => void;
  // уведомления
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  ensureDailyReminders: () => void;
  // данные
  resetDemo: () => void;
  clearAll: () => void;
  importData: (data: unknown) => boolean;
  // служебное
  pendingUnlocks: string[];
  shiftUnlock: () => void;
}

export type AppState = PersistedState & Actions;

function emptyState(profile: Profile = DEFAULT_PROFILE): PersistedState {
  return {
    profile,
    attempts: [],
    sessions: [],
    exams: [],
    mistakes: [],
    bookmarks: [],
    tasks: [],
    daily: { date: dayKey(), manual: {}, rewarded: [] },
    xp: 0,
    xpEvents: [],
    achievements: {},
    notifications: [],
    customQuestions: [],
    topicStatus: {},
    studyLog: {},
    lastStreakAward: null,
    lastReminderDay: null,
    dataMode: 'clean',
    questionOverrides: {},
    deletedQuestionIds: [],
    taxonomy: EMPTY_TAXONOMY,
    examFormat: DEFAULT_EXAM_FORMAT,
    assistantHistory: [],
    chatThreads: [],
    activeChatId: null,
    weekly: { week: dayKey(startOfWeek()), rewarded: [] },
    adminPinHash: null,
    lastSyncAt: null,
    essayAttempts: [],
  };
}

function demoState(profile: Profile = DEFAULT_PROFILE): PersistedState {
  const demo = generateDemo(profile);
  const base = emptyState(profile);
  const xp =
    demo.attempts.filter((a) => a.correct).length * XP.correct +
    demo.sessions.length * XP.sessionComplete +
    demo.exams.length * XP.examComplete +
    demo.mistakes.filter((m) => m.status === 'mastered').length * XP.mistakeMastered;
  const state: PersistedState = {
    ...base,
    ...demo,
    xp,
    xpEvents: [{ id: uid('xp'), date: new Date().toISOString(), amount: xp, reason: 'Демо-история подготовки' }],
    dataMode: 'demo',
    notifications: [
      {
        id: uid('n'),
        title: 'Добро пожаловать в LexEdu',
        body: 'Это демо-профиль с историей подготовки. Данные можно сбросить в настройках.',
        date: new Date().toISOString(),
        read: false,
        kind: 'info',
        link: '/settings',
      },
    ],
  };
  // Достижения, уже выполненные демо-историей, отмечаем без уведомлений
  for (const id of evaluateAchievements(state)) state.achievements[id] = addDays(new Date(), -3).toISOString();
  return state;
}

function initialState(): PersistedState {
  let stored = false;
  try {
    stored = localStorage.getItem(STORE_KEY) !== null;
  } catch {
    stored = false;
  }
  // Новый пользователь начинает с чистого профиля и онбординга; демо включается по кнопке
  return emptyState(stored ? DEFAULT_PROFILE : NEW_PROFILE);
}

/** Единый банк вопросов: демо-вопросы с правками администратора + пользовательские, без удалённых. */
export function allQuestions(b: QuestionBankSlice): Question[] {
  const deleted = new Set(b.deletedQuestionIds);
  const demo = builtinQuestions().filter((q) => !deleted.has(q.id)).map((q) => b.questionOverrides[q.id] ?? q);
  return [...demo, ...b.customQuestions.filter((q) => !deleted.has(q.id))];
}

/** Карта для поиска по id — включает удалённые вопросы, чтобы история и ошибки не «ломались». */
export function questionById(b: QuestionBankSlice) {
  const map = new Map<string, Question>();
  for (const q of builtinQuestions()) map.set(q.id, b.questionOverrides[q.id] ?? q);
  for (const q of b.customQuestions) map.set(q.id, q);
  return map;
}

/** Встроенный вопрос (собственный банк LexEdu или открытый источник): правится через overrides, удаляется скрытием. */
export function isDemoQuestionId(id: string) {
  return isBuiltinQuestionId(id);
}

export function activeDaySet(s: Pick<PersistedState, 'attempts' | 'studyLog'>) {
  const set = new Set<string>();
  for (const a of s.attempts) set.add(dayKey(a.date));
  for (const [k, v] of Object.entries(s.studyLog)) if (v > 0) set.add(k);
  return set;
}

function evaluateAchievements(s: PersistedState): string[] {
  const res: string[] = [];
  const total = s.attempts.length;
  if (s.sessions.length >= 1) res.push('first-steps');
  if (total >= 100) res.push('q100');
  if (total >= 500) res.push('q500');
  if (total >= 1000) res.push('q1000');
  const streak = computeStreak(activeDaySet(s));
  if (streak >= 7) res.push('streak7');
  if (streak >= 30) res.push('streak30');
  if (s.sessions.some((x) => x.answers.length >= 10 && x.answers.every((a) => a.correct))) res.push('perfect');
  if (s.exams.length >= 1) res.push('exam1');
  if (s.exams.length >= 10) res.push('exam10');
  if (s.mistakes.filter((m) => m.status === 'mastered').length >= 10) res.push('mistakes10');
  const qs = allQuestions(s);
  if (SUBJECTS.some((sub) => subjectSummary(sub.id, s.attempts, qs, s.topicStatus).topics.every((t) => t.status === 'completed'))) res.push('subject-complete');
  if (s.tasks.filter((t) => t.done).length >= 20) res.push('planner');
  if (predictScore(s.attempts, s.profile, s.examFormat).total >= 100) res.push('score100');
  return res;
}

const PERSISTED_KEYS: (keyof PersistedState)[] = [
  'profile', 'attempts', 'sessions', 'exams', 'mistakes', 'bookmarks', 'tasks', 'daily', 'xp', 'xpEvents', 'achievements',
  'notifications', 'customQuestions', 'topicStatus', 'studyLog', 'lastStreakAward', 'lastReminderDay', 'dataMode',
  'questionOverrides', 'deletedQuestionIds', 'taxonomy', 'examFormat', 'assistantHistory', 'chatThreads', 'activeChatId', 'weekly', 'adminPinHash', 'lastSyncAt', 'essayAttempts',
];

export function pickPersisted(s: PersistedState): PersistedState {
  const out = {} as Record<string, unknown>;
  for (const k of PERSISTED_KEYS) out[k] = s[k];
  return out as unknown as PersistedState;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Начисление XP + уведомление о новом уровне. */
      const award = (amount: number, reason: string) => {
        if (amount <= 0) return;
        const before = levelFor(get().xp).current;
        const xp = get().xp + amount;
        const after = levelFor(xp).current;
        const ev: XpEvent = { id: uid('xp'), date: new Date().toISOString(), amount, reason };
        set({ xp, xpEvents: [...get().xpEvents.slice(-199), ev] });
        if (after.index > before.index) {
          notify({ title: `Новый уровень: ${after.name}`, body: `Ты достиг уровня «${LEVEL_RU[after.name]}». Так держать!`, kind: 'level', link: '/achievements' });
          toast.xp(`Уровень ${after.index} — ${after.name}`, LEVEL_RU[after.name]);
        }
      };

      const notify = (n: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
        const p = get().profile.notifications;
        if (n.kind === 'achievement' && !p.achievements) return;
        if (n.kind === 'reminder' && !p.reminders) return;
        set({ notifications: [{ ...n, id: uid('n'), date: new Date().toISOString(), read: false }, ...get().notifications].slice(0, 50) });
      };

      const checkAchievements = () => {
        const s = get();
        const unlocked = evaluateAchievements(pickPersisted(s)).filter((id) => !s.achievements[id]);
        if (!unlocked.length) return;
        const now = new Date().toISOString();
        const achievements = { ...s.achievements };
        for (const id of unlocked) achievements[id] = now;
        set({ achievements, pendingUnlocks: [...s.pendingUnlocks, ...unlocked] });
        for (const id of unlocked) {
          const def = ACHIEVEMENTS.find((a) => a.id === id);
          if (!def) continue;
          notify({ title: `Достижение: ${def.title}`, body: def.description, kind: 'achievement', link: '/achievements' });
          award(def.xp, `Достижение «${def.title}»`);
        }
      };

      /** Бонус за серию — раз в день при первой активности. */
      const touchStreak = () => {
        const today = dayKey();
        if (get().lastStreakAward === today) return;
        const streak = computeStreak(activeDaySet(get()));
        set({ lastStreakAward: today });
        if (streak >= 2) award(XP.streakDay, `Серия ${streak} дн.`);
      };

      const logTime = (sec: number, date = new Date()) => {
        const k = dayKey(date);
        set({ studyLog: { ...get().studyLog, [k]: (get().studyLog[k] ?? 0) + Math.round(sec) } });
      };

      const upsertMistake = (questionId: string, answer: Answer | null, date: string) => {
        const mistakes = [...get().mistakes];
        const idx = mistakes.findIndex((m) => m.questionId === questionId);
        if (idx >= 0) {
          const m = mistakes[idx];
          mistakes[idx] = { ...m, studentAnswer: answer, date, status: m.status === 'mastered' ? 'learning' : m.status };
        } else {
          mistakes.push({ id: uid('m'), questionId, studentAnswer: answer, date, status: 'new', reviewCount: 0 });
        }
        set({ mistakes });
      };

      const toAttempts = (answers: SessionAnswer[], mode: AttemptMode, endIso: string): Attempt[] => {
        const qmap = questionById(get());
        let t = new Date(endIso).getTime() - answers.reduce((s, a) => s + a.timeMs, 0);
        return answers.flatMap((a) => {
          const q = qmap.get(a.questionId);
          t += a.timeMs;
          if (!q || a.answer === null) return [];
          return [{ id: uid('a'), questionId: q.id, subject: q.subject, topic: q.topic, difficulty: q.difficulty, correct: a.correct, timeMs: a.timeMs, date: new Date(t).toISOString(), mode }];
        });
      };

      const afterActivity = () => {
        touchStreak();
        get().syncDailyGoals();
        get().syncWeeklyGoals();
        checkAchievements();
      };

      return {
        ...initialState(),
        pendingUnlocks: [],

        recordPractice: ({ subject, topics, startedAt, answers, durationSec }) => {
          const finishedAt = new Date().toISOString();
          const qmap = questionById(get());
          const correct = answers.filter((a) => a.correct);
          const hardBonus = correct.filter((a) => qmap.get(a.questionId)?.difficulty === 'hard').length * XP.correctHardBonus;
          const xpEarned = correct.length * XP.correct + hardBonus + (answers.length ? XP.sessionComplete : 0);
          const result: PracticeSessionResult = { id: uid('s'), subject, topics, startedAt, finishedAt, answers, durationSec, xpEarned };
          set({ sessions: [...get().sessions, result], attempts: [...get().attempts, ...toAttempts(answers, 'practice', finishedAt)] });
          for (const a of answers) if (!a.correct && a.answer !== null) upsertMistake(a.questionId, a.answer, finishedAt);
          logTime(durationSec);
          award(xpEarned, 'Практическая сессия');
          afterActivity();
          return result;
        },

        recordExam: (exam) => {
          const result: ExamResult = { ...exam, id: uid('e') };
          const qmap = questionById(get());
          // эссе (IELTS Writing) не попадают в попытки и тетрадь ошибок — они оцениваются отдельно
          const answers: SessionAnswer[] = exam.questionIds.filter((id) => qmap.get(id)?.type !== 'essay').map((id) => {
            const q = qmap.get(id);
            const ans = exam.answers[id] ?? null;
            return { questionId: id, answer: ans, correct: !!q && ans !== null && checkCorrect(q, ans), timeMs: Math.round((exam.durationSec * 1000) / Math.max(1, exam.questionIds.length)) };
          });
          set({ exams: [...get().exams, result], attempts: [...get().attempts, ...toAttempts(answers, 'exam', exam.finishedAt)] });
          for (const a of answers) if (!a.correct && a.answer !== null) upsertMistake(a.questionId, a.answer, exam.finishedAt);
          logTime(exam.durationSec);
          const pctScore = exam.maxScore ? exam.score / exam.maxScore : 0;
          award(XP.examComplete + Math.round(pctScore * 70), 'Пробный экзамен');
          afterActivity();
          return result;
        },

        recordReview: (questionId, answer, correct, timeMs) => {
          const q = questionById(get()).get(questionId);
          if (!q) return null;
          const now = new Date().toISOString();
          set({
            attempts: [...get().attempts, { id: uid('a'), questionId, subject: q.subject, topic: q.topic, difficulty: q.difficulty, correct, timeMs, date: now, mode: 'review' }],
          });
          let newStatus: MistakeStatus | null = null;
          const mistakes = get().mistakes.map((m) => {
            if (m.questionId !== questionId) return m;
            const next: MistakeStatus = correct ? (m.status === 'new' ? 'learning' : 'mastered') : 'learning';
            newStatus = next;
            return { ...m, status: next, reviewCount: m.reviewCount + 1, lastReviewed: now, studentAnswer: correct ? m.studentAnswer : answer };
          });
          set({ mistakes });
          logTime(timeMs / 1000);
          award(newStatus === 'mastered' ? XP.mistakeMastered : XP.mistakeReviewed, newStatus === 'mastered' ? 'Ошибка освоена' : 'Повторение ошибки');
          afterActivity();
          return newStatus;
        },

        addStudyTime: (sec) => {
          if (sec < 5) return;
          logTime(sec);
        },

        setMistakeStatus: (id, status) => {
          const prev = get().mistakes.find((m) => m.id === id);
          set({ mistakes: get().mistakes.map((m) => (m.id === id ? { ...m, status, lastReviewed: new Date().toISOString() } : m)) });
          if (prev && prev.status !== 'mastered' && status === 'mastered') {
            award(XP.mistakeMastered, 'Ошибка освоена');
            checkAchievements();
          }
        },
        deleteMistake: (id) => set({ mistakes: get().mistakes.filter((m) => m.id !== id) }),

        toggleBookmark: (questionId) => {
          const has = get().bookmarks.includes(questionId);
          set({ bookmarks: has ? get().bookmarks.filter((b) => b !== questionId) : [...get().bookmarks, questionId] });
          return !has;
        },

        addTask: (t) => set({ tasks: [...get().tasks, { ...t, id: uid('t'), createdAt: new Date().toISOString(), progress: 0, done: false }] }),
        updateTask: (id, patch) => {
          const prev = get().tasks.find((t) => t.id === id);
          set({
            tasks: get().tasks.map((t) => {
              if (t.id !== id) return t;
              const next = { ...t, ...patch };
              if (patch.progress !== undefined && patch.done === undefined) next.done = next.progress >= next.target;
              return next;
            }),
          });
          const now = get().tasks.find((t) => t.id === id);
          if (prev && now && !prev.done && now.done) {
            award(XP.plannerTask, 'Задача из плана');
            checkAchievements();
          }
        },
        deleteTask: (id) => set({ tasks: get().tasks.filter((t) => t.id !== id) }),
        toggleTask: (id) => {
          const t = get().tasks.find((x) => x.id === id);
          if (!t) return;
          get().updateTask(id, { done: !t.done, progress: !t.done ? t.target : Math.min(t.progress, t.target - 1 < 0 ? 0 : t.target - 1) });
        },

        toggleDailyGoal: (goalId) => {
          const d = get().daily.date === dayKey() ? get().daily : { date: dayKey(), manual: {}, rewarded: [] };
          set({ daily: { ...d, manual: { ...d.manual, [goalId]: !d.manual[goalId] } } });
          get().syncDailyGoals();
        },
        syncDailyGoals: () => {
          const s = get();
          const d: DailyGoalState = s.daily.date === dayKey() ? s.daily : { date: dayKey(), manual: {}, rewarded: [] };
          const goals = dailyGoals(s.profile, s.attempts, s.sessions);
          const done = goals.filter((g) => g.progress >= g.target || d.manual[g.id]).map((g) => g.id);
          const fresh = done.filter((id) => !d.rewarded.includes(id));
          set({ daily: { ...d, rewarded: [...d.rewarded, ...fresh] } });
          if (fresh.length) {
            award(fresh.length * XP.dailyTask, 'Ежедневная цель');
            toast.xp(`+${fresh.length * XP.dailyTask} XP`, 'Ежедневная цель выполнена');
          }
        },

        updateProfile: (patch) => set({ profile: { ...get().profile, ...patch } }),
        setTopicStatus: (topicId, status) => {
          const ts = { ...get().topicStatus };
          if (status === null) delete ts[topicId];
          else ts[topicId] = status;
          set({ topicStatus: ts });
          checkAchievements();
        },

        addCustomQuestion: (q) => set({ customQuestions: [...get().customQuestions, q] }),
        upsertQuestion: (q) => {
          if (isDemoQuestionId(q.id)) {
            set({ questionOverrides: { ...get().questionOverrides, [q.id]: q } });
          } else if (get().customQuestions.some((c) => c.id === q.id)) {
            set({ customQuestions: get().customQuestions.map((c) => (c.id === q.id ? q : c)) });
          } else {
            set({ customQuestions: [...get().customQuestions, q] });
          }
        },
        deleteQuestion: (id) => {
          if (isDemoQuestionId(id)) set({ deletedQuestionIds: [...new Set([...get().deletedQuestionIds, id])] });
          else get().deleteCustomQuestion(id);
        },
        restoreQuestion: (id) => {
          const o = { ...get().questionOverrides };
          delete o[id];
          set({ deletedQuestionIds: get().deletedQuestionIds.filter((d) => d !== id), questionOverrides: o });
        },
        importQuestions: (qs) => {
          let added = 0;
          let updated = 0;
          const existing = questionById(get());
          for (const q of qs) {
            if (existing.has(q.id)) updated++;
            else added++;
            get().upsertQuestion(q);
          }
          return { added, updated };
        },
        setExamFormat: (f) => set({ examFormat: { ...f, updatedAt: new Date().toISOString() } }),
        setTaxonomy: (t) => {
          applyTaxonomy(t);
          set({ taxonomy: t });
        },
        setAdminPinHash: (h) => set({ adminPinHash: h }),
        deleteExam: (id) => set({ exams: get().exams.filter((e) => e.id !== id) }),
        gradeEssay: (examId, questionId, grade) => {
          const qmap = questionById(get());
          set({
            exams: get().exams.map((e) => {
              if (e.id !== examId) return e;
              const essays = { ...(e.essays ?? {}), [questionId]: grade };
              const modules = e.modules ?? [{ title: e.config.title, subject: e.config.sections[0]?.subject ?? 'math', questionIds: e.questionIds }];
              const sc = scoreFull(e.config, modules, e.answers, qmap, essays);
              return { ...e, essays, score: sc.score, maxScore: sc.maxScore, sectionScores: sc.sectionScores, scaled: sc.scaled };
            }),
          });
        },
        addEssayAttempt: (a) => set({ essayAttempts: [...get().essayAttempts, { ...a, id: uid('ess'), date: new Date().toISOString() }].slice(-100) }),
        addChatMessages: (m) =>
          set((st) => {
            let threads = st.chatThreads;
            let activeId = st.activeChatId;
            let active = threads.find((t) => t.id === activeId);
            if (!active) {
              active = { id: uid('chat'), title: 'Новый чат', messages: [], updatedAt: new Date().toISOString() };
              threads = [active, ...threads];
              activeId = active.id;
            }
            const messages = [...active.messages, ...m].slice(-120);
            const firstUser = messages.find((x) => x.role === 'user');
            const title = (active.title === 'Новый чат' || !active.title) && firstUser ? firstUser.text.slice(0, 48) : active.title;
            const updated = { ...active, messages, title, updatedAt: new Date().toISOString() };
            return { chatThreads: threads.map((t) => (t.id === activeId ? updated : t)), activeChatId: activeId };
          }),
        newChat: () =>
          set((st) => {
            const active = st.chatThreads.find((t) => t.id === st.activeChatId);
            if (active && active.messages.length === 0) return {}; // уже на пустом чате
            const t: ChatThread = { id: uid('chat'), title: 'Новый чат', messages: [], updatedAt: new Date().toISOString() };
            return { chatThreads: [t, ...st.chatThreads], activeChatId: t.id };
          }),
        selectChat: (id) => set({ activeChatId: id }),
        deleteChat: (id) =>
          set((st) => {
            const threads = st.chatThreads.filter((t) => t.id !== id);
            const activeChatId = st.activeChatId === id ? (threads[0]?.id ?? null) : st.activeChatId;
            return { chatThreads: threads, activeChatId };
          }),
        renameChat: (id, title) => set((st) => ({ chatThreads: st.chatThreads.map((t) => (t.id === id ? { ...t, title: title.slice(0, 60) || t.title } : t)) })),
        clearChat: () =>
          set((st) => {
            if (!st.activeChatId) return { chatThreads: [], assistantHistory: [] };
            const threads = st.chatThreads.filter((t) => t.id !== st.activeChatId);
            return { chatThreads: threads, activeChatId: threads[0]?.id ?? null, assistantHistory: [] };
          }),
        syncWeeklyGoals: () => {
          const s = get();
          const wk = dayKey(startOfWeek());
          const w = s.weekly.week === wk ? s.weekly : { week: wk, rewarded: [] };
          const goals = weeklyGoals(s);
          const fresh = goals.filter((g) => g.progress >= g.target && !w.rewarded.includes(g.id));
          set({ weekly: { week: wk, rewarded: [...w.rewarded, ...fresh.map((g) => g.id)] } });
          for (const g of fresh) {
            award(g.xp, `Недельная цель: ${g.title}`);
            toast.xp(`+${g.xp} XP`, `Недельная цель выполнена: ${g.title}`);
          }
        },
        markSynced: () => set({ lastSyncAt: new Date().toISOString() }),

        deleteCustomQuestion: (id) =>
          set({
            customQuestions: get().customQuestions.filter((q) => q.id !== id),
            bookmarks: get().bookmarks.filter((b) => b !== id),
            mistakes: get().mistakes.filter((m) => m.questionId !== id),
          }),

        markNotificationRead: (id) => set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }),
        markAllNotificationsRead: () => set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),
        clearNotifications: () => set({ notifications: [] }),
        ensureDailyReminders: () => {
          const s = get();
          const today = dayKey();
          if (s.lastReminderDay === today) return;
          set({ lastReminderDay: today });
          const left = daysBetween(new Date(), fromKey(s.profile.examDate));
          if (left > 0) notify({ title: `До ЕНТ осталось ${left} дн.`, body: 'Загляни в план недели и выбери задачи на сегодня.', kind: 'reminder', link: '/planner' });
          const fresh = s.mistakes.filter((m) => m.status === 'new').length;
          if (fresh > 0) notify({ title: `Новых ошибок: ${fresh}`, body: 'Повтори их — это самый быстрый способ поднять балл.', kind: 'reminder', link: '/mistakes?review=1' });
        },

        // Сброс истории не трогает банк вопросов, справочник, формат ЕНТ и PIN администратора
        resetDemo: () => set({ ...demoState({ ...DEFAULT_PROFILE, theme: get().profile.theme }), ...keepAdmin(get()), pendingUnlocks: [] }),
        clearAll: () => set({ ...emptyState({ ...get().profile }), ...keepAdmin(get()), pendingUnlocks: [] }),
        importData: (data) => {
          const parsed = parseImport(data);
          if (!parsed) return false;
          const next = { ...emptyState(), ...parsed } as PersistedState;
          applyTaxonomy(next.taxonomy);
          set({ ...next, pendingUnlocks: [] });
          return true;
        },

        shiftUnlock: () => set({ pendingUnlocks: get().pendingUnlocks.slice(1) }),
      };
    },
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickPersisted(s),
      // v1 (ExamPilot) → v2 (LexEdu): добавляем новые поля, ничего не удаляя
      migrate: (persisted) => ({ ...emptyState(), ...(persisted as Partial<PersistedState>) }) as unknown as AppState,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyTaxonomy(state.taxonomy ?? EMPTY_TAXONOMY);
        // Миграция старой одиночной переписки в список чатов
        if ((!state.chatThreads || state.chatThreads.length === 0) && state.assistantHistory?.length) {
          const first = state.assistantHistory.find((x) => x.role === 'user');
          const thread: ChatThread = { id: uid('chat'), title: first ? first.text.slice(0, 48) : 'Переписка с Lexi', messages: state.assistantHistory, updatedAt: new Date().toISOString() };
          state.chatThreads = [thread];
          state.activeChatId = thread.id;
          state.assistantHistory = [];
        }
      },
    },
  ),
);


function keepAdmin(s: PersistedState) {
  const { customQuestions, questionOverrides, deletedQuestionIds, taxonomy, examFormat, adminPinHash } = s;
  return { customQuestions, questionOverrides, deletedQuestionIds, taxonomy, examFormat, adminPinHash };
}

function parseImport(data: unknown): Partial<PersistedState> | null {
  const root = (data && typeof data === 'object' && 'state' in data ? (data as { state: unknown }).state : data) as unknown;
  const res = importSchema.safeParse(root);
  if (!res.success) return null;
  return res.data as unknown as Partial<PersistedState>;
}

export function exportPayload() {
  const s = pickPersisted(useAppStore.getState());
  // PIN администратора не экспортируется
  return { app: 'LexEdu', version: STORE_VERSION, exportedAt: new Date().toISOString(), state: { ...s, adminPinHash: null } };
}

/** Удобный хук для карты вопросов. */
export function useQuestionMap() {
  const bankVersion = useBank((s) => s.version);
  const customQuestions = useAppStore((s) => s.customQuestions);
  const questionOverrides = useAppStore((s) => s.questionOverrides);
  const deletedQuestionIds = useAppStore((s) => s.deletedQuestionIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => questionById({ customQuestions, questionOverrides, deletedQuestionIds }), [customQuestions, questionOverrides, deletedQuestionIds, bankVersion]);
}

export function useAllQuestions() {
  const bankVersion = useBank((s) => s.version);
  const customQuestions = useAppStore((s) => s.customQuestions);
  const questionOverrides = useAppStore((s) => s.questionOverrides);
  const deletedQuestionIds = useAppStore((s) => s.deletedQuestionIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => allQuestions({ customQuestions, questionOverrides, deletedQuestionIds }), [customQuestions, questionOverrides, deletedQuestionIds, bankVersion]);
}

/** Текущий формат ЕНТ из настроек администратора. */
export function useExamFormat() {
  return useAppStore((s) => s.examFormat);
}

/** Активная переписка с Lexi и список чатов. */
export function useChat() {
  const threads = useAppStore((s) => s.chatThreads);
  const activeId = useAppStore((s) => s.activeChatId);
  const active = threads.find((t) => t.id === activeId) ?? null;
  return { threads, activeId: active?.id ?? null, messages: active?.messages ?? [] };
}
