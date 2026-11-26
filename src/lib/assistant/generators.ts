import type { SubjectId } from '@/types';

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
    question: `Решите уравнение ${a}x ${signed(b)} = ${c}.`,
    answer: x,
    steps: [`Перенесём ${b} в правую часть: ${a}x = ${c} ${signed(-b)} = ${c - b}.`, `Разделим обе части на ${a}: x = ${c - b} / ${a} = ${x}.`, `Проверка: ${a}·${x} ${signed(b)} = ${c}. Верно.`],
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
  const question = ask === 'larger' ? `Найдите больший корень уравнения ${eq}.` : ask === 'sum' ? `Найдите сумму корней уравнения ${eq}.` : `Найдите произведение корней уравнения ${eq}.`;
  const answer = ask === 'larger' ? x2 : ask === 'sum' ? x1 + x2 : x1 * x2;
  return {
    kind: 'quadratic',
    subject: 'math',
    topic: 'math-equations',
    question,
    answer,
    steps: [
      `Коэффициенты: a = 1, b = ${b}, c = ${c}.`,
      `Дискриминант: D = b² − 4ac = ${b * b} − ${4 * c} = ${D}, √D = ${Math.sqrt(D)}.`,
      `Корни: x = (−b ± √D) / 2 = (${-b} ± ${Math.sqrt(D)}) / 2, то есть x₁ = ${x1}, x₂ = ${x2}.`,
      ask === 'larger' ? `Больший корень: ${x2}.` : ask === 'sum' ? `По теореме Виета сумма корней равна −b = ${x1 + x2}.` : `По теореме Виета произведение корней равно c = ${x1 * x2}.`,
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
    question: `Товар стоит ${price} тенге. Действует скидка ${p}%. Сколько тенге нужно заплатить?`,
    answer: ans,
    unit: 'тг',
    steps: [`${p}% от ${price}: ${price} · ${p} / 100 = ${(price * p) / 100} тг.`, `Цена со скидкой: ${price} − ${(price * p) / 100} = ${ans} тг.`, `Короче: ${price} · ${fmt(1 - p / 100)} = ${ans} тг.`],
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
    question: `Арифметическая прогрессия: a₁ = ${a1}, d = ${d}. Найдите a${toSub(n)}.`,
    answer: an,
    steps: [`Формула n-го члена: aₙ = a₁ + (n − 1)·d.`, `a${toSub(n)} = ${a1} + (${n} − 1)·(${d}) = ${a1} + ${(n - 1) * d} = ${an}.`],
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
    question: `Напряжение на резисторе ${fmt(u)} В, сопротивление ${r} Ом. Найдите силу тока (А).`,
    answer: i,
    unit: 'А',
    steps: [`Закон Ома для участка цепи: I = U / R.`, `I = ${fmt(u)} / ${r} = ${fmt(i)} А.`],
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
    question: `Тело массой ${m} кг движется со скоростью ${v} м/с. Найдите его кинетическую энергию (Дж).`,
    answer: e,
    unit: 'Дж',
    steps: [`Eк = m·v² / 2.`, `Eк = ${m} · ${v}² / 2 = ${m} · ${v * v} / 2 = ${fmt(e)} Дж.`],
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
    question: `Тело начинает двигаться из состояния покоя с ускорением ${a} м/с². Какой путь (м) оно пройдёт за ${t} с?`,
    answer: s,
    unit: 'м',
    steps: [`При v₀ = 0 путь равен s = a·t² / 2.`, `s = ${a} · ${t}² / 2 = ${a} · ${t * t} / 2 = ${fmt(s)} м.`],
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
    question: `Катеты прямоугольного треугольника равны ${a} и ${b}. Найдите гипотенузу.`,
    answer: c,
    steps: [`Теорема Пифагора: c² = a² + b².`, `c² = ${a * a} + ${b * b} = ${c * c}.`, `c = √${c * c} = ${c}.`],
  };
}

function toSub(n: number) {
  return String(n)
    .split('')
    .map((d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)])
    .join('');
}

const GENERATORS: Record<string, { label: string; fn: () => GeneratedTask; keywords: string[]; topics: string[] }> = {
  linear: { label: 'Линейное уравнение', fn: linear, keywords: ['линейн', 'уравнен'], topics: ['math-equations', 'math-algebra'] },
  quadratic: { label: 'Квадратное уравнение', fn: quadratic, keywords: ['квадратн', 'дискриминант', 'виет'], topics: ['math-equations'] },
  percent: { label: 'Проценты', fn: percent, keywords: ['процент', 'скидк'], topics: ['ml-percent'] },
  progression: { label: 'Прогрессия', fn: progression, keywords: ['прогресс', 'последовательн'], topics: ['math-sequences'] },
  pythagoras: { label: 'Теорема Пифагора', fn: pythagoras, keywords: ['пифагор', 'гипотенуз', 'треугольн', 'геометр'], topics: ['math-geometry'] },
  ohm: { label: 'Закон Ома', fn: ohm, keywords: ['ом', 'ток', 'напряжен', 'электрич'], topics: ['phys-electricity'] },
  kinetic: { label: 'Кинетическая энергия', fn: kinetic, keywords: ['энерги', 'кинетич'], topics: ['phys-mechanics'] },
  motion: { label: 'Равноускоренное движение', fn: motion, keywords: ['ускорен', 'кинемат', 'движен', 'путь'], topics: ['phys-kinematics', 'phys-dynamics'] },
};

export const GENERATOR_LIST = Object.entries(GENERATORS).map(([id, g]) => ({ id, label: g.label }));

export function generateTask(opts: { text?: string; weakTopics?: string[]; kind?: string }): GeneratedTask {
  if (opts.kind && GENERATORS[opts.kind]) return GENERATORS[opts.kind].fn();
  const t = opts.text ?? '';
  const byKeyword = Object.values(GENERATORS).find((g) => g.keywords.some((k) => (k === 'ом' ? /\bом|закон ома/.test(t) : t.includes(k))));
  if (byKeyword) return byKeyword.fn();
  const byWeak = Object.values(GENERATORS).find((g) => g.topics.some((tp) => opts.weakTopics?.includes(tp)));
  if (byWeak) return byWeak.fn();
  return pick(Object.values(GENERATORS)).fn();
}
