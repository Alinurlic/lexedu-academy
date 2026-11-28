/**
 * Казахский словарь интерфейса: ключ — русская строка, значение — перевод.
 * Загружается отдельным файлом только при выбранном казахском интерфейсе.
 * Полноту словаря проверяет тест src/__tests__/i18n.test.ts.
 */
import subjects from './kk/subjects';
import components from './kk/components';
import lib from './kk/lib';
import pagesPublic from './kk/pagesPublic';
import pagesHome from './kk/pagesHome';
import pagesStudy from './kk/pagesStudy';
import pagesMore from './kk/pagesMore';

export const KK: Record<string, string> = { ...subjects, ...components, ...lib, ...pagesPublic, ...pagesHome, ...pagesStudy, ...pagesMore };
