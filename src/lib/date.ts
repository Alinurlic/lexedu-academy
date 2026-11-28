import { tr, uiLang } from '@/i18n';
export const DAY_MS = 86_400_000;

export function dayKey(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeek(d: Date = new Date()): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (r.getDay() + 6) % 7; // Пн = 0
  return addDays(r, -day);
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Массив подписей, элементы которого читаются на текущем языке интерфейса. */
function trArray(raw: string[]): string[] {
  const a: string[] = [];
  raw.forEach((s, i) => Object.defineProperty(a, i, { get: () => tr(s), enumerable: true }));
  return a;
}

export const WEEKDAYS_SHORT = trArray(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
export const WEEKDAYS_FULL = trArray(['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']);
export const MONTHS_SHORT = trArray(['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']);

// Казахские даты собираем сами: не во всех браузерах есть казахская локаль Intl
const KK_MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
const KK_MONTHS_SHORT = ['қаң.', 'ақп.', 'нау.', 'сәу.', 'мам.', 'мау.', 'шіл.', 'там.', 'қыр.', 'қаз.', 'қар.', 'жел.'];
const KK_WEEKDAYS = ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'];
const KK_WEEKDAYS_SHORT = ['жк', 'дс', 'сс', 'ср', 'бс', 'жм', 'сн'];
const pad2 = (n: number) => String(n).padStart(2, '0');

function fmtKk(d: Date, o: Intl.DateTimeFormatOptions) {
  const parts: string[] = [];
  if (o.year) parts.push(`${d.getFullYear()} ж.`);
  if (o.day) parts.push(String(d.getDate()));
  if (o.month) parts.push((o.month === 'long' ? KK_MONTHS : KK_MONTHS_SHORT)[d.getMonth()]);
  let s = parts.join(' ');
  if (o.weekday) s = `${(o.weekday === 'long' ? KK_WEEKDAYS : KK_WEEKDAYS_SHORT)[d.getDay()]}, ${s}`;
  if (o.hour) s += `${s ? ', ' : ''}${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return s;
}

export function fmtDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return uiLang() === 'kk' ? fmtKk(date, opts) : new Intl.DateTimeFormat('ru-RU', opts).format(date);
}

export function fmtDateTime(d: Date | string) {
  return fmtDate(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return tr('{0} ч {1} мин', h, m);
  if (m > 0) return tr('{0} мин {1}', m, s % 60 ? tr('{0} с', s % 60) : '').trim();
  return tr('{0} с', s);
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = String(m).padStart(2, '0');
  const sss = String(ss).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${sss}` : `${mm}:${sss}`;
}

export function daysBetween(a: Date, b: Date) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return tr('Доброй ночи');
  if (h < 12) return tr('Доброе утро');
  if (h < 18) return tr('Добрый день');
  return tr('Добрый вечер');
}
