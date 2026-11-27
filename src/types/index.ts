export type SubjectId =
  | 'math'
  | 'physics'
  | 'geography'
  | 'biology'
  | 'chemistry'
  | 'history'
  | 'reading'
  | 'mathlit'
  | 'english'
  | 'informatics'
  | 'worldhistory'
  | 'law'
  | 'russian'
  | 'ruslit'
  // SAT
  | 'sat-rw'
  | 'sat-math'
  // IELTS
  | 'ielts-listening'
  | 'ielts-reading'
  | 'ielts-writing'
  | 'ielts-speaking';

/** Экзамен-трек академии. */
export type Track = 'ent' | 'sat' | 'ielts';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Источник вопроса: демо (оригинальные учебные), пользовательские, официальные (только с указанием источника). */
/** demo — собственные задания LexEdu; open — открытый источник с лицензией; verified — официальный источник. */
export type QuestionSource = 'demo' | 'user' | 'verified' | 'open';

/** Статус проверки содержания вопроса. Не путать с источником. */
export type VerificationStatus = 'unverified' | 'reviewed' | 'needs_review';

interface QuestionBase {
  id: string;
  subject: SubjectId;
  topic: string; // topic id
  difficulty: Difficulty;
  question: string;
  passage?: string;
  /** Скрипт аудиозаписи (IELTS Listening) — озвучивается синтезатором речи браузера */
  audio?: string;
  /** Группа заданий с общим текстом/записью — при сборке экзамена идут подряд */
  group?: string;
  /** Контекстное задание ЕНТ (задания 26–30 профильного предмета) */
  context?: boolean;
  explanation: string;
  source: QuestionSource;
  sourceNote?: string;
  /** Ссылка/описание официального источника — обязательна для source = 'verified'. */
  sourceRef?: string;
  verification?: VerificationStatus;
  tags: string[];
}

export interface SingleQuestion extends QuestionBase {
  type: 'single';
  options: string[];
  correctAnswer: number;
}
export interface MultipleQuestion extends QuestionBase {
  type: 'multiple';
  options: string[];
  correctAnswer: number[];
}
export interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  options?: undefined;
  correctAnswer: number;
  tolerance?: number;
  unit?: string;
}
export interface BooleanQuestion extends QuestionBase {
  type: 'boolean';
  options?: undefined;
  correctAnswer: boolean;
}

/** Задание на соответствие: каждому элементу слева — один вариант справа. Ответ: индекс варианта для каждого элемента. */
export interface MatchingQuestion extends QuestionBase {
  type: 'matching';
  prompts: string[];
  options: string[];
  correctAnswer: number[];
}
/** Короткий текстовый ответ (IELTS gap-fill). Принимаются перечисленные варианты. */
export interface TextQuestion extends QuestionBase {
  type: 'text';
  options?: undefined;
  correctAnswer: string[];
  wordLimit?: number;
}
/** Развёрнутый ответ (IELTS Writing / Speaking): оценивается ИИ или по критериям самооценки. */
export interface EssayQuestion extends QuestionBase {
  type: 'essay';
  options?: undefined;
  correctAnswer?: undefined;
  minWords: number;
  task: 'writing1' | 'writing2' | 'speaking';
}

export type Question = SingleQuestion | MultipleQuestion | NumericQuestion | BooleanQuestion | MatchingQuestion | TextQuestion | EssayQuestion;
export type QuestionType = Question['type'];

/** Ответ ученика: индекс, набор индексов, число (строкой из поля ввода) или истина/ложь. */
export type Answer = number | number[] | string | boolean;

export interface Topic {
  id: string;
  name: string;
  subtopics: string[];
  /** Короткая подсказка, что повторить */
  advice: string;
}

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  icon: string; // lucide icon name key
  color: string; // css var
  topics: Topic[];
  kind: 'mandatory' | 'profile' | 'section';
  track: Track;
}

export type AttemptMode = 'practice' | 'exam' | 'review';

export interface Attempt {
  id: string;
  questionId: string;
  subject: SubjectId;
  topic: string;
  difficulty: Difficulty;
  correct: boolean;
  timeMs: number;
  date: string; // ISO
  mode: AttemptMode;
}

export interface SessionAnswer {
  questionId: string;
  answer: Answer | null;
  correct: boolean;
  timeMs: number;
}

export interface PracticeSessionResult {
  id: string;
  subject: SubjectId;
  topics: string[];
  startedAt: string;
  finishedAt: string;
  answers: SessionAnswer[];
  durationSec: number;
  xpEarned: number;
}

export interface ExamSection {
  subject: SubjectId;
  count: number;
  maxPoints: number;
}

export interface ExamConfig {
  title: string;
  kind: 'full' | 'subject' | 'custom';
  sections: ExamSection[];
  timeLimitMin: number;
  track?: Track;
  /** ent — 2/1/0 баллов за соответствие и множественный выбор; flat — 1 балл за верный ответ */
  scoring?: 'ent' | 'flat';
}

/** Модуль экзамена с собственным таймером (SAT — 4 модуля, IELTS — секции). */
export interface ExamModule {
  id: string;
  title: string;
  subject: SubjectId;
  questionIds: string[];
  timeLimitSec: number;
  /** Пауза перед модулем (перерыв SAT) */
  breakBeforeSec?: number;
  adaptive?: 'easy' | 'hard';
}

export interface ExamResult {
  id: string;
  config: ExamConfig;
  modules?: { title: string; subject: SubjectId; questionIds: string[]; adaptive?: 'easy' | 'hard' }[];
  /** Итог по шкале трека: ЕНТ — баллы; SAT — 400–1600; IELTS — band 0–9 */
  scaled?: { label: string; value: number; max: number; parts: { label: string; value: number; max: number }[]; note?: string };
  essays?: Record<string, { band?: number; feedback?: string; self?: boolean }>;
  startedAt: string;
  finishedAt: string;
  questionIds: string[];
  answers: Record<string, Answer | null>;
  flagged: string[];
  durationSec: number;
  autoSubmitted: boolean;
  score: number;
  maxScore: number;
  sectionScores: { subject: SubjectId; score: number; maxPoints: number; correct: number; total: number }[];
}

export type MistakeStatus = 'new' | 'learning' | 'mastered';

export interface Mistake {
  id: string;
  questionId: string;
  studentAnswer: Answer | null;
  date: string;
  status: MistakeStatus;
  reviewCount: number;
  lastReviewed?: string;
}

export type Priority = 'low' | 'medium' | 'high';
export type TaskKind = 'questions' | 'topics' | 'minutes' | 'custom';

export interface StudyTask {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  subject?: SubjectId;
  kind: TaskKind;
  target: number;
  progress: number;
  priority: Priority;
  done: boolean;
  startTime?: string; // HH:MM
  createdAt: string;
}

export interface DailyGoalState {
  date: string;
  manual: Record<string, boolean>;
  rewarded: string[];
}

export interface XpEvent {
  id: string;
  date: string;
  amount: number;
  reason: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  kind: 'achievement' | 'level' | 'reminder' | 'info';
  link?: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export type Level = 'beginner' | 'elementary' | 'intermediate' | 'upper' | 'advanced';

/** Данные онбординга по каждому треку: уровень, последний результат, цель, дата экзамена. */
export interface TrackProfile {
  enabled: boolean;
  level: Level;
  lastResult: number | null;
  lastResultDate: string | null;
  target: number;
  examDate: string;
}

export interface Profile {
  name: string;
  avatarColor: string;
  avatarEmoji: string;
  grade: number;
  targetScore: number;
  profileSubjects: [SubjectId, SubjectId];
  examDate: string; // YYYY-MM-DD
  dailyGoalMin: number;
  dailyQuestionGoal: number;
  theme: ThemeMode;
  language: 'ru' | 'kk';
  notifications: { reminders: boolean; achievements: boolean; weeklyReport: boolean };
  sidebarCollapsed: boolean;
  /** LexEdu Academy */
  activeTrack?: Track;
  tracks?: Partial<Record<Track, TrackProfile>>;
  onboarded?: boolean;
}

export type TopicStatus = 'not_started' | 'in_progress' | 'completed';

/** Блок экзамена в настраиваемом формате ЕНТ. */
export interface ExamFormatBlock {
  key: string;
  label: string;
  /** fixed — конкретный предмет; profile1/profile2 — профильные предметы ученика */
  slot: 'fixed' | 'profile1' | 'profile2';
  subject?: SubjectId;
  questions: number;
  maxPoints: number;
  /** Состав блока по типам заданий (регламент ЕНТ для профильных предметов: 25/5/5/5) */
  composition?: { single: number; context: number; matching: number; multiple: number };
}

export interface ExamFormat {
  name: string;
  blocks: ExamFormatBlock[];
  totalMinutes: number;
  updatedAt: string;
}

export interface TopicDef {
  id: string;
  subject: SubjectId;
  name: string;
  subtopics: string[];
  advice: string;
}

/** Пользовательские изменения справочника предметов и тем (админ-панель). */
export interface Taxonomy {
  subjectNames: Partial<Record<SubjectId, string>>;
  topicEdits: Record<string, { name?: string; subtopics?: string[]; advice?: string }>;
  customTopics: TopicDef[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'lexi';
  text: string;
  date: string;
  /** Структурированное содержимое ответа демо-режима */
  card?:
    | { kind: 'generated'; question: string; answer: number; unit?: string; steps: string[]; subject: SubjectId; topic: string }
    | { kind: 'mistake'; questionId: string }
    | { kind: 'topics'; items: { topicId: string; subject: SubjectId; accuracy: number }[] };
}

export interface WeeklyGoalState {
  week: string; // ключ понедельника
  rewarded: string[];
}
