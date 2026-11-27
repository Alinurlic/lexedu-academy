import type { Question, QuestionLang, SubjectId } from '@/types';

/**
 * Язык заданий. ЕНТ сдают на русском или казахском (настройка «Язык сдачи ЕНТ»),
 * SAT, IELTS и английский язык — на английском. Языковые предметы имеют свой фиксированный язык.
 */
export type EntLang = 'ru' | 'kk';

const FIXED: Partial<Record<SubjectId, QuestionLang>> = { russian: 'ru', ruslit: 'ru', kazakh: 'kk', kazlit: 'kk', english: 'en' };

export const LANG_LABEL: Record<QuestionLang, string> = { ru: 'на русском', kk: 'на казахском', en: 'на английском' };
export const LANG_SHORT: Record<QuestionLang, string> = { ru: 'РУС', kk: 'ҚАЗ', en: 'ENG' };

export function questionLang(q: Pick<Question, 'lang' | 'subject'>): QuestionLang {
  if (q.lang) return q.lang;
  if (q.subject === 'english' || q.subject.startsWith('sat-') || q.subject.startsWith('ielts-')) return 'en';
  return FIXED[q.subject] ?? 'ru';
}

/** На каком языке ученик решает этот предмет. */
export function studyLang(subject: SubjectId, entLang: EntLang): QuestionLang {
  if (subject.startsWith('sat-') || subject.startsWith('ielts-')) return 'en';
  return FIXED[subject] ?? entLang;
}

export const inStudyLang = (q: Pick<Question, 'lang' | 'subject'>, entLang: EntLang) => questionLang(q) === studyLang(q.subject, entLang);

/** Если по предмету на языке ученика меньше заданий, чем нужно для блока ЕНТ, добираем с другого языка. */
export const FALLBACK_MIN = 40;

/**
 * Задания для ученика: сначала на его языке; для предметов, где своих меньше FALLBACK_MIN,
 * в конец добавляются задания на другом языке. `fallback` — предметы, где понадобился добор.
 */
export function forStudy(questions: Question[], entLang: EntLang): { list: Question[]; fallback: Set<SubjectId> } {
  const own = new Map<SubjectId, number>();
  for (const q of questions) if (inStudyLang(q, entLang)) own.set(q.subject, (own.get(q.subject) ?? 0) + 1);
  const fallback = new Set<SubjectId>();
  const list: Question[] = [];
  const extra: Question[] = [];
  for (const q of questions) {
    if (inStudyLang(q, entLang)) list.push(q);
    else if ((own.get(q.subject) ?? 0) < FALLBACK_MIN) {
      extra.push(q);
      fallback.add(q.subject);
    }
  }
  return { list: [...list, ...extra], fallback };
}
