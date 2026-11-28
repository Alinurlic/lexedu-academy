/**
 * Язык интерфейса LexEdu Academy: русский или казахский.
 *
 * Ключ перевода — сама русская строка: tr('Начать сессию') вернёт её же на русском
 * и перевод из словаря kk.ts на казахском. {0}, {1} … — подстановки:
 * tr('Вопрос {0} из {1}', 3, 10). Если перевода нет, показывается русский текст.
 *
 * Казахский словарь — отдельный файл, его скачивают только те, кто выбрал казахский интерфейс.
 * Язык меняется через setUiLang (сохраняется в профиле), интерфейс после смены перерисовывается целиком.
 */
export type UiLang = 'ru' | 'kk';

let current: UiLang = 'ru';
let KK: Record<string, string> | null = null;
const missing = new Set<string>();

export const uiLang = (): UiLang => current;
/** Локаль для дат и чисел. */
export const uiLocale = () => (current === 'kk' ? 'kk-KZ' : 'ru-RU');

/** Загружает словарь (если нужен) и включает язык. Вызывается до отрисовки и при смене языка. */
export async function loadUiLang(lang: UiLang) {
  if (lang === 'kk' && !KK) KK = (await import('./kk')).KK;
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'kk' ? 'kk' : 'ru';
}

export function tr(key: string, ...args: Array<string | number | null | undefined>): string {
  let s = key;
  if (current === 'kk' && KK) {
    const v = KK[key];
    if (v !== undefined) s = v;
    else if (/[А-Яа-яЁё]/.test(key) && !/[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(key)) missing.add(key); // английские и уже казахские строки не в счёт
  }
  if (!args.length) return s;
  return s.replace(/\{(\d+)\}/g, (_, i: string) => {
    const a = args[Number(i)];
    return a === undefined || a === null ? '' : String(a);
  });
}

/** Строки без перевода, встреченные в этой сессии (для проверки словаря; в консоли — __lexeduI18nMissing()). */
export const missingTranslations = () => [...missing];
if (typeof window !== 'undefined') (window as unknown as { __lexeduI18nMissing?: () => string[] }).__lexeduI18nMissing = missingTranslations;

/**
 * Делает поле объекта переводимым: при чтении возвращает tr(исходная строка).
 * Нужно для справочников, которые создаются один раз при загрузке модуля (предметы, темы).
 */
export function trProp<T extends object>(obj: T, key: keyof T & string) {
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  if (!desc || desc.get || typeof desc.value !== 'string') return;
  let raw: string = desc.value;
  Object.defineProperty(obj, key, {
    get: () => tr(raw),
    set: (v: string) => {
      raw = v;
    },
    enumerable: true,
    configurable: true,
  });
}

/** Исходная (русская) строка поля, сделанного переводимым через trProp. */
export function rawProp<T extends object>(obj: T, key: keyof T & string): string {
  const prev = current;
  current = 'ru';
  try {
    return String(obj[key]);
  } finally {
    current = prev;
  }
}
