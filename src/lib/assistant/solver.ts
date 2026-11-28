import { tr } from '@/i18n';
/**
 * Пошаговое решение линейных (ax + b = c) и квадратных (ax² + bx + c = 0) уравнений.
 * Это настоящий вычислитель, а не шаблонный ответ: коэффициенты разбираются из текста пользователя.
 */
export interface Solution {
  title: string;
  steps: string[];
  answer: string;
}

const f = (n: number) => {
  const r = Math.round(n * 10000) / 10000;
  return String(r).replace('.', ',').replace('-', '−');
};

/** Разбирает выражение вида «3x^2 - 5x + 2» в коэффициенты [a, b, c]. */
function parseSide(expr: string): [number, number, number] | null {
  const e = expr.replace(/\s+/g, '').replace(/−|–/g, '-').replace(/х/g, 'x').replace(/²/g, '^2').replace(/,/g, '.').replace(/\*/g, '');
  if (!e) return [0, 0, 0];
  if (!/^[0-9x^.+-]+$/.test(e)) return null;
  const terms = e.replace(/-/g, '+-').split('+').filter(Boolean);
  let a = 0;
  let b = 0;
  let c = 0;
  for (const t of terms) {
    const m2 = t.match(/^(-?\d*\.?\d*)x\^2$/);
    const m1 = t.match(/^(-?\d*\.?\d*)x$/);
    const m0 = t.match(/^-?\d+\.?\d*$/);
    const coef = (s: string) => (s === '' || s === '+' ? 1 : s === '-' ? -1 : Number(s));
    if (m2) a += coef(m2[1]);
    else if (m1) b += coef(m1[1]);
    else if (m0) c += Number(t);
    else return null;
  }
  if ([a, b, c].some((v) => !Number.isFinite(v))) return null;
  return [a, b, c];
}

export function solveEquation(text: string): Solution | null {
  const m = text.replace(/ё/g, 'е').match(/([0-9xх²^.,+\-−–*\s]+)=([0-9xх²^.,+\-−–*\s]+)/i);
  if (!m) return null;
  const hasTerm = (x: string) => /[0-9xх]/i.test(x);
  if (!hasTerm(m[1]) || !hasTerm(m[2]) || !/[xх]/i.test(m[1] + m[2])) return null;
  const L = parseSide(m[1]);
  const R = parseSide(m[2]);
  if (!L || !R) return null;
  const a = L[0] - R[0];
  const b = L[1] - R[1];
  const c = L[2] - R[2];
  const eq = `${m[1].trim()} = ${m[2].trim()}`;
  if (a === 0 && b === 0) return { title: tr('Уравнение {0}', eq), steps: [tr('После переноса всех членов в одну сторону переменная исчезает.')], answer: c === 0 ? tr('x — любое число') : tr('Корней нет') };
  if (a === 0) {
    const x = -c / b;
    return {
      title: tr('Линейное уравнение {0}', eq),
      steps: [
        tr('Переносим всё в левую часть: {0}x {1} {2} = 0.', f(b), c >= 0 ? '+' : '−', f(Math.abs(c))),
        tr('Переносим свободный член вправо: {0}x = {1}.', f(b), f(-c)),
        tr('Делим на {0}: x = {1} / {2} = {3}.', f(b), f(-c), f(b), f(x)),
      ],
      answer: `x = ${f(x)}`,
    };
  }
  const D = b * b - 4 * a * c;
  const steps = [
    tr('Приводим к виду ax² + bx + c = 0: a = {0}, b = {1}, c = {2}.', f(a), f(b), f(c)),
    tr('Дискриминант: D = b² − 4ac = {0} − {1} = {2}.', f(b * b), f(4 * a * c), f(D)),
  ];
  if (D < 0) return { title: tr('Квадратное уравнение {0}', eq), steps: [...steps, tr('D < 0, действительных корней нет.')], answer: tr('Действительных корней нет') };
  if (D === 0) {
    const x = -b / (2 * a);
    return { title: tr('Квадратное уравнение {0}', eq), steps: [...steps, tr('D = 0, один корень: x = −b / 2a = {0}.', f(x))], answer: `x = ${f(x)}` };
  }
  const sq = Math.sqrt(D);
  const x1 = (-b - sq) / (2 * a);
  const x2 = (-b + sq) / (2 * a);
  return {
    title: tr('Квадратное уравнение {0}', eq),
    steps: [
      ...steps,
      tr('D > 0, два корня. √D = {0}.', f(sq)),
      `x = (−b ± √D) / 2a = (${f(-b)} ± ${f(sq)}) / ${f(2 * a)}.`,
      `x₁ = ${f(Math.min(x1, x2))}, x₂ = ${f(Math.max(x1, x2))}.`,
      tr('Проверка по Виета: x₁ + x₂ = {0} = −b/a, x₁·x₂ = {1} = c/a.', f(x1 + x2), f(x1 * x2)),
    ],
    answer: `x₁ = ${f(Math.min(x1, x2))}, x₂ = ${f(Math.max(x1, x2))}`,
  };
}
