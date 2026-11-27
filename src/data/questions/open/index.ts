import type { Question, SubjectId } from '@/types';

/**
 * Открытый банк заданий ЕНТ из датасета KazMMLU (MBZUAI, лицензия CC BY-NC 4.0).
 * Файлы km-*.json создаёт scripts/import-kazmmlu.py; каждый предмет — отдельный чанк,
 * который загружается фоном и не замедляет первое открытие сайта.
 */
export const OPEN_BANK_LICENSE = 'KazMMLU (MBZUAI), CC BY-NC 4.0';
export const OPEN_BANK_URL = 'https://huggingface.co/datasets/MBZUAI/KazMMLU';

type Row = [number, string, string, string[], number, string];
type File = { subject: SubjectId; rows: Row[] };

const files = import.meta.glob<File>('./km-*.json', { import: 'default' });

const host = (url: string) => url.replace(/^https?:\/\/([^/]+).*$/, '$1');

function expand({ subject, rows }: File): Question[] {
  return rows.map(([id, topic, question, options, key, ref]) => ({
    id: `km-${subject}-${id}`,
    type: 'single',
    subject,
    topic,
    difficulty: 'medium',
    question,
    options,
    correctAnswer: key,
    explanation: `Верный ответ: ${options[key].replace(/[.\s]+$/, '')}. Подробный разбор для этого задания пока не добавлен — попроси Lexi объяснить решение.`,
    source: 'open',
    sourceNote: `Открытый источник: ${OPEN_BANK_LICENSE}. Первоисточник: ${host(ref)}.`,
    sourceRef: ref,
    verification: 'unverified',
    tags: ['kazmmlu', 'открытый источник'],
  }));
}

export async function loadOpenQuestions(): Promise<Question[]> {
  const parts = await Promise.all(Object.values(files).map((load) => load()));
  return parts.flatMap(expand);
}
