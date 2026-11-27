import { create } from 'zustand';
import type { Question } from '@/types';
import { DEMO_QUESTIONS } from './index';

/**
 * Реестр встроенных заданий: собственные задания LexEdu (сразу) + открытый банк (догружается).
 * `version` меняется после загрузки — хуки пересчитывают списки вопросов.
 */
let builtin: Question[] = DEMO_QUESTIONS;
let builtinIds = new Set(builtin.map((q) => q.id));

type BankState = { status: 'loading' | 'ready' | 'error'; version: number; openCount: number };
export const useBank = create<BankState>(() => ({ status: 'loading', version: 0, openCount: 0 }));

export const builtinQuestions = () => builtin;
export const isBuiltinQuestionId = (id: string) => builtinIds.has(id);

let started: Promise<void> | null = null;

/** Запускается один раз при старте приложения. Если загрузка не удалась, работает собственный банк. */
export function loadBank(): Promise<void> {
  started ??= import('./open')
    .then((m) => m.loadOpenQuestions())
    .then((open) => {
      const own = new Set(DEMO_QUESTIONS.map((q) => q.id));
      builtin = [...DEMO_QUESTIONS, ...open.filter((q) => !own.has(q.id))];
      builtinIds = new Set(builtin.map((q) => q.id));
      useBank.setState((s) => ({ status: 'ready', version: s.version + 1, openCount: open.length }));
    })
    .catch((e) => {
      console.warn('Открытый банк заданий не загрузился', e);
      useBank.setState((s) => ({ status: 'error', version: s.version + 1 }));
    });
  return started;
}
