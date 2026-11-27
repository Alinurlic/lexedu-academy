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

function apply(open: Question[]) {
  const own = new Set(builtin.map((q) => q.id));
  builtin = [...builtin, ...open.filter((q) => !own.has(q.id))];
  builtinIds = new Set(builtin.map((q) => q.id));
}

/**
 * Запускается один раз при старте приложения.
 * Сначала грузится языковая часть ученика — после неё страницы с заданиями открываются;
 * вторая часть (для добора и других языков) догружается фоном.
 * Если загрузка не удалась, работает собственный банк LexEdu.
 */
export function loadBank(first: 'ru' | 'kk' = 'ru'): Promise<void> {
  const second = first === 'ru' ? 'kk' : 'ru';
  started ??= import('./open')
    .then(async (m) => {
      const a = await m.loadOpenQuestions(first);
      apply(a);
      useBank.setState((s) => ({ status: 'ready', version: s.version + 1, openCount: a.length }));
      const b = await m.loadOpenQuestions(second);
      apply(b);
      useBank.setState((s) => ({ version: s.version + 1, openCount: s.openCount + b.length }));
    })
    .catch((e) => {
      console.warn('Открытый банк заданий не загрузился', e);
      useBank.setState((s) => ({ status: s.status === 'ready' ? 'ready' : 'error', version: s.version + 1 }));
    });
  return started;
}
