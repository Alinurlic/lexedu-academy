import type { Question, QuestionLang, SubjectId } from '@/types';

/**
 * Открытый банк заданий ЕНТ из датасета KazMMLU (MBZUAI, лицензия CC BY-NC 4.0):
 * русскоязычные (km-ru-*.json) и казахскоязычные (km-kk-*.json) школьные разделы.
 * Файлы создаёт scripts/import-kazmmlu.py; каждый файл — отдельный чанк, загружается фоном.
 */
export const OPEN_BANK_LICENSE = 'KazMMLU (MBZUAI), CC BY-NC 4.0';
export const OPEN_BANK_URL = 'https://huggingface.co/datasets/MBZUAI/KazMMLU';

type Row = [number, string, string, string[], number, string];
type File = { subject: SubjectId; lang?: QuestionLang; rows: Row[] };

const files = import.meta.glob<File>('./km-*.json', { import: 'default' });

const host = (url: string) => url.replace(/^https?:\/\/([^/]+).*$/, '$1');
const strip = (s: string) => s.replace(/[.\s]+$/, '');

function expand({ subject, lang = 'ru', rows }: File): Question[] {
  const kk = lang === 'kk';
  return rows.map(([id, topic, question, options, key, ref]) => ({
    // id русских заданий не меняется (на них уже ссылаются попытки и ошибки учеников)
    id: kk ? `km-kk-${subject}-${id}` : `km-${subject}-${id}`,
    type: 'single',
    subject,
    topic,
    difficulty: 'medium',
    lang,
    question,
    options,
    correctAnswer: key,
    explanation: kk
      ? `Дұрыс жауап: ${strip(options[key])}. Шешімін қадам бойынша көру үшін «Подробный разбор от Lexi» батырмасын бас.`
      : `Верный ответ: ${strip(options[key])}. Решение по шагам — в «Подробном разборе от Lexi».`,
    source: 'open',
    sourceNote: kk ? `Ашық дереккөз: ${OPEN_BANK_LICENSE}. Түпнұсқа: ${host(ref)}.` : `Открытый источник: ${OPEN_BANK_LICENSE}. Первоисточник: ${host(ref)}.`,
    sourceRef: ref,
    verification: 'unverified',
    tags: ['kazmmlu', 'открытый источник', ...(kk ? ['қазақша'] : [])],
  }));
}

/** Загружает файлы банка; `lang` — только одна языковая часть (km-ru-* или km-kk-*). */
export async function loadOpenQuestions(lang?: Exclude<QuestionLang, 'en'>): Promise<Question[]> {
  const entries = Object.entries(files).filter(([path]) => !lang || path.includes(`/km-${lang}-`));
  const parts = await Promise.all(entries.map(([, load]) => load()));
  return parts.flatMap(expand);
}
