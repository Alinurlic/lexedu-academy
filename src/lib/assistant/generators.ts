import type { SubjectId } from '@/types';
import { tr } from '@/i18n';

/** Сгенерированная задача: числа подбираются случайно, ответ и решение вычисляются, а не берутся из шаблона. */
export interface GeneratedTask {
  kind: string;
  subject: SubjectId;
  topic: string;
  question: string;
  answer: number;
  unit?: string;
  steps: string[];
}

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n: number) => String(Math.round(n * 1000) / 1000).replace('.', ',');
const signed = (n: number) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);

function linear(): GeneratedTask {
  const x = ri(-9, 12);
  const a = pick([2, 3, 4, 5, 6, 7]);
  const b = ri(-15, 15) || 4;
  const c = a * x + b;
  return {
    kind: 'linear',
    subject: 'math',
    topic: 'math-equations',
    question: tr('Решите уравнение {0}x {1} = {2}.', a, signed(b), c),
    answer: x,
    steps: [tr('Перенесём {0} в правую часть: {1}x = {2} {3} = {4}.', b, a, c, signed(-b), c - b), tr('Разделим обе части на {0}: x = {1} / {2} = {3}.', a, c - b, a, x), tr('Проверка: {0}·{1} {2} = {3}. Верно.', a, x, signed(b), c)],
  };
}

function quadratic(): GeneratedTask {
  let x1 = ri(-6, 7);
  let x2 = ri(-6, 7);
  if (x1 === x2) x2 = x1 + 2;
  if (x1 > x2) [x1, x2] = [x2, x1];
  const b = -(x1 + x2);
  const c = x1 * x2;
  const D = b * b - 4 * c;
  const ask = pick(['sum', 'product', 'larger'] as const);
  const eq = `x² ${b === 0 ? '' : signed(b) + 'x '}${c === 0 ? '' : signed(c) + ' '}= 0`.replace(/\s+/g, ' ');
  const question = ask === 'larger' ? tr('Найдите больший корень уравнения {0}.', eq) : ask === 'sum' ? tr('Найдите сумму корней уравнения {0}.', eq) : tr('Найдите произведение корней уравнения {0}.', eq);
  const answer = ask === 'larger' ? x2 : ask === 'sum' ? x1 + x2 : x1 * x2;
  return {
    kind: 'quadratic',
    subject: 'math',
    topic: 'math-equations',
    question,
    answer,
    steps: [
      tr('Коэффициенты: a = 1, b = {0}, c = {1}.', b, c),
      tr('Дискриминант: D = b² − 4ac = {0} − {1} = {2}, √D = {3}.', b * b, 4 * c, D, Math.sqrt(D)),
      tr('Корни: x = (−b ± √D) / 2 = ({0} ± {1}) / 2, то есть x₁ = {2}, x₂ = {3}.', -b, Math.sqrt(D), x1, x2),
      ask === 'larger' ? tr('Больший корень: {0}.', x2) : ask === 'sum' ? tr('По теореме Виета сумма корней равна −b = {0}.', x1 + x2) : tr('По теореме Виета произведение корней равно c = {0}.', x1 * x2),
    ],
  };
}

function percent(): GeneratedTask {
  const price = pick([4000, 6000, 8000, 12000, 15000, 18000, 24000]);
  const p = pick([10, 15, 20, 25, 30, 40]);
  const ans = price * (1 - p / 100);
  return {
    kind: 'percent',
    subject: 'mathlit',
    topic: 'ml-percent',
    question: tr('Товар стоит {0} тенге. Действует скидка {1}%. Сколько тенге нужно заплатить?', price, p),
    answer: ans,
    unit: tr('тг'),
    steps: [tr('{0}% от {1}: {2} · {3} / 100 = {4} тг.', p, price, price, p, (price * p) / 100), tr('Цена со скидкой: {0} − {1} = {2} тг.', price, (price * p) / 100, ans), tr('Короче: {0} · {1} = {2} тг.', price, fmt(1 - p / 100), ans)],
  };
}

function progression(): GeneratedTask {
  const a1 = ri(-5, 9);
  const d = pick([2, 3, 4, 5, -2, -3]);
  const n = ri(8, 15);
  const an = a1 + (n - 1) * d;
  return {
    kind: 'progression',
    subject: 'math',
    topic: 'math-sequences',
    question: tr('Арифметическая прогрессия: a₁ = {0}, d = {1}. Найдите a{2}.', a1, d, toSub(n)),
    answer: an,
    steps: [tr('Формула n-го члена: aₙ = a₁ + (n − 1)·d.'), `a${toSub(n)} = ${a1} + (${n} − 1)·(${d}) = ${a1} + ${(n - 1) * d} = ${an}.`],
  };
}

function ohm(): GeneratedTask {
  const r = pick([2, 4, 5, 6, 8, 10, 12]);
  const i = pick([1.5, 2, 3, 4, 5]);
  const u = r * i;
  return {
    kind: 'ohm',
    subject: 'physics',
    topic: 'phys-electricity',
    question: tr('Напряжение на резисторе {0} В, сопротивление {1} Ом. Найдите силу тока (А).', fmt(u), r),
    answer: i,
    unit: tr('А'),
    steps: [tr('Закон Ома для участка цепи: I = U / R.'), tr('I = {0} / {1} = {2} А.', fmt(u), r, fmt(i))],
  };
}

function kinetic(): GeneratedTask {
  const m = pick([1, 2, 3, 4, 5, 10]);
  const v = pick([2, 3, 4, 5, 6, 10]);
  const e = (m * v * v) / 2;
  return {
    kind: 'kinetic',
    subject: 'physics',
    topic: 'phys-mechanics',
    question: tr('Тело массой {0} кг движется со скоростью {1} м/с. Найдите его кинетическую энергию (Дж).', m, v),
    answer: e,
    unit: tr('Дж'),
    steps: [tr('Eк = m·v² / 2.'), tr('Eк = {0} · {1}² / 2 = {2} · {3} / 2 = {4} Дж.', m, v, m, v * v, fmt(e))],
  };
}

function motion(): GeneratedTask {
  const a = pick([1, 2, 3, 4]);
  const t = pick([2, 3, 4, 5, 6]);
  const s = (a * t * t) / 2;
  return {
    kind: 'motion',
    subject: 'physics',
    topic: 'phys-kinematics',
    question: tr('Тело начинает двигаться из состояния покоя с ускорением {0} м/с². Какой путь (м) оно пройдёт за {1} с?', a, t),
    answer: s,
    unit: tr('м'),
    steps: [tr('При v₀ = 0 путь равен s = a·t² / 2.'), tr('s = {0} · {1}² / 2 = {2} · {3} / 2 = {4} м.', a, t, a, t * t, fmt(s))],
  };
}

function pythagoras(): GeneratedTask {
  const [a, b, c] = pick([
    [3, 4, 5],
    [6, 8, 10],
    [5, 12, 13],
    [9, 12, 15],
    [8, 15, 17],
  ]);
  return {
    kind: 'pythagoras',
    subject: 'math',
    topic: 'math-geometry',
    question: tr('Катеты прямоугольного треугольника равны {0} и {1}. Найдите гипотенузу.', a, b),
    answer: c,
    steps: [tr('Теорема Пифагора: c² = a² + b².'), `c² = ${a * a} + ${b * b} = ${c * c}.`, `c = √${c * c} = ${c}.`],
  };
}

function toSub(n: number) {
  return String(n)
    .split('')
    .map((d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)])
    .join('');
}

const GENERATORS: Record<string, { label: string; fn: () => GeneratedTask; keywords: string[]; topics: string[] }> = {
  linear: { get label() {
    return tr('Линейное уравнение');
  }, fn: linear, keywords: ['линейн', 'уравнен', 'сызықтық', 'теңдеу'], topics: ['math-equations', 'math-algebra'] },
  quadratic: { get label() {
    return tr('Квадратное уравнение');
  }, fn: quadratic, keywords: ['квадратн', 'дискриминант', 'виет', 'квадрат теңдеу'], topics: ['math-equations'] },
  percent: { get label() {
    return tr('Проценты');
  }, fn: percent, keywords: ['процент', 'скидк', 'пайыз', 'жеңілдік'], topics: ['ml-percent'] },
  progression: { get label() {
    return tr('Прогрессия');
  }, fn: progression, keywords: ['прогресс', 'последовательн', 'тізбек'], topics: ['math-sequences'] },
  pythagoras: { get label() {
    return tr('Теорема Пифагора');
  }, fn: pythagoras, keywords: ['пифагор', 'гипотенуз', 'треугольн', 'геометр', 'үшбұрыш'], topics: ['math-geometry'] },
  ohm: { get label() {
    return tr('Закон Ома');
  }, fn: ohm, keywords: ['ом', 'ток', 'напряжен', 'электрич', 'кернеу'], topics: ['phys-electricity'] },
  kinetic: { get label() {
    return tr('Кинетическая энергия');
  }, fn: kinetic, keywords: ['энерги', 'кинетич', 'кинетика'], topics: ['phys-mechanics'] },
  motion: { get label() {
    return tr('Равноускоренное движение');
  }, fn: motion, keywords: ['ускорен', 'кинемат', 'движен', 'путь', 'үдеу', 'қозғалыс'], topics: ['phys-kinematics', 'phys-dynamics'] },
};

// подпись читается при показе — на текущем языке интерфейса
export const GENERATOR_LIST = Object.entries(GENERATORS).map(([id, g]) => ({
  id,
  get label() {
    return g.label;
  },
}));

export function generateTask(opts: { text?: string; weakTopics?: string[]; kind?: string }): GeneratedTask {
  if (opts.kind && GENERATORS[opts.kind]) return GENERATORS[opts.kind].fn();
  const t = opts.text ?? '';
  // побеждает самое длинное совпадение: «квадратное уравнение» — квадратное, а не линейное
  const hit = (k: string) => (k === 'ом' ? /\bом|закон ома|ом заңы/.test(t) : t.includes(k));
  const score = (g: (typeof GENERATORS)[string]) => Math.max(0, ...g.keywords.filter(hit).map((k) => k.length));
  const byKeyword = Object.values(GENERATORS).reduce<(typeof GENERATORS)[string] | null>((best, g) => (score(g) > (best ? score(best) : 0) ? g : best), null);
  if (byKeyword) return byKeyword.fn();
  const byWeak = Object.values(GENERATORS).find((g) => g.topics.some((tp) => opts.weakTopics?.includes(tp)));
  if (byWeak) return byWeak.fn();
  return pick(Object.values(GENERATORS)).fn();
}
