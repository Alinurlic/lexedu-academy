/**
 * Генерируемые задания LexEdu Academy.
 * Каждый шаблон подбирает числа детерминированным генератором (одинаковые id при каждом запуске),
 * вычисляет правильный ответ и правдоподобные неверные варианты. Это оригинальные учебные задания,
 * а не задания НЦТ / College Board.
 */
import type { Difficulty, MatchingQuestion, MultipleQuestion, NumericQuestion, Question, SingleQuestion, SubjectId } from '@/types';
import { seededRandom } from '@/lib/utils';

const NOTE = 'Сгенерированное учебное задание LexEdu (шаблон с вычисленным ответом). Не является официальным заданием.';
const NOTE_EN = 'Generated LexEdu practice item (computed answer). Not an official College Board question.';

type R = () => number;
const ri = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pick = <T,>(r: R, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
const fmt = (n: number) => {
  const v = Math.round(n * 1000) / 1000;
  return String(v).replace('.', ',').replace('-', '−');
};
const fmtEn = (n: number) => String(Math.round(n * 1000) / 1000);
const signed = (n: number) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);

function shuffleR<T>(r: R, arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 4 различных варианта: правильный + неверные (уникальные), перемешанные. */
function options(r: R, correct: number, wrong: number[], show: (n: number) => string = fmt) {
  const pool: number[] = [];
  for (const w of wrong) if (Number.isFinite(w) && Math.abs(w - correct) > 1e-9 && !pool.some((p) => Math.abs(p - w) < 1e-9)) pool.push(w);
  let k = 1;
  while (pool.length < 3) {
    const cand = correct + k * (k % 2 ? 1 : -1) * Math.max(1, Math.round(Math.abs(correct) * 0.1) || 1);
    if (Math.abs(cand - correct) > 1e-9 && !pool.some((p) => Math.abs(p - cand) < 1e-9)) pool.push(cand);
    k++;
  }
  const all = shuffleR(r, [correct, ...pool.slice(0, 3)]);
  return { options: all.map(show), correctAnswer: all.findIndex((x) => Math.abs(x - correct) < 1e-9) };
}

interface Base {
  subject: SubjectId;
  topic: string;
  difficulty: Difficulty;
  question: string;
  explanation: string;
  passage?: string;
  context?: boolean;
}
const meta = (b: Base, id: string, en = false) => ({ ...b, id, source: 'demo' as const, sourceNote: en ? NOTE_EN : NOTE, verification: 'unverified' as const, tags: ['генератор'] });

type Gen = (r: R) => Omit<SingleQuestion, 'id' | 'source' | 'sourceNote' | 'verification' | 'tags'> | Omit<NumericQuestion, 'id' | 'source' | 'sourceNote' | 'verification' | 'tags'> | Omit<MatchingQuestion, 'id' | 'source' | 'sourceNote' | 'verification' | 'tags'> | Omit<MultipleQuestion, 'id' | 'source' | 'sourceNote' | 'verification' | 'tags'>;

/* ===================== МАТЕМАТИКА (ЕНТ) ===================== */
const MATH: Record<string, Gen> = {
  linear: (r) => {
    const x = ri(r, -9, 12);
    const a = pick(r, [2, 3, 4, 5, 6, 7, 8]);
    const b = ri(r, -20, 20) || 5;
    const c = a * x + b;
    return { subject: 'math', topic: 'math-equations', difficulty: 'easy', type: 'single', question: `Решите уравнение ${a}x ${signed(b)} = ${c}.`, ...options(r, x, [-x, x + 1, (c + b) / a, x - 2]), explanation: `${a}x = ${c} ${signed(-b)} = ${c - b}; x = ${c - b} : ${a} = ${x}.` };
  },
  quadSum: (r) => {
    let x1 = ri(r, -7, 8);
    let x2 = ri(r, -7, 8);
    if (x1 === x2) x2 = x1 + 3;
    const b = -(x1 + x2);
    const c = x1 * x2;
    const ask = pick(r, ['сумму', 'произведение'] as const);
    const ans = ask === 'сумму' ? x1 + x2 : x1 * x2;
    return { subject: 'math', topic: 'math-equations', difficulty: 'medium', type: 'single', question: `Найдите ${ask} корней уравнения x² ${signed(b)}x ${signed(c)} = 0.`, ...options(r, ans, [-ans, b, c, ans + 2]), explanation: `По теореме Виета для x² + px + q = 0: x₁ + x₂ = −p = ${x1 + x2}, x₁·x₂ = q = ${x1 * x2}. Корни: ${x1} и ${x2}.` };
  },
  quadRoot: (r) => {
    let x1 = ri(r, -6, 6);
    let x2 = ri(r, -6, 9);
    if (x1 === x2) x2 = x1 + 4;
    const big = Math.max(x1, x2);
    const b = -(x1 + x2);
    const c = x1 * x2;
    return { subject: 'math', topic: 'math-equations', difficulty: 'medium', type: 'single', question: `Найдите больший корень уравнения x² ${signed(b)}x ${signed(c)} = 0.`, ...options(r, big, [Math.min(x1, x2), -big, big + 1, -Math.min(x1, x2)]), explanation: `D = ${b * b} − ${4 * c} = ${b * b - 4 * c}. Корни ${Math.min(x1, x2)} и ${big}; больший — ${big}.` };
  },
  power: (r) => {
    const a = pick(r, [2, 3, 5]);
    const m = ri(r, 2, 5);
    const n = ri(r, 2, 4);
    const k = ri(r, 1, m + n - 1);
    const e = m + n - k;
    return { subject: 'math', topic: 'math-algebra', difficulty: 'easy', type: 'single', question: `Вычислите ${a}^${m} · ${a}^${n} : ${a}^${k}.`, ...options(r, a ** e, [a ** (m * n - k), a ** (e + 1), a ** (e - 1), e * a]), explanation: `При умножении показатели складываются, при делении вычитаются: ${a}^(${m}+${n}−${k}) = ${a}^${e} = ${a ** e}.` };
  },
  log: (r) => {
    const a = pick(r, [2, 3, 5, 10]);
    const k = ri(r, 2, a === 10 ? 4 : 5);
    const m = ri(r, 1, 3);
    return { subject: 'math', topic: 'math-equations', difficulty: 'medium', type: 'single', question: `Вычислите log${sub(a)}(${a ** k}) + ${m}.`, ...options(r, k + m, [k, a ** k + m, k * m, k + m + 1]), explanation: `log${sub(a)}(${a ** k}) = ${k}, так как ${a}^${k} = ${a ** k}. Итого ${k} + ${m} = ${k + m}.` };
  },
  derivative: (r) => {
    const a = ri(r, 1, 5);
    const b = ri(r, -6, 6);
    const c = ri(r, -5, 9);
    const x0 = ri(r, -3, 4);
    const ans = 2 * a * x0 + b;
    return { subject: 'math', topic: 'math-functions', difficulty: 'medium', type: 'single', question: `Найдите f′(${x0}), если f(x) = ${a}x² ${signed(b)}x ${signed(c)}.`, ...options(r, ans, [a * x0 * x0 + b * x0 + c, a * x0 + b, 2 * a * x0, ans + 2]), explanation: `f′(x) = ${2 * a}x ${signed(b)}. f′(${x0}) = ${2 * a}·${x0} ${signed(b)} = ${ans}.` };
  },
  vertex: (r) => {
    const a = pick(r, [1, 2, -1]);
    const h = ri(r, -4, 5);
    const k = ri(r, -6, 6);
    const b = -2 * a * h;
    const c = a * h * h + k;
    return { subject: 'math', topic: 'math-functions', difficulty: 'hard', type: 'single', question: `Найдите ${a > 0 ? 'наименьшее' : 'наибольшее'} значение функции y = ${a === 1 ? '' : a === -1 ? '−' : a}x² ${signed(b)}x ${signed(c)}.`, ...options(r, k, [h, c, -k, k + a]), explanation: `Вершина параболы: x₀ = −b/(2a) = ${h}. y(${h}) = ${k}. Ветви направлены ${a > 0 ? 'вверх — это минимум' : 'вниз — это максимум'}.` };
  },
  ap: (r) => {
    const a1 = ri(r, -6, 10);
    const d = pick(r, [2, 3, 4, 5, -2, -3]);
    const n = ri(r, 8, 20);
    const an = a1 + (n - 1) * d;
    return { subject: 'math', topic: 'math-sequences', difficulty: 'easy', type: 'single', question: `В арифметической прогрессии a₁ = ${a1}, d = ${d}. Найдите a${sub(n)}.`, ...options(r, an, [a1 + n * d, a1 * n * d, an + d, a1 + (n - 2) * d]), explanation: `aₙ = a₁ + (n − 1)d = ${a1} + ${n - 1}·(${d}) = ${an}.` };
  },
  apSum: (r) => {
    const a1 = ri(r, 1, 9);
    const d = ri(r, 1, 5);
    const n = ri(r, 5, 12);
    const an = a1 + (n - 1) * d;
    const S = ((a1 + an) * n) / 2;
    return { subject: 'math', topic: 'math-sequences', difficulty: 'medium', type: 'single', question: `Найдите сумму первых ${n} членов арифметической прогрессии: a₁ = ${a1}, d = ${d}.`, ...options(r, S, [an * n, (a1 + an) * n, S + an, S - d]), explanation: `a${sub(n)} = ${an}; Sₙ = (a₁ + aₙ)·n/2 = (${a1} + ${an})·${n}/2 = ${S}.` };
  },
  gp: (r) => {
    const b1 = pick(r, [1, 2, 3, 5]);
    const q = pick(r, [2, 3, -2]);
    const n = ri(r, 4, 6);
    const bn = b1 * q ** (n - 1);
    return { subject: 'math', topic: 'math-sequences', difficulty: 'medium', type: 'single', question: `Геометрическая прогрессия: b₁ = ${b1}, q = ${q}. Найдите b${sub(n)}.`, ...options(r, bn, [b1 * q ** n, b1 * q * (n - 1), -bn, bn / q]), explanation: `bₙ = b₁·qⁿ⁻¹ = ${b1}·(${q})^${n - 1} = ${bn}.` };
  },
  pythagoras: (r) => {
    const [a, b, c] = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 40, 41]] as const);
    const k = ri(r, 1, 3);
    return { subject: 'math', topic: 'math-geometry', difficulty: 'easy', type: 'single', question: `Катеты прямоугольного треугольника равны ${a * k} и ${b * k}. Найдите гипотенузу.`, ...options(r, c * k, [(a + b) * k, (c + 1) * k, b * k + 1, c * k + 2]), explanation: `c = √(${a * k}² + ${b * k}²) = √${(c * k) ** 2} = ${c * k}.` };
  },
  trapezoid: (r) => {
    const a = ri(r, 4, 14);
    const b = a + ri(r, 2, 10);
    const h = ri(r, 3, 12);
    const S = ((a + b) * h) / 2;
    return { subject: 'math', topic: 'math-geometry', difficulty: 'medium', type: 'single', question: `Основания трапеции ${a} и ${b}, высота ${h}. Найдите площадь трапеции.`, ...options(r, S, [(a + b) * h, a * b, S + h, ((b - a) * h) / 2]), explanation: `S = (a + b)/2 · h = (${a} + ${b})/2 · ${h} = ${fmt(S)}.` };
  },
  combos: (r) => {
    const n = ri(r, 5, 10);
    const k = pick(r, [2, 3]);
    const C = comb(n, k);
    return { subject: 'math', topic: 'math-combinatorics', difficulty: 'medium', type: 'single', question: `Сколькими способами можно выбрать ${k} ученика из ${n} для участия в олимпиаде?`, ...options(r, C, [perm(n, k), n * k, C + n, fact(k)]), explanation: `Порядок не важен — сочетания: C(${n},${k}) = ${n}!/(${k}!·${n - k}!) = ${C}.` };
  },
  prob: (r) => {
    const red = ri(r, 2, 8);
    const blue = ri(r, 2, 8);
    const total = red + blue;
    return { subject: 'math', topic: 'math-probability', difficulty: 'easy', type: 'single', question: `В коробке ${red} красных и ${blue} синих шаров. Какова вероятность вынуть наугад красный шар?`, ...options(r, red / total, [blue / total, red / blue, 1 / total, red / (total + 1)], (n) => fracStr(n, total)), explanation: `P = ${red}/${total} (благоприятных исходов ${red} из ${total}).` };
  },
  system: (r) => {
    const x = ri(r, -5, 8);
    const y = ri(r, -5, 8);
    return { subject: 'math', topic: 'math-equations', difficulty: 'medium', type: 'single', question: `Решите систему: x + y = ${x + y}, x − y = ${x - y}. Найдите x·y.`, ...options(r, x * y, [x + y, x - y, -x * y, x * y + 1]), explanation: `Сложим уравнения: 2x = ${2 * x}, x = ${x}; тогда y = ${y}. x·y = ${x * y}.` };
  },
  ineq: (r) => {
    const a = pick(r, [2, 3, 4, 5]);
    const b = ri(r, -10, 10);
    const c = ri(r, -10, 20);
    // ax + b > c  =>  x > (c-b)/a ; наименьшее целое
    const bound = (c - b) / a;
    const ans = Math.floor(bound) + 1;
    return { subject: 'math', topic: 'math-inequalities', difficulty: 'medium', type: 'single', question: `Найдите наименьшее целое решение неравенства ${a}x ${signed(b)} > ${c}.`, ...options(r, ans, [ans - 1, ans + 1, Math.ceil(bound) === bound ? bound : Math.round(bound), -ans]), explanation: `${a}x > ${c - b}; x > ${fmt(bound)}. Наименьшее целое, большее ${fmt(bound)}: ${ans}.` };
  },
};

const MATH_CONTEXT: Record<string, Gen> = {
  room: (r) => {
    const w = ri(r, 3, 6);
    const l = ri(r, 4, 8);
    const pack = pick(r, [2, 2.5, 3]);
    const area = w * l;
    const packs = Math.ceil(area / pack);
    return { subject: 'math', topic: 'math-geometry', difficulty: 'medium', type: 'single', context: true, passage: `Семья делает ремонт. Комната имеет форму прямоугольника размером ${w} м × ${l} м. Ламинат продаётся упаковками по ${fmt(pack)} м², упаковки нельзя делить.`, question: 'Какое наименьшее число упаковок ламината нужно купить, чтобы покрыть весь пол?', ...options(r, packs, [packs - 1, area, packs + 2, Math.floor(area / pack)]), explanation: `Площадь пола ${w}·${l} = ${area} м². ${area} : ${fmt(pack)} = ${fmt(area / pack)} → нужно ${packs} упаковок (округляем вверх).` };
  },
  trip: (r) => {
    const v = pick(r, [60, 70, 80, 90]);
    const t1 = ri(r, 2, 4);
    const fuel = pick(r, [6, 7, 8]);
    const dist = v * t1;
    const liters = (dist * fuel) / 100;
    return { subject: 'math', topic: 'math-algebra', difficulty: 'medium', type: 'single', context: true, passage: `Автомобиль едет ${t1} ч со средней скоростью ${v} км/ч. Расход топлива — ${fuel} л на 100 км.`, question: 'Сколько литров топлива израсходует автомобиль за поездку?', ...options(r, liters, [dist / fuel, liters * 2, dist / 100, liters + fuel]), explanation: `Путь: ${v}·${t1} = ${dist} км. Топливо: ${dist}·${fuel}/100 = ${fmt(liters)} л.` };
  },
  deposit: (r) => {
    const sum = pick(r, [100000, 200000, 500000]);
    const p = pick(r, [10, 12, 15]);
    const res = Math.round(sum * (1 + p / 100) ** 2);
    return { subject: 'math', topic: 'math-algebra', difficulty: 'hard', type: 'single', context: true, passage: `Ученик положил ${sum.toLocaleString('ru-RU')} тенге на вклад под ${p}% годовых. Проценты начисляются раз в год и прибавляются к вкладу (капитализация).`, question: 'Какая сумма будет на вкладе через 2 года?', ...options(r, res, [sum + (2 * sum * p) / 100, Math.round(sum * (1 + p / 100)), res + sum / 100, Math.round(sum * (1 + (2 * p) / 100) ** 2)], (n) => n.toLocaleString('ru-RU') + ' тг'), explanation: `${sum.toLocaleString('ru-RU')}·${fmt(1 + p / 100)}² = ${res.toLocaleString('ru-RU')} тг.` };
  },
  tank: (r) => {
    const a = ri(r, 2, 5);
    const b = ri(r, 2, 4);
    const h = ri(r, 1, 3);
    const flow = pick(r, [2, 4, 5, 8]);
    const V = a * b * h * 1000;
    const minutes = V / flow;
    return { subject: 'math', topic: 'math-geometry', difficulty: 'hard', type: 'single', context: true, passage: `Бассейн имеет форму прямоугольного параллелепипеда: длина ${a} м, ширина ${b} м, глубина ${h} м. Насос подаёт ${flow} литров воды в секунду (1 м³ = 1000 л).`, question: 'За сколько минут насос полностью наполнит пустой бассейн?', ...options(r, minutes / 60, [minutes, V / 60, (a * b * h) / flow, minutes / 30], (n) => fmt(n) + ' мин'), explanation: `V = ${a}·${b}·${h} = ${a * b * h} м³ = ${V} л. Время: ${V}/${flow} = ${minutes} с = ${fmt(minutes / 60)} мин.` };
  },
  sale: (r) => {
    const price = pick(r, [12000, 18000, 25000, 40000]);
    const p1 = pick(r, [10, 20, 25]);
    const p2 = pick(r, [10, 15, 20]);
    const fin = price * (1 - p1 / 100) * (1 - p2 / 100);
    return { subject: 'math', topic: 'math-algebra', difficulty: 'medium', type: 'single', context: true, passage: `Цена куртки ${price.toLocaleString('ru-RU')} тг. В пятницу на неё сделали скидку ${p1}%, а в субботу — ещё ${p2}% от новой цены.`, question: 'Сколько стоит куртка в субботу?', ...options(r, fin, [price * (1 - (p1 + p2) / 100), price * (1 - p1 / 100), fin + 1000, price - fin], (n) => Math.round(n).toLocaleString('ru-RU') + ' тг'), explanation: `${price}·${fmt(1 - p1 / 100)}·${fmt(1 - p2 / 100)} = ${Math.round(fin)} тг. Скидки не складываются: это ${fmt(100 - (fin / price) * 100)}%, а не ${p1 + p2}%.` };
  },
};

const MATH_MATCHING: Record<string, Gen> = {
  equations: (r) => {
    const roots = shuffleR(r, [1, 2, 3, 4, 5, 6, -2, -3, 7, 8]).slice(0, 3);
    const eqs = roots.map((x) => {
      const a = pick(r, [2, 3, 4, 5]);
      const b = ri(r, -9, 9) || 3;
      return `${a}x ${signed(b)} = ${a * x + b}`;
    });
    const extra = shuffleR(r, [0, 9, -1, 10, -5].filter((v) => !roots.includes(v))).slice(0, 2);
    const opts = shuffleR(r, [...roots, ...extra]);
    return { subject: 'math', topic: 'math-equations', difficulty: 'medium', type: 'matching', question: 'Установите соответствие между уравнением и его корнем.', prompts: eqs, options: opts.map((v) => `x = ${fmt(v)}`), correctAnswer: roots.map((x) => opts.indexOf(x)), explanation: eqs.map((e, i) => `${e} ⇒ x = ${roots[i]}`).join('; ') + '.' };
  },
  derivatives: (r) => {
    const pool: [string, string][] = [
      ['x³', '3x²'],
      ['sin x', 'cos x'],
      ['cos x', '−sin x'],
      ['eˣ', 'eˣ'],
      ['ln x', '1/x'],
      ['√x', '1/(2√x)'],
      ['5x²', '10x'],
      ['1/x', '−1/x²'],
    ];
    const chosen = shuffleR(r, pool).slice(0, 3);
    const distract = shuffleR(r, ['3x', 'x²/2', '−cos x', 'x⁴/4'].filter((d) => !chosen.some((c) => c[1] === d))).slice(0, 2);
    const opts = shuffleR(r, [...chosen.map((c) => c[1]), ...distract]);
    return { subject: 'math', topic: 'math-functions', difficulty: 'medium', type: 'matching', question: 'Установите соответствие между функцией и её производной.', prompts: chosen.map((c) => `f(x) = ${c[0]}`), options: opts.map((o) => `f′(x) = ${o}`), correctAnswer: chosen.map((c) => opts.indexOf(c[1])), explanation: chosen.map((c) => `(${c[0]})′ = ${c[1]}`).join('; ') + '.' };
  },
  areas: (r) => {
    const a = ri(r, 3, 9);
    const b = ri(r, 3, 9) + (a === 6 ? 1 : 0);
    const h = ri(r, 2, 8);
    const items: [string, number][] = [
      [`Прямоугольник ${a}×${b}`, a * b],
      [`Треугольник: основание ${a * 2}, высота ${h}`, a * h],
      [`Квадрат со стороной ${b + 1}`, (b + 1) ** 2],
    ];
    const vals = items.map((i) => i[1]);
    const uniq = new Set(vals).size === 3;
    if (!uniq) items[2] = [`Квадрат со стороной ${b + 3}`, (b + 3) ** 2];
    const extras = [items[0][1] + 2, items[1][1] * 2].filter((v) => !items.some((i) => i[1] === v));
    const opts = shuffleR(r, [...items.map((i) => i[1]), ...extras]);
    return { subject: 'math', topic: 'math-geometry', difficulty: 'easy', type: 'matching', question: 'Установите соответствие между фигурой и её площадью.', prompts: items.map((i) => i[0]), options: opts.map((v) => String(v)), correctAnswer: items.map((i) => opts.indexOf(i[1])), explanation: items.map((i) => `${i[0]}: S = ${i[1]}`).join('; ') + '.' };
  },
};

const MATH_MULTIPLE: Record<string, Gen> = {
  divisors: (r) => {
    const n = pick(r, [12, 18, 20, 24, 28, 30, 36, 42, 45]);
    const cands = shuffleR(r, [2, 3, 4, 5, 6, 7, 8, 9, 10, 12].filter((d) => d < n)).slice(0, 5);
    if (!cands.some((d) => n % d === 0)) cands[0] = n % 2 === 0 ? 2 : 3;
    const fixed = cands.map((d, i) => (n % d === 0 ? i : -1)).filter((i) => i >= 0);
    return { subject: 'math', topic: 'math-algebra', difficulty: 'easy', type: 'multiple', question: `Выберите все делители числа ${n}.`, options: cands.map(String), correctAnswer: fixed, explanation: `${n} делится нацело на ${cands.filter((d) => n % d === 0).join(', ')}; не делится на ${cands.filter((d) => n % d !== 0).join(', ') || '—'}.` };
  },
  primes: (r) => {
    const cands = shuffleR(r, [2, 9, 11, 15, 17, 21, 23, 27, 29, 33, 37, 39, 41, 51, 53, 57]).slice(0, 5);
    const isP = (n: number) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) - 1)].every((_, i) => n % (i + 2) !== 0);
    if (!cands.some(isP)) cands[0] = 13;
    return { subject: 'math', topic: 'math-algebra', difficulty: 'medium', type: 'multiple', question: 'Выберите все простые числа.', options: cands.map(String), correctAnswer: cands.map((n, i) => (isP(n) ? i : -1)).filter((i) => i >= 0), explanation: `Простые: ${cands.filter(isP).join(', ')}. Составные: ${cands.filter((n) => !isP(n)).map((n) => `${n} = ${factor(n)}`).join(', ') || '—'}.` };
  },
  roots: (r) => {
    let x1 = ri(r, -5, 6);
    let x2 = ri(r, -5, 7);
    if (x1 === x2) x2 = x1 + 2;
    const b = -(x1 + x2);
    const c = x1 * x2;
    const distract = shuffleR(r, [-x1, -x2, x1 + 1, x2 + 2, 0, x1 + x2].filter((v, i, arr) => v !== x1 && v !== x2 && arr.indexOf(v) === i)).slice(0, 3);
    const cands = shuffleR(r, [x1, x2, ...distract]);
    return { subject: 'math', topic: 'math-equations', difficulty: 'medium', type: 'multiple', question: `Выберите все корни уравнения x² ${signed(b)}x ${signed(c)} = 0.`, options: cands.map((v) => fmt(v)), correctAnswer: cands.map((v, i) => (v === x1 || v === x2 ? i : -1)).filter((i) => i >= 0), explanation: `По теореме Виета x₁ + x₂ = ${x1 + x2}, x₁·x₂ = ${c}: корни ${x1} и ${x2}.` };
  },
};

/* ===================== ФИЗИКА ===================== */
const PHYS: Record<string, Gen> = {
  ohm: (r) => {
    const R = pick(r, [2, 4, 5, 6, 8, 10, 12, 20]);
    const I = pick(r, [0.5, 1.5, 2, 3, 4]);
    const U = R * I;
    return { subject: 'physics', topic: 'phys-electricity', difficulty: 'easy', type: 'single', question: `Напряжение на резисторе ${fmt(U)} В, сопротивление ${R} Ом. Найдите силу тока.`, ...options(r, I, [U * R, R / U, I * 2, U - R], (n) => fmt(n) + ' А'), explanation: `I = U/R = ${fmt(U)}/${R} = ${fmt(I)} А.` };
  },
  series: (r) => {
    const r1 = ri(r, 2, 10);
    const r2 = ri(r, 2, 10);
    const r3 = ri(r, 1, 6);
    return { subject: 'physics', topic: 'phys-electricity', difficulty: 'easy', type: 'single', question: `Резисторы ${r1} Ом, ${r2} Ом и ${r3} Ом соединены последовательно. Найдите общее сопротивление.`, ...options(r, r1 + r2 + r3, [(r1 * r2) / (r1 + r2) + r3, r1 * r2 * r3, r1 + r2, r1 + r2 + r3 + 1], (n) => fmt(n) + ' Ом'), explanation: `При последовательном соединении R = R₁ + R₂ + R₃ = ${r1 + r2 + r3} Ом.` };
  },
  power: (r) => {
    const U = pick(r, [12, 24, 110, 220]);
    const I = pick(r, [0.5, 1, 2, 5]);
    return { subject: 'physics', topic: 'phys-electricity', difficulty: 'easy', type: 'single', question: `Прибор работает при напряжении ${U} В и силе тока ${fmt(I)} А. Найдите его мощность.`, ...options(r, U * I, [U / I, U + I, U * I * 2, (U * I) / 2], (n) => fmt(n) + ' Вт'), explanation: `P = U·I = ${U}·${fmt(I)} = ${fmt(U * I)} Вт.` };
  },
  accel: (r) => {
    const a = pick(r, [1, 2, 3, 4, 5]);
    const t = ri(r, 2, 8);
    const s = (a * t * t) / 2;
    return { subject: 'physics', topic: 'phys-kinematics', difficulty: 'medium', type: 'single', question: `Тело начинает движение из состояния покоя с ускорением ${a} м/с². Какой путь оно пройдёт за ${t} с?`, ...options(r, s, [a * t, a * t * t, s + a, (a * t) / 2], (n) => fmt(n) + ' м'), explanation: `s = at²/2 = ${a}·${t * t}/2 = ${fmt(s)} м.` };
  },
  speed: (r) => {
    const v0 = ri(r, 0, 10);
    const a = pick(r, [1, 2, 3, -2]);
    const t = ri(r, 2, 6);
    const v = v0 + a * t;
    return { subject: 'physics', topic: 'phys-kinematics', difficulty: 'easy', type: 'single', question: `Начальная скорость тела ${v0} м/с, ускорение ${a} м/с². Найдите скорость через ${t} с.`, ...options(r, v, [v0 * a * t, a * t, v0 - a * t, v + 1], (n) => fmt(n) + ' м/с'), explanation: `v = v₀ + at = ${v0} ${signed(a * t)} = ${v} м/с.` };
  },
  newton: (r) => {
    const m = pick(r, [0.5, 1, 2, 4, 5, 10]);
    const a = pick(r, [2, 3, 4, 5]);
    return { subject: 'physics', topic: 'phys-dynamics', difficulty: 'easy', type: 'single', question: `Какая равнодействующая сила сообщает телу массой ${fmt(m)} кг ускорение ${a} м/с²?`, ...options(r, m * a, [m / a, a / m, m + a, m * a * 10], (n) => fmt(n) + ' Н'), explanation: `F = ma = ${fmt(m)}·${a} = ${fmt(m * a)} Н.` };
  },
  friction: (r) => {
    const m = ri(r, 2, 20);
    const mu = pick(r, [0.1, 0.2, 0.3, 0.4, 0.5]);
    const F = mu * m * 10;
    return { subject: 'physics', topic: 'phys-dynamics', difficulty: 'medium', type: 'single', question: `Брусок массой ${m} кг скользит по горизонтальной поверхности, коэффициент трения ${fmt(mu)}. Найдите силу трения (g = 10 м/с²).`, ...options(r, F, [mu * m, m * 10, F * 2, F + mu], (n) => fmt(n) + ' Н'), explanation: `F = μmg = ${fmt(mu)}·${m}·10 = ${fmt(F)} Н.` };
  },
  kinetic: (r) => {
    const m = pick(r, [1, 2, 4, 5, 10]);
    const v = pick(r, [2, 3, 4, 6, 10]);
    const E = (m * v * v) / 2;
    return { subject: 'physics', topic: 'phys-mechanics', difficulty: 'easy', type: 'single', question: `Найдите кинетическую энергию тела массой ${m} кг, движущегося со скоростью ${v} м/с.`, ...options(r, E, [m * v, m * v * v, E / 2, (m * v) / 2], (n) => fmt(n) + ' Дж'), explanation: `Eк = mv²/2 = ${m}·${v * v}/2 = ${fmt(E)} Дж.` };
  },
  potential: (r) => {
    const m = pick(r, [0.5, 1, 2, 3, 5]);
    const h = ri(r, 2, 20);
    const E = m * 10 * h;
    return { subject: 'physics', topic: 'phys-mechanics', difficulty: 'easy', type: 'single', question: `Груз массой ${fmt(m)} кг подняли на высоту ${h} м. Найдите его потенциальную энергию (g = 10 м/с²).`, ...options(r, E, [m * h, E / 2, E + 10, m * 10 + h], (n) => fmt(n) + ' Дж'), explanation: `Eп = mgh = ${fmt(m)}·10·${h} = ${fmt(E)} Дж.` };
  },
  pressure: (r) => {
    const F = pick(r, [100, 200, 500, 600, 1000]);
    const S = pick(r, [0.1, 0.2, 0.5, 2, 4]);
    return { subject: 'physics', topic: 'phys-mechanics', difficulty: 'easy', type: 'single', question: `Сила ${F} Н действует перпендикулярно на площадь ${fmt(S)} м². Найдите давление.`, ...options(r, F / S, [F * S, S / F, F / S / 10, F + S], (n) => fmt(n) + ' Па'), explanation: `p = F/S = ${F}/${fmt(S)} = ${fmt(F / S)} Па.` };
  },
  heat: (r) => {
    const m = pick(r, [0.5, 1, 2, 3]);
    const dt = pick(r, [10, 20, 30, 50]);
    const c = 4200;
    const Q = c * m * dt;
    return { subject: 'physics', topic: 'phys-thermo', difficulty: 'medium', type: 'single', question: `Сколько теплоты нужно, чтобы нагреть ${fmt(m)} кг воды на ${dt} °C? (c = 4200 Дж/(кг·°C))`, ...options(r, Q / 1000, [(c * m) / 1000, (c * dt) / 1000, Q / 100, (Q * 2) / 1000], (n) => fmt(n) + ' кДж'), explanation: `Q = cmΔt = 4200·${fmt(m)}·${dt} = ${Q} Дж = ${fmt(Q / 1000)} кДж.` };
  },
  efficiency: (r) => {
    const Q1 = pick(r, [500, 800, 1000, 2000]);
    const p = pick(r, [20, 25, 30, 40, 60]);
    const Q2 = Q1 * (1 - p / 100);
    return { subject: 'physics', topic: 'phys-thermo', difficulty: 'medium', type: 'single', question: `Тепловая машина получает от нагревателя ${Q1} Дж и отдаёт холодильнику ${Q2} Дж. Найдите КПД.`, ...options(r, p, [100 - p, (Q2 / Q1) * 100 + 5, p / 2, p + 10], (n) => fmt(n) + '%'), explanation: `η = (Q₁ − Q₂)/Q₁ = ${Q1 - Q2}/${Q1} = ${p}%.` };
  },
  wave: (r) => {
    const v = pick(r, [300, 340, 1500, 6]);
    const f = pick(r, [2, 5, 10, 20, 100]);
    return { subject: 'physics', topic: 'phys-oscillations', difficulty: 'easy', type: 'single', question: `Волна распространяется со скоростью ${v} м/с при частоте ${f} Гц. Найдите длину волны.`, ...options(r, v / f, [v * f, f / v, v / f / 2, v - f], (n) => fmt(n) + ' м'), explanation: `λ = v/ν = ${v}/${f} = ${fmt(v / f)} м.` };
  },
  lens: (r) => {
    const F = pick(r, [0.1, 0.2, 0.25, 0.5, 2]);
    return { subject: 'physics', topic: 'phys-optics', difficulty: 'easy', type: 'single', question: `Фокусное расстояние собирающей линзы ${fmt(F)} м. Найдите её оптическую силу.`, ...options(r, 1 / F, [F, 2 / F, 1 / F + 1, F * 10], (n) => fmt(n) + ' дптр'), explanation: `D = 1/F = 1/${fmt(F)} = ${fmt(1 / F)} дптр.` };
  },
  momentum: (r) => {
    const m = pick(r, [0.2, 0.5, 2, 4, 1000]);
    const v = pick(r, [3, 4, 5, 10, 20]);
    return { subject: 'physics', topic: 'phys-mechanics', difficulty: 'easy', type: 'single', question: `Найдите импульс тела массой ${fmt(m)} кг, движущегося со скоростью ${v} м/с.`, ...options(r, m * v, [(m * v * v) / 2, m / v, m + v, m * v * 2], (n) => fmt(n) + ' кг·м/с'), explanation: `p = mv = ${fmt(m)}·${v} = ${fmt(m * v)} кг·м/с.` };
  },
};

const PHYS_CONTEXT: Record<string, Gen> = {
  kettle: (r) => {
    const P = pick(r, [1500, 2000, 2200]);
    const t = pick(r, [3, 4, 5]);
    const price = pick(r, [20, 25, 30]);
    const kwh = (P / 1000) * (t / 60);
    const cost = kwh * price * 30;
    return { subject: 'physics', topic: 'phys-electricity', difficulty: 'medium', type: 'single', context: true, passage: `Электрочайник мощностью ${P} Вт кипятит воду ${t} минут. Семья включает его один раз в день. Тариф на электроэнергию — ${price} тг за 1 кВт·ч.`, question: 'Сколько тенге стоит работа чайника за 30 дней?', ...options(r, cost, [kwh * price, P * t * price, cost * 2, cost / 2], (n) => fmt(Math.round(n * 10) / 10) + ' тг'), explanation: `Энергия за день: ${P / 1000} кВт·${t}/60 ч = ${fmt(kwh)} кВт·ч. За 30 дней: ${fmt(kwh * 30)} кВт·ч · ${price} тг = ${fmt(cost)} тг.` };
  },
  car: (r) => {
    const v = pick(r, [54, 72, 90, 108]);
    const t = pick(r, [4, 5, 6]);
    const ms = v / 3.6;
    const a = ms / t;
    return { subject: 'physics', topic: 'phys-kinematics', difficulty: 'medium', type: 'single', context: true, passage: `При испытании автомобиль разгоняется с места до ${v} км/ч за ${t} с. Движение считается равноускоренным.`, question: 'Найдите ускорение автомобиля.', ...options(r, a, [v / t, ms * t, a * 2, ms], (n) => fmt(n) + ' м/с²'), explanation: `${v} км/ч = ${fmt(ms)} м/с. a = v/t = ${fmt(ms)}/${t} = ${fmt(a)} м/с².` };
  },
  lift: (r) => {
    const m = pick(r, [50, 60, 80]);
    const h = pick(r, [3, 6, 9, 12]);
    const t = pick(r, [10, 15, 20, 30]);
    const P = (m * 10 * h) / t;
    return { subject: 'physics', topic: 'phys-mechanics', difficulty: 'medium', type: 'single', context: true, passage: `Ученик массой ${m} кг поднимается по лестнице на высоту ${h} м за ${t} с (g = 10 м/с²).`, question: 'Какую среднюю мощность он развивает?', ...options(r, P, [m * 10 * h, (m * h) / t, P * 2, P / 10], (n) => fmt(n) + ' Вт'), explanation: `A = mgh = ${m * 10 * h} Дж; P = A/t = ${fmt(P)} Вт.` };
  },
  bulbs: (r) => {
    const n = pick(r, [2, 3, 4]);
    const R = pick(r, [6, 12, 24]);
    const U = pick(r, [12, 24]);
    const Rt = R / n;
    return { subject: 'physics', topic: 'phys-electricity', difficulty: 'hard', type: 'single', context: true, passage: `В гирлянде ${n} одинаковые лампы сопротивлением ${R} Ом каждая соединены параллельно и подключены к источнику ${U} В.`, question: 'Какова сила тока в общей цепи?', ...options(r, U / Rt, [U / R, U / (R * n), (U / Rt) * 2, U * n], (n2) => fmt(n2) + ' А'), explanation: `Параллельно: R = ${R}/${n} = ${fmt(Rt)} Ом. I = U/R = ${U}/${fmt(Rt)} = ${fmt(U / Rt)} А.` };
  },
  ice: (r) => {
    const m = pick(r, [0.2, 0.5, 1]);
    const lambda = 330000;
    const Q = lambda * m;
    return { subject: 'physics', topic: 'phys-thermo', difficulty: 'medium', type: 'single', context: true, passage: `Для приготовления лимонада в стакан положили ${fmt(m)} кг льда при температуре 0 °C. Удельная теплота плавления льда 330 кДж/кг.`, question: 'Какое количество теплоты необходимо, чтобы весь лёд растаял?', ...options(r, Q / 1000, [330, Q / 100, (Q / 1000) * 2, 330 / m], (n) => fmt(n) + ' кДж'), explanation: `Q = λm = 330·${fmt(m)} = ${fmt(Q / 1000)} кДж.` };
  },
};

const PHYS_MATCHING: Record<string, Gen> = {
  units: (r) => {
    const pool: [string, string][] = [
      ['Сила', 'Ньютон'],
      ['Работа', 'Джоуль'],
      ['Мощность', 'Ватт'],
      ['Давление', 'Паскаль'],
      ['Сопротивление', 'Ом'],
      ['Частота', 'Герц'],
      ['Заряд', 'Кулон'],
      ['Индуктивность', 'Генри'],
    ];
    const ch = shuffleR(r, pool).slice(0, 3);
    const rest = shuffleR(r, pool.filter((p) => !ch.includes(p))).slice(0, 2);
    const opts = shuffleR(r, [...ch, ...rest].map((p) => p[1]));
    return { subject: 'physics', topic: 'phys-mechanics', difficulty: 'easy', type: 'matching', question: 'Установите соответствие между физической величиной и её единицей в СИ.', prompts: ch.map((c) => c[0]), options: opts, correctAnswer: ch.map((c) => opts.indexOf(c[1])), explanation: ch.map((c) => `${c[0]} — ${c[1]}`).join('; ') + '.' };
  },
  formulas: (r) => {
    const pool: [string, string][] = [
      ['Второй закон Ньютона', 'F = ma'],
      ['Закон Ома', 'I = U/R'],
      ['Кинетическая энергия', 'E = mv²/2'],
      ['Импульс', 'p = mv'],
      ['Давление', 'p = F/S'],
      ['Плотность', 'ρ = m/V'],
      ['Мощность', 'N = A/t'],
    ];
    const ch = shuffleR(r, pool).slice(0, 3);
    const rest = shuffleR(r, pool.filter((p) => !ch.includes(p))).slice(0, 2);
    const opts = shuffleR(r, [...ch, ...rest].map((p) => p[1]));
    return { subject: 'physics', topic: 'phys-dynamics', difficulty: 'easy', type: 'matching', question: 'Установите соответствие между законом (величиной) и формулой.', prompts: ch.map((c) => c[0]), options: opts, correctAnswer: ch.map((c) => opts.indexOf(c[1])), explanation: ch.map((c) => `${c[0]}: ${c[1]}`).join('; ') + '.' };
  },
  scientists: (r) => {
    const pool: [string, string][] = [
      ['Закон всемирного тяготения', 'И. Ньютон'],
      ['Закон электромагнитной индукции', 'М. Фарадей'],
      ['Закон, связывающий ток и напряжение', 'Г. Ом'],
      ['Планетарная модель атома', 'Э. Резерфорд'],
      ['Теория относительности', 'А. Эйнштейн'],
      ['Закон плавания тел (выталкивающая сила)', 'Архимед'],
    ];
    const ch = shuffleR(r, pool).slice(0, 3);
    const rest = shuffleR(r, pool.filter((p) => !ch.includes(p))).slice(0, 2);
    const opts = shuffleR(r, [...ch, ...rest].map((p) => p[1]));
    return { subject: 'physics', topic: 'phys-modern', difficulty: 'easy', type: 'matching', question: 'Установите соответствие между открытием и учёным.', prompts: ch.map((c) => c[0]), options: opts, correctAnswer: ch.map((c) => opts.indexOf(c[1])), explanation: ch.map((c) => `${c[0]} — ${c[1]}`).join('; ') + '.' };
  },
};

const PHYS_MULTIPLE: Record<string, Gen> = {
  vectors: (r) => {
    const vec = ['Скорость', 'Сила', 'Ускорение', 'Импульс', 'Перемещение'];
    const sc = ['Масса', 'Время', 'Работа', 'Температура', 'Путь', 'Энергия'];
    const opts = shuffleR(r, [...shuffleR(r, vec).slice(0, 2 + Math.floor(r() * 2)), ...shuffleR(r, sc).slice(0, 2)]).slice(0, 5);
    return { subject: 'physics', topic: 'phys-mechanics', difficulty: 'easy', type: 'multiple', question: 'Выберите все векторные физические величины.', options: opts, correctAnswer: opts.map((o, i) => (vec.includes(o) ? i : -1)).filter((i) => i >= 0), explanation: `Векторные величины имеют направление: ${opts.filter((o) => vec.includes(o)).join(', ')}. Скалярные: ${opts.filter((o) => !vec.includes(o)).join(', ')}.` };
  },
  conductors: (r) => {
    const cond = ['Медь', 'Алюминий', 'Графит', 'Раствор соли', 'Железо'];
    const ins = ['Стекло', 'Резина', 'Сухое дерево', 'Фарфор', 'Пластмасса'];
    const opts = shuffleR(r, [...shuffleR(r, cond).slice(0, 2 + Math.floor(r() * 2)), ...shuffleR(r, ins).slice(0, 2)]).slice(0, 5);
    return { subject: 'physics', topic: 'phys-electricity', difficulty: 'easy', type: 'multiple', question: 'Выберите все проводники электрического тока.', options: opts, correctAnswer: opts.map((o, i) => (cond.includes(o) ? i : -1)).filter((i) => i >= 0), explanation: `Проводники: ${opts.filter((o) => cond.includes(o)).join(', ')}. Диэлектрики: ${opts.filter((o) => !cond.includes(o)).join(', ')}.` };
  },
  em: (r) => {
    const yes = ['Радиоволны', 'Видимый свет', 'Рентгеновское излучение', 'Ультрафиолет', 'Гамма-излучение', 'Инфракрасное излучение'];
    const no = ['Звук', 'Ультразвук', 'Волны на поверхности воды', 'Инфразвук'];
    const opts = shuffleR(r, [...shuffleR(r, yes).slice(0, 3), ...shuffleR(r, no).slice(0, 2)]);
    return { subject: 'physics', topic: 'phys-oscillations', difficulty: 'medium', type: 'multiple', question: 'Выберите все электромагнитные волны.', options: opts, correctAnswer: opts.map((o, i) => (yes.includes(o) ? i : -1)).filter((i) => i >= 0), explanation: `Электромагнитные: ${opts.filter((o) => yes.includes(o)).join(', ')}. Механические волны: ${opts.filter((o) => no.includes(o)).join(', ')}.` };
  },
};

/* ===================== ХИМИЯ ===================== */
const COMPOUNDS: [string, number, string][] = [
  ['H₂O', 18, 'оксид'],
  ['CO₂', 44, 'оксид'],
  ['NaCl', 58.5, 'соль'],
  ['HCl', 36.5, 'кислота'],
  ['H₂SO₄', 98, 'кислота'],
  ['NaOH', 40, 'основание'],
  ['CaCO₃', 100, 'соль'],
  ['HNO₃', 63, 'кислота'],
  ['KOH', 56, 'основание'],
  ['CaO', 56, 'оксид'],
  ['Ca(OH)₂', 74, 'основание'],
  ['CuSO₄', 160, 'соль'],
  ['Al₂O₃', 102, 'оксид'],
  ['KNO₃', 101, 'соль'],
];
const CHEM: Record<string, Gen> = {
  molar: (r) => {
    const [f, M] = pick(r, COMPOUNDS);
    return { subject: 'chemistry', topic: 'chem-calc', difficulty: 'easy', type: 'single', question: `Найдите молярную массу ${f}.`, ...options(r, M, [M + 16, M - 1, M * 2, M + 2], (n) => fmt(n) + ' г/моль'), explanation: `Молярная масса равна сумме атомных масс элементов: M(${f}) = ${fmt(M)} г/моль.` };
  },
  moles: (r) => {
    const [f, M] = pick(r, COMPOUNDS.filter((c) => Number.isInteger(c[1])));
    const n = pick(r, [0.5, 1, 2, 3, 0.25]);
    return { subject: 'chemistry', topic: 'chem-calc', difficulty: 'medium', type: 'single', question: `Какое количество вещества содержится в ${fmt(M * n)} г ${f}?`, ...options(r, n, [n * 2, M / n / 10, n + 1, 1 / n], (v) => fmt(v) + ' моль'), explanation: `n = m/M = ${fmt(M * n)}/${M} = ${fmt(n)} моль.` };
  },
  fraction: (r) => {
    const solute = pick(r, [5, 10, 15, 20, 25, 40]);
    const water = pick(r, [45, 90, 135, 160, 180, 200]);
    const w = (solute / (solute + water)) * 100;
    return { subject: 'chemistry', topic: 'chem-calc', difficulty: 'medium', type: 'single', question: `В ${water} г воды растворили ${solute} г соли. Найдите массовую долю соли в растворе.`, ...options(r, w, [(solute / water) * 100, w * 2, 100 - w, w + 5], (n) => fmt(Math.round(n * 10) / 10) + '%'), explanation: `ω = m(в-ва)/m(р-ра) = ${solute}/(${solute} + ${water}) = ${fmt(Math.round(w * 10) / 10)}%.` };
  },
  gas: (r) => {
    const n = pick(r, [0.5, 1, 1.5, 2, 3, 0.25]);
    return { subject: 'chemistry', topic: 'chem-calc', difficulty: 'easy', type: 'single', question: `Какой объём (н. у.) занимают ${fmt(n)} моль газа?`, ...options(r, 22.4 * n, [22.4 / n, 22.4, 11.2 * n, 22.4 * n + 1], (v) => fmt(v) + ' л'), explanation: `V = n·Vm = ${fmt(n)}·22,4 = ${fmt(22.4 * n)} л.` };
  },
  protons: (r) => {
    const els: [string, number, number][] = [
      ['C', 6, 12],
      ['N', 7, 14],
      ['O', 8, 16],
      ['Na', 11, 23],
      ['Mg', 12, 24],
      ['Al', 13, 27],
      ['S', 16, 32],
      ['Cl', 17, 35],
      ['K', 19, 39],
      ['Ca', 20, 40],
    ];
    const [e, z, a] = pick(r, els);
    return { subject: 'chemistry', topic: 'chem-general', difficulty: 'easy', type: 'single', question: `Сколько нейтронов в ядре атома ${e}-${a}?`, ...options(r, a - z, [z, a, a + z, a - z + 1]), explanation: `Порядковый номер ${e} — ${z} (протоны). Нейтроны: ${a} − ${z} = ${a - z}.` };
  },
};
const CHEM_MATCHING: Record<string, Gen> = {
  classes: (r) => {
    const byClass = ['оксид', 'кислота', 'основание', 'соль'];
    const ch = shuffleR(r, byClass).slice(0, 3).map((cl) => pick(r, COMPOUNDS.filter((c) => c[2] === cl)));
    const opts = shuffleR(r, ['Оксид', 'Кислота', 'Основание', 'Соль', 'Простое вещество']);
    const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
    return { subject: 'chemistry', topic: 'chem-inorganic', difficulty: 'easy', type: 'matching', question: 'Установите соответствие между формулой вещества и классом неорганических соединений.', prompts: ch.map((c) => c[0]), options: opts, correctAnswer: ch.map((c) => opts.indexOf(cap(c[2]))), explanation: ch.map((c) => `${c[0]} — ${c[2]}`).join('; ') + '.' };
  },
};
const CHEM_MULTIPLE: Record<string, Gen> = {
  acids: (r) => {
    const target = pick(r, ['кислота', 'основание', 'соль'] as const);
    const yes = shuffleR(r, COMPOUNDS.filter((c) => c[2] === target)).slice(0, 2 + Math.floor(r() * 2));
    const no = shuffleR(r, COMPOUNDS.filter((c) => c[2] !== target)).slice(0, 5 - yes.length);
    const opts = shuffleR(r, [...yes, ...no]);
    const word = { кислота: 'кислоты', основание: 'основания', соль: 'соли' }[target];
    return { subject: 'chemistry', topic: 'chem-inorganic', difficulty: 'medium', type: 'multiple', question: `Выберите все ${word}.`, options: opts.map((o) => o[0]), correctAnswer: opts.map((o, i) => (o[2] === target ? i : -1)).filter((i) => i >= 0), explanation: opts.map((o) => `${o[0]} — ${o[2]}`).join('; ') + '.' };
  },
};

/* ===================== МАТЕМАТИЧЕСКАЯ ГРАМОТНОСТЬ ===================== */
const MATHLIT: Record<string, Gen> = {
  discount: (r) => {
    const p = pick(r, [8000, 12000, 15000, 24000, 30000]);
    const d = pick(r, [10, 15, 20, 25, 30]);
    return { subject: 'mathlit', topic: 'ml-percent', difficulty: 'easy', type: 'single', question: `Товар стоит ${p.toLocaleString('ru-RU')} тг. Скидка ${d}%. Сколько нужно заплатить?`, ...options(r, p * (1 - d / 100), [(p * d) / 100, p - d, p * (1 + d / 100), p * (1 - d / 200)], (n) => Math.round(n).toLocaleString('ru-RU') + ' тг'), explanation: `${p}·(1 − ${d}/100) = ${Math.round(p * (1 - d / 100))} тг.` };
  },
  change: (r) => {
    const a = pick(r, [200, 400, 500, 800, 1000]);
    const p = pick(r, [10, 20, 25, 50]);
    const b = a * (1 + p / 100);
    return { subject: 'mathlit', topic: 'ml-percent', difficulty: 'medium', type: 'single', question: `Цена выросла с ${a} до ${b} тенге. На сколько процентов выросла цена?`, ...options(r, p, [b - a, ((b - a) / b) * 100, p * 2, p / 2], (n) => fmt(Math.round(n * 10) / 10) + '%'), explanation: `(${b} − ${a})/${a}·100% = ${p}%.` };
  },
  mean: (r) => {
    const nums = Array.from({ length: 5 }, () => ri(r, 2, 20));
    const s = nums.reduce((x, y) => x + y, 0);
    return { subject: 'mathlit', topic: 'ml-data', difficulty: 'easy', type: 'single', question: `Оценки за неделю: ${nums.join(', ')}. Найдите среднее арифметическое.`, ...options(r, s / 5, [s, median(nums), s / 4, Math.max(...nums)]), explanation: `(${nums.join(' + ')})/5 = ${s}/5 = ${fmt(s / 5)}.` };
  },
  median: (r) => {
    const nums = Array.from({ length: 7 }, () => ri(r, 1, 40));
    const m = median(nums);
    const sorted = [...nums].sort((a, b) => a - b);
    return { subject: 'mathlit', topic: 'ml-data', difficulty: 'medium', type: 'single', question: `Найдите медиану ряда: ${nums.join(', ')}.`, ...options(r, m, [nums[3], nums.reduce((a, b) => a + b, 0) / 7, sorted[2], sorted[4]]), explanation: `Упорядочим: ${sorted.join(', ')}. Медиана — 4-й элемент: ${m}.` };
  },
  unitPrice: (r) => {
    const a = pick(r, [0.5, 1, 1.5]);
    const pa = pick(r, [300, 400, 450, 500]);
    const b = pick(r, [2, 3]);
    const pb = Math.round((pa / a) * b * pick(r, [0.8, 0.9, 1.1]));
    const ua = pa / a;
    const ub = pb / b;
    const ans = Math.round(Math.abs(ua - ub) * 10) / 10;
    return { subject: 'mathlit', topic: 'ml-logic', difficulty: 'medium', type: 'single', question: `Сок: ${fmt(a)} л за ${pa} тг или ${b} л за ${pb} тг. На сколько тенге дешевле 1 литр в более выгодной упаковке?`, ...options(r, ans, [Math.abs(pa - pb), ans * 2, Math.round(ua), Math.round(ub)], (n) => fmt(n) + ' тг'), explanation: `1 л: ${fmt(ua)} тг и ${fmt(ub)} тг. Разница ${fmt(ans)} тг.` };
  },
  time: (r) => {
    const h = ri(r, 6, 22);
    const m = pick(r, [5, 15, 20, 35, 40, 50]);
    const dh = ri(r, 1, 6);
    const dm = pick(r, [10, 25, 30, 45, 55]);
    const total = h * 60 + m + dh * 60 + dm;
    const ah = Math.floor(total / 60) % 24;
    const am = total % 60;
    const t = (hh: number, mm: number) => `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const ans = ah * 60 + am;
    const wrongs = [ans + 60, ans - 10, ans + 30].map((v) => ((v % 1440) + 1440) % 1440);
    return { subject: 'mathlit', topic: 'ml-logic', difficulty: 'easy', type: 'single', question: `Автобус отправился в ${t(h, m)} и был в пути ${dh} ч ${dm} мин. Во сколько он прибыл?`, ...options(r, ans, wrongs, (v) => t(Math.floor(v / 60), v % 60)), explanation: `${t(h, m)} + ${dh} ч ${dm} мин = ${t(ah, am)}.` };
  },
};
const MATHLIT_CONTEXT: Record<string, Gen> = {
  tariff: (r) => {
    const fixed = pick(r, [1500, 2000, 2500]);
    const per = pick(r, [20, 25, 50]);
    const flat = fixed + per * pick(r, [20, 30, 40]);
    const x = (flat - fixed) / per;
    return { subject: 'mathlit', topic: 'ml-logic', difficulty: 'medium', type: 'single', context: true, passage: `Оператор связи предлагает два тарифа. «Базовый»: ${fixed} тг в месяц + ${per} тг за каждую минуту звонков. «Безлимит»: ${flat} тг в месяц без доплат.`, question: 'При каком количестве минут в месяц стоимость тарифов одинакова?', ...options(r, x, [x + 10, flat / per, fixed / per, x - 5], (n) => fmt(n) + ' мин'), explanation: `${fixed} + ${per}x = ${flat} ⇒ x = ${x}.` };
  },
  marathon: (r) => {
    const km = pick(r, [5, 10, 21]);
    const pace = pick(r, [5, 6, 7]);
    const total = km * pace;
    return { subject: 'mathlit', topic: 'ml-logic', difficulty: 'easy', type: 'single', context: true, passage: `Школьная команда готовится к забегу на ${km} км. Темп бегуна — ${pace} минут на километр.`, question: 'За сколько минут бегун пробежит всю дистанцию?', ...options(r, total, [km + pace, total + pace, km * 60 / pace, total - 5], (n) => fmt(n) + ' мин'), explanation: `${km}·${pace} = ${total} мин.` };
  },
  survey: (r) => {
    const n = pick(r, [200, 300, 400, 500]);
    const p = pick(r, [15, 20, 35, 45]);
    return { subject: 'mathlit', topic: 'ml-data', difficulty: 'easy', type: 'single', context: true, passage: `В опросе участвовали ${n} учеников. ${p}% из них ответили, что готовятся к ЕНТ больше 2 часов в день.`, question: 'Сколько учеников готовятся больше 2 часов в день?', ...options(r, (n * p) / 100, [p, n - (n * p) / 100, (n * p) / 10, n / p]), explanation: `${n}·${p}/100 = ${(n * p) / 100}.` };
  },
  recipe: (r) => {
    const base = pick(r, [4, 6]);
    const flour = pick(r, [300, 360, 480]);
    const guests = pick(r, [8, 10, 12]);
    const need = (flour / base) * guests;
    return { subject: 'mathlit', topic: 'ml-percent', difficulty: 'easy', type: 'single', context: true, passage: `Рецепт пирога рассчитан на ${base} человек и требует ${flour} г муки. На праздник придут ${guests} гостей.`, question: 'Сколько граммов муки понадобится?', ...options(r, need, [flour * guests, flour + guests, need / 2, need + flour], (n) => fmt(n) + ' г'), explanation: `${flour}/${base}·${guests} = ${fmt(need)} г.` };
  },
  map: (r) => {
    const scale = pick(r, [100000, 200000, 500000]);
    const cm = pick(r, [3, 4, 6, 7.5]);
    const km = (cm * scale) / 100000;
    return { subject: 'mathlit', topic: 'ml-logic', difficulty: 'medium', type: 'single', context: true, passage: `Туристы планируют поход по карте масштаба 1 : ${scale.toLocaleString('ru-RU')}. Расстояние от лагеря до озера на карте ${fmt(cm)} см.`, question: 'Каково расстояние на местности?', ...options(r, km, [km * 10, km / 10, cm * scale, km + 1], (n) => fmt(n) + ' км'), explanation: `1 см = ${scale / 100000} км. ${fmt(cm)}·${scale / 100000} = ${fmt(km)} км.` };
  },
};

/* ===================== ИНФОРМАТИКА ===================== */
const INF: Record<string, Gen> = {
  bin2dec: (r) => {
    const n = ri(r, 9, 120);
    return { subject: 'informatics', topic: 'inf-numbers', difficulty: 'easy', type: 'single', question: `Переведите число ${n.toString(2)}₂ в десятичную систему.`, ...options(r, n, [n + 1, n - 2, n * 2, Math.floor(n / 2)]), explanation: `${n.toString(2)}₂ = ${n.toString(2).split('').map((d, i, a) => `${d}·2^${a.length - 1 - i}`).join(' + ')} = ${n}.` };
  },
  dec2bin: (r) => {
    const n = ri(r, 10, 100);
    const wrong = [n + 1, n - 1, n + 4].map((v) => v);
    return { subject: 'informatics', topic: 'inf-numbers', difficulty: 'easy', type: 'single', question: `Какая запись числа ${n} в двоичной системе верна?`, ...options(r, n, wrong, (v) => v.toString(2)), explanation: `${n} = ${n.toString(2)}₂ (делим на 2 и записываем остатки снизу вверх).` };
  },
  hex: (r) => {
    const n = ri(r, 30, 255);
    return { subject: 'informatics', topic: 'inf-numbers', difficulty: 'medium', type: 'single', question: `Переведите число ${n.toString(16).toUpperCase()}₁₆ в десятичную систему.`, ...options(r, n, [n + 16, n - 1, parseInt(n.toString(16), 10) || n + 7, n + 10]), explanation: `${n.toString(16).toUpperCase()}₁₆ = ${Math.floor(n / 16)}·16 + ${n % 16} = ${n}.` };
  },
  bits: (r) => {
    const k = ri(r, 3, 10);
    return { subject: 'informatics', topic: 'inf-logic', difficulty: 'easy', type: 'single', question: `Сколько различных сигналов можно закодировать с помощью ${k} бит?`, ...options(r, 2 ** k, [k * 2, k ** 2, 2 ** (k - 1), 2 ** k - 1]), explanation: `N = 2^${k} = ${2 ** k}.` };
  },
  bytes: (r) => {
    const kb = pick(r, [2, 4, 8, 16, 64]);
    return { subject: 'informatics', topic: 'inf-logic', difficulty: 'easy', type: 'single', question: `Сколько бит в ${kb} Кбайт?`, ...options(r, kb * 1024 * 8, [kb * 1024, kb * 1000 * 8, kb * 8, kb * 1024 * 8 * 2]), explanation: `1 Кбайт = 1024 байта = 8192 бит; ${kb}·8192 = ${kb * 8192} бит.` };
  },
  loop: (r) => {
    const a = ri(r, 1, 4);
    const b = a + ri(r, 3, 7);
    const step = pick(r, [1, 2]);
    let s = 0;
    for (let i = a; i <= b; i += step) s += i;
    return { subject: 'informatics', topic: 'inf-algorithms', difficulty: 'medium', type: 'single', question: `Чему будет равно s после выполнения: s = 0; для i от ${a} до ${b} с шагом ${step}: s = s + i?`, ...options(r, s, [s + b, s - a, ((a + b) * (b - a + 1)) / 2 + (step === 1 ? 1 : 0), b]), explanation: `Складываем ${Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step).join(' + ')} = ${s}.` };
  },
};
const INF_MATCHING: Record<string, Gen> = {
  systems: (r) => {
    const nums = shuffleR(r, [5, 9, 12, 17, 21, 26, 31, 40]).slice(0, 3);
    const extra = nums.map((n) => n + 2).filter((v) => !nums.includes(v)).slice(0, 2);
    const opts = shuffleR(r, [...nums, ...extra]);
    return { subject: 'informatics', topic: 'inf-numbers', difficulty: 'medium', type: 'matching', question: 'Установите соответствие между двоичной записью и десятичным числом.', prompts: nums.map((n) => `${n.toString(2)}₂`), options: opts.map(String), correctAnswer: nums.map((n) => opts.indexOf(n)), explanation: nums.map((n) => `${n.toString(2)}₂ = ${n}`).join('; ') + '.' };
  },
};
const INF_MULTIPLE: Record<string, Gen> = {
  even: (r) => {
    const nums = shuffleR(r, [6, 7, 10, 13, 14, 19, 22, 25, 28]).slice(0, 5);
    if (!nums.some((n) => n % 2 === 0)) nums[0] = 12;
    return { subject: 'informatics', topic: 'inf-numbers', difficulty: 'easy', type: 'multiple', question: 'Выберите все двоичные записи чётных чисел.', options: nums.map((n) => `${n.toString(2)}₂`), correctAnswer: nums.map((n, i) => (n % 2 === 0 ? i : -1)).filter((i) => i >= 0), explanation: 'Двоичная запись чётного числа оканчивается на 0. ' + nums.map((n) => `${n.toString(2)}₂ = ${n}`).join(', ') + '.' };
  },
};

/* ===================== SAT MATH ===================== */
const SATM: Record<string, Gen> = {
  linear: (r) => {
    const x = ri(r, -6, 12);
    const a = pick(r, [2, 3, 4, 5, 7]);
    const b = ri(r, -15, 15) || 4;
    return { subject: 'sat-math', topic: 'sat-algebra', difficulty: 'easy', type: 'single', question: `If ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${a * x + b}, what is the value of x?`, ...options(r, x, [-x, x + 2, (a * x + 2 * b) / a, x - 1], fmtEn), explanation: `${a}x = ${a * x}, so x = ${x}.` };
  },
  slope: (r) => {
    const x1 = ri(r, -5, 3);
    const y1 = ri(r, -5, 5);
    const m = pick(r, [-3, -2, 2, 3, 4, 0.5]);
    const dx = pick(r, [2, 4]);
    const x2 = x1 + dx;
    const y2 = y1 + m * dx;
    return { subject: 'sat-math', topic: 'sat-algebra', difficulty: 'easy', type: 'single', question: `A line passes through the points (${x1}, ${y1}) and (${x2}, ${fmtEn(y2)}). What is the slope of the line?`, ...options(r, m, [-m, 1 / m, dx / (y2 - y1 || 1) + 1, m + 1], fmtEn), explanation: `Slope = (y₂ − y₁)/(x₂ − x₁) = ${fmtEn(y2 - y1)}/${dx} = ${fmtEn(m)}.` };
  },
  system: (r) => {
    const x = ri(r, -4, 8);
    const y = ri(r, -4, 8);
    const a = pick(r, [2, 3]);
    return { subject: 'sat-math', topic: 'sat-algebra', difficulty: 'medium', type: 'single', question: `If x + y = ${x + y} and ${a}x − y = ${a * x - y}, what is the value of y?`, ...options(r, y, [x, -y, x + y, y + 2], fmtEn), explanation: `Adding the equations: ${a + 1}x = ${(a + 1) * x}, so x = ${x} and y = ${x + y} − ${x} = ${y}.` };
  },
  percent: (r) => {
    const p0 = pick(r, [40, 50, 80, 120, 200]);
    const pct = pick(r, [10, 15, 20, 25, 30]);
    const p1 = p0 * (1 + pct / 100);
    return { subject: 'sat-math', topic: 'sat-data', difficulty: 'easy', type: 'single', question: `The price of a book increased from $${p0} to $${fmtEn(p1)}. By what percent did the price increase?`, ...options(r, pct, [p1 - p0, ((p1 - p0) / p1) * 100, pct * 2, 100 - pct], (n) => fmtEn(Math.round(n * 10) / 10) + '%'), explanation: `(${fmtEn(p1)} − ${p0}) / ${p0} = ${pct / 100} = ${pct}%.` };
  },
  ratio: (r) => {
    const a = ri(r, 2, 5);
    const b = ri(r, 3, 7);
    const k = ri(r, 3, 9);
    return { subject: 'sat-math', topic: 'sat-data', difficulty: 'easy', type: 'single', question: `The ratio of boys to girls in a club is ${a} to ${b}. If there are ${b * k} girls, how many boys are in the club?`, ...options(r, a * k, [b * k - a, a * b, (a + b) * k, a * k + b], fmtEn), explanation: `Each part = ${b * k}/${b} = ${k}; boys = ${a}·${k} = ${a * k}.` };
  },
  vertex: (r) => {
    const h = ri(r, -5, 6);
    const k = ri(r, -9, 9);
    const b = -2 * h;
    const c = h * h + k;
    return { subject: 'sat-math', topic: 'sat-advanced', difficulty: 'medium', type: 'single', question: `The function f is defined by f(x) = x² ${b < 0 ? '−' : '+'} ${Math.abs(b)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)}. What is the minimum value of f(x)?`, ...options(r, k, [h, c, -k, k - 1], fmtEn), explanation: `The vertex is at x = −b/2 = ${h}. f(${h}) = ${k}.` };
  },
  growth: (r) => {
    const p0 = pick(r, [100, 200, 500, 1000]);
    const f = pick(r, [2, 3]);
    const t = ri(r, 2, 4);
    return { subject: 'sat-math', topic: 'sat-advanced', difficulty: 'medium', type: 'single', question: `A population of bacteria starts at ${p0} and multiplies by ${f} every hour. What is the population after ${t} hours?`, ...options(r, p0 * f ** t, [p0 * f * t, p0 + f * t, p0 * f ** (t - 1), p0 * (f + 1) ** t], fmtEn), explanation: `P = ${p0}·${f}^${t} = ${p0 * f ** t}.` };
  },
  evaluate: (r) => {
    const a = ri(r, 2, 6);
    const b = ri(r, -8, 8);
    const x = ri(r, -4, 5);
    const g = ri(r, 1, 4);
    const inner = g * x + 1;
    const ans = a * inner + b;
    return { subject: 'sat-math', topic: 'sat-advanced', difficulty: 'hard', type: 'single', question: `If f(x) = ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} and g(x) = ${g}x + 1, what is f(g(${x}))?`, ...options(r, ans, [g * (a * x + b) + 1, a * x + b, ans + a, inner], fmtEn), explanation: `g(${x}) = ${inner}; f(${inner}) = ${a}·${inner} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${ans}.` };
  },
  meanMissing: (r) => {
    const nums = Array.from({ length: 4 }, () => ri(r, 60, 95));
    const target = ri(r, 75, 88);
    const missing = target * 5 - nums.reduce((a, b) => a + b, 0);
    return { subject: 'sat-math', topic: 'sat-data', difficulty: 'medium', type: 'numeric', question: `A student's first four test scores are ${nums.join(', ')}. What score is needed on the fifth test for the mean of all five scores to be exactly ${target}?`, correctAnswer: missing, tolerance: 1e-6, explanation: `Total needed = ${target}·5 = ${target * 5}. Current total = ${nums.reduce((a, b) => a + b, 0)}. Needed: ${missing}.` };
  },
  rect: (r) => {
    const w = ri(r, 3, 12);
    const l = w + ri(r, 2, 8);
    return { subject: 'sat-math', topic: 'sat-geometry', difficulty: 'easy', type: 'numeric', question: `A rectangle has a length that is ${l - w} more than its width. If the width is ${w}, what is the perimeter of the rectangle?`, correctAnswer: 2 * (w + l), tolerance: 1e-6, explanation: `Length = ${l}; perimeter = 2(${w} + ${l}) = ${2 * (w + l)}.` };
  },
  triangle: (r) => {
    const [a, b, c] = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10]] as const);
    return { subject: 'sat-math', topic: 'sat-geometry', difficulty: 'medium', type: 'single', question: `In right triangle ABC, the legs have lengths ${a} and ${b}. What is sin of the angle opposite the side of length ${a}?`, ...options(r, a / c, [b / c, a / b, c / a, b / a], (n) => fracEn(n, c, a, b)), explanation: `Hypotenuse = ${c}; sin = opposite/hypotenuse = ${a}/${c}.` };
  },
  circle: (r) => {
    const h = ri(r, -5, 5);
    const k = ri(r, -5, 5);
    const rad = ri(r, 2, 9);
    return { subject: 'sat-math', topic: 'sat-geometry', difficulty: 'hard', type: 'single', question: `The equation of a circle in the xy-plane is (x ${h < 0 ? '+' : '−'} ${Math.abs(h)})² + (y ${k < 0 ? '+' : '−'} ${Math.abs(k)})² = ${rad * rad}. What is the radius of the circle?`, ...options(r, rad, [rad * rad, rad * 2, Math.abs(h) + Math.abs(k) || rad + 1, rad + 1], fmtEn), explanation: `(x − h)² + (y − k)² = r², so r = √${rad * rad} = ${rad}.` };
  },
  rate: (r) => {
    const pages = pick(r, [12, 15, 18, 20]);
    const minutes = pick(r, [30, 40, 45]);
    const total = pick(r, [180, 240, 300]);
    const t = (total / pages) * minutes;
    return { subject: 'sat-math', topic: 'sat-data', difficulty: 'medium', type: 'numeric', question: `A printer prints ${pages} pages every ${minutes} minutes. At this rate, how many minutes will it take to print ${total} pages?`, correctAnswer: t, tolerance: 1e-6, explanation: `${total}/${pages} = ${fmtEn(total / pages)} batches × ${minutes} min = ${fmtEn(t)} minutes.` };
  },
  inequality: (r) => {
    const cost = pick(r, [4, 5, 6, 8]);
    const fixed = pick(r, [10, 15, 20]);
    const budget = pick(r, [60, 75, 90, 100]);
    const n = Math.floor((budget - fixed) / cost);
    return { subject: 'sat-math', topic: 'sat-algebra', difficulty: 'medium', type: 'single', question: `A gym charges a $${fixed} sign-up fee plus $${cost} per class. With a budget of $${budget}, what is the maximum number of classes a person can take?`, ...options(r, n, [n + 1, Math.floor(budget / cost), n - 1, Math.ceil((budget - fixed) / cost) + 1], fmtEn), explanation: `${fixed} + ${cost}n ≤ ${budget} ⇒ n ≤ ${fmtEn((budget - fixed) / cost)}, so n = ${n}.` };
  },
};

/* ===================== СБОРКА ===================== */
function sub(n: number) {
  return String(n)
    .split('')
    .map((d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)])
    .join('');
}
function fact(n: number): number {
  return n <= 1 ? 1 : n * fact(n - 1);
}
function comb(n: number, k: number) {
  return fact(n) / (fact(k) * fact(n - k));
}
function perm(n: number, k: number) {
  return fact(n) / fact(n - k);
}
function median(nums: number[]) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function factor(n: number) {
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return `${i}·${n / i}`;
  return String(n);
}
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}
function fracStr(v: number, den: number) {
  const num = Math.round(v * den);
  if (Math.abs(num / den - v) > 1e-9) return fmt(v);
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}
function fracEn(v: number, c: number, a: number, b: number) {
  const cands: [number, number][] = [
    [a, c],
    [b, c],
    [a, b],
    [c, a],
    [b, a],
  ];
  const hit = cands.find(([x, y]) => Math.abs(x / y - v) < 1e-9);
  return hit ? `${hit[0]}/${hit[1]}` : fmtEn(v);
}

function build(prefix: string, gens: Record<string, Gen>, count: number, seed: number, en = false): Question[] {
  const out: Question[] = [];
  const keys = Object.keys(gens);
  keys.forEach((key, ki) => {
    const r = seededRandom(seed + ki * 7919);
    const seen = new Set<string>();
    let guard = 0;
    for (let i = 0; out.filter((q) => q.id.startsWith(`${prefix}-${key}-`)).length < count && guard < count * 8; i++, guard++) {
      const q = gens[key](r);
      const sig = JSON.stringify([q.question, q.passage, 'prompts' in q ? q.prompts : null, 'options' in q ? q.options : null]);
      if (seen.has(sig)) continue;
      seen.add(sig);
      const n = String(seen.size).padStart(2, '0');
      out.push({ ...meta(q as Base, `${prefix}-${key}-${n}`, en), ...q } as Question);
    }
  });
  return out;
}

export const GENERATED_QUESTIONS: Question[] = [
  ...build('g-math', MATH, 8, 101),
  ...build('g-mathctx', MATH_CONTEXT, 6, 202),
  ...build('g-mathmatch', MATH_MATCHING, 6, 303),
  ...build('g-mathmulti', MATH_MULTIPLE, 6, 404),
  ...build('g-phys', PHYS, 6, 505),
  ...build('g-physctx', PHYS_CONTEXT, 5, 606),
  ...build('g-physmatch', PHYS_MATCHING, 6, 707),
  ...build('g-physmulti', PHYS_MULTIPLE, 6, 808),
  ...build('g-chem', CHEM, 8, 909),
  ...build('g-chemmatch', CHEM_MATCHING, 10, 1010),
  ...build('g-chemmulti', CHEM_MULTIPLE, 10, 1111),
  ...build('g-ml', MATHLIT, 8, 1212),
  ...build('g-mlctx', MATHLIT_CONTEXT, 6, 1313),
  ...build('g-inf', INF, 6, 1414),
  ...build('g-infmatch', INF_MATCHING, 8, 1515),
  ...build('g-infmulti', INF_MULTIPLE, 8, 1616),
  ...build('g-satm', SATM, 8, 1717, true),
];
