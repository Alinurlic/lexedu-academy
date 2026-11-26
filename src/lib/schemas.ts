import { z } from 'zod';

export const subjectIdSchema = z.enum(['math', 'physics', 'geography', 'biology', 'chemistry', 'history', 'reading', 'mathlit', 'english', 'informatics']);
const difficulty = z.enum(['easy', 'medium', 'hard']);
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const answer = z.union([z.number(), z.array(z.number()), z.string(), z.boolean()]).nullable();

const questionBase = z.object({
  id: z.string().min(1),
  subject: subjectIdSchema,
  topic: z.string().min(1),
  difficulty,
  question: z.string().min(1),
  passage: z.string().optional(),
  explanation: z.string(),
  source: z.enum(['demo', 'user', 'verified']),
  sourceNote: z.string().optional(),
  sourceRef: z.string().optional(),
  verification: z.enum(['unverified', 'reviewed', 'needs_review']).optional(),
  tags: z.array(z.string()),
});

export const questionSchema = z.discriminatedUnion('type', [
  questionBase.extend({ type: z.literal('single'), options: z.array(z.string()).min(2), correctAnswer: z.number().int().min(0) }),
  questionBase.extend({ type: z.literal('multiple'), options: z.array(z.string()).min(2), correctAnswer: z.array(z.number().int().min(0)).min(1) }),
  questionBase.extend({ type: z.literal('numeric'), correctAnswer: z.number(), tolerance: z.number().optional(), unit: z.string().optional() }),
  questionBase.extend({ type: z.literal('boolean'), correctAnswer: z.boolean() }),
]);

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Введите имя').max(40, 'Не длиннее 40 символов'),
  avatarColor: z.string(),
  avatarEmoji: z.string(),
  grade: z.number().int().min(9).max(12),
  targetScore: z.number().int().min(50, 'Минимум 50').max(140, 'Максимум 140'),
  profileSubjects: z.tuple([subjectIdSchema, subjectIdSchema]),
  examDate: dayKey,
  dailyGoalMin: z.number().int().min(10).max(600),
  dailyQuestionGoal: z.number().int().min(5).max(300),
  theme: z.enum(['dark', 'light', 'system']),
  language: z.enum(['ru', 'kk']),
  notifications: z.object({ reminders: z.boolean(), achievements: z.boolean(), weeklyReport: z.boolean() }),
  sidebarCollapsed: z.boolean(),
  activeTrack: z.enum(['ent', 'sat', 'ielts']).optional(),
  tracks: z.any().optional(),
  onboarded: z.boolean().optional(),
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(2, 'Минимум 2 символа').max(120, 'Не длиннее 120 символов'),
  date: dayKey,
  subject: subjectIdSchema.optional(),
  kind: z.enum(['questions', 'topics', 'minutes', 'custom']),
  target: z.number({ invalid_type_error: 'Введите число' }).int('Целое число').min(1, 'Минимум 1').max(500, 'Максимум 500'),
  priority: z.enum(['low', 'medium', 'high']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Формат ЧЧ:ММ').optional().or(z.literal('')),
});

export const customQuestionFormSchema = z
  .object({
    question: z.string().trim().min(5, 'Сформулируйте вопрос (минимум 5 символов)').max(600),
    topic: z.string().min(1, 'Выберите тему'),
    difficulty,
    type: z.enum(['single', 'boolean', 'numeric']),
    options: z.array(z.string().trim().max(200)),
    correctIndex: z.number().int(),
    correctBool: z.boolean(),
    correctNumber: z.string(),
    explanation: z.string().trim().min(3, 'Добавьте объяснение').max(1000),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'single') {
      const filled = v.options.filter((o) => o.length > 0);
      if (filled.length < 2) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Нужно минимум 2 варианта ответа' });
      if (!v.options[v.correctIndex]) ctx.addIssue({ code: 'custom', path: ['correctIndex'], message: 'Отметьте заполненный правильный вариант' });
    }
    if (v.type === 'numeric') {
      const n = Number(v.correctNumber.replace(',', '.'));
      if (v.correctNumber.trim() === '' || !Number.isFinite(n)) ctx.addIssue({ code: 'custom', path: ['correctNumber'], message: 'Введите числовой ответ' });
    }
  });

const attemptSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  subject: subjectIdSchema,
  topic: z.string(),
  difficulty,
  correct: z.boolean(),
  timeMs: z.number(),
  date: z.string(),
  mode: z.enum(['practice', 'exam', 'review']),
});

const sessionAnswer = z.object({ questionId: z.string(), answer, correct: z.boolean(), timeMs: z.number() });

/** Схема импорта резервной копии — проверяем структуру, чтобы не сломать приложение. */
export const importSchema = z.object({
  profile: profileSchema,
  attempts: z.array(attemptSchema),
  sessions: z.array(
    z.object({ id: z.string(), subject: subjectIdSchema, topics: z.array(z.string()), startedAt: z.string(), finishedAt: z.string(), answers: z.array(sessionAnswer), durationSec: z.number(), xpEarned: z.number() }),
  ),
  exams: z.array(z.any()),
  mistakes: z.array(
    z.object({ id: z.string(), questionId: z.string(), studentAnswer: answer, date: z.string(), status: z.enum(['new', 'learning', 'mastered']), reviewCount: z.number(), lastReviewed: z.string().optional() }),
  ),
  bookmarks: z.array(z.string()),
  tasks: z.array(z.any()),
  daily: z.object({ date: z.string(), manual: z.record(z.boolean()), rewarded: z.array(z.string()) }),
  xp: z.number().min(0),
  xpEvents: z.array(z.any()),
  achievements: z.record(z.string()),
  notifications: z.array(z.any()),
  customQuestions: z.array(questionSchema),
  topicStatus: z.record(z.enum(['not_started', 'in_progress', 'completed'])),
  studyLog: z.record(z.number()),
  lastStreakAward: z.string().nullable(),
  lastReminderDay: z.string().nullable(),
  dataMode: z.enum(['demo', 'clean']),
  // поля LexEdu (v2) — необязательны, чтобы принимать резервные копии ExamPilot
  questionOverrides: z.record(questionSchema).optional(),
  deletedQuestionIds: z.array(z.string()).optional(),
  taxonomy: z.any().optional(),
  examFormat: z.any().optional(),
  assistantHistory: z.array(z.any()).optional(),
  weekly: z.any().optional(),
  lastSyncAt: z.string().nullable().optional(),
  essayAttempts: z.array(z.any()).optional(),
});

/** Официальный источник нельзя указать без ссылки на него. */
export const questionWithPolicySchema = questionSchema.superRefine((q, ctx) => {
  if (q.source === 'verified' && !q.sourceRef?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['sourceRef'], message: 'Для официального вопроса укажите источник (сборник, год, ссылка)' });
  }
  if ((q.type === 'single' || q.type === 'multiple') && q.options) {
    const max = q.options.length - 1;
    const idx = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer as number];
    if (idx.some((i) => i > max)) ctx.addIssue({ code: 'custom', path: ['correctAnswer'], message: 'Правильный ответ ссылается на несуществующий вариант' });
  }
});

export const questionImportSchema = z.union([
  z.array(z.unknown()),
  z.object({ questions: z.array(z.unknown()) }),
]);

export const examFormatSchema = z.object({
  name: z.string().trim().min(2, 'Название формата'),
  totalMinutes: z.number().int().min(10, 'Минимум 10 минут').max(600, 'Максимум 600 минут'),
  updatedAt: z.string(),
  blocks: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().trim().min(2, 'Название блока'),
        slot: z.enum(['fixed', 'profile1', 'profile2']),
        subject: subjectIdSchema.optional(),
        questions: z.number().int().min(1, 'Минимум 1 вопрос').max(200),
        maxPoints: z.number().int().min(1, 'Минимум 1 балл').max(500),
      }),
    )
    .min(1, 'Нужен хотя бы один блок'),
}).superRefine((f, ctx) => {
  f.blocks.forEach((b, i) => {
    if (b.slot === 'fixed' && !b.subject) ctx.addIssue({ code: 'custom', path: ['blocks', i, 'subject'], message: 'Выберите предмет блока' });
  });
});
