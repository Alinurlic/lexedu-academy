import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Answer, ExamConfig, ExamModule, SubjectId } from '@/types';

export interface PracticeEntry {
  answer: Answer | null;
  submitted: boolean;
  correct: boolean;
  timeMs: number;
}

export interface ActivePractice {
  subject: SubjectId;
  topics: string[];
  questionIds: string[];
  current: number;
  entries: Record<string, PracticeEntry>;
  startedAt: string;
  timeLimitSec: number | null;
  label: string;
}

export interface ActiveExam {
  config: ExamConfig;
  modules: ExamModule[];
  /** Текущий модуль (SAT — 4 модуля, IELTS — секции, ЕНТ — один модуль) */
  moduleIndex: number;
  /** Индекс вопроса внутри текущего модуля */
  current: number;
  answers: Record<string, Answer | null>;
  flagged: string[];
  startedAt: string;
  /** Дедлайн текущего модуля, epoch ms */
  deadline: number;
  /** Перерыв перед модулем (SAT), epoch ms */
  breakUntil?: number | null;
  shortened?: string;
}

interface SessionState {
  practice: ActivePractice | null;
  exam: ActiveExam | null;
  setPractice: (p: ActivePractice | null) => void;
  patchPractice: (patch: Partial<ActivePractice>) => void;
  setExam: (e: ActiveExam | null) => void;
  patchExam: (patch: Partial<ActiveExam>) => void;
}

/** Активные сессии хранятся в sessionStorage — переживают перезагрузку вкладки. */
export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      practice: null,
      exam: null,
      setPractice: (practice) => set({ practice }),
      patchPractice: (patch) => {
        const p = get().practice;
        if (p) set({ practice: { ...p, ...patch } });
      },
      setExam: (exam) => set({ exam }),
      patchExam: (patch) => {
        const e = get().exam;
        if (e) set({ exam: { ...e, ...patch } });
      },
    }),
    { name: 'lexedu-active-session', version: 2, storage: createJSONStorage(() => sessionStorage), migrate: () => ({ practice: null, exam: null }) as unknown as SessionState },
  ),
);
