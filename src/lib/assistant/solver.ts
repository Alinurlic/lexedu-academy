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
  if (a === 0 && b === 0) return { title: `Уравнение ${eq}`, steps: ['После переноса всех членов в одну сторону переменная исчезает.'], answer: c === 0 ? 'x — любое число' : 'Корней нет' };
  if (a === 0) {
    const x = -c / b;
    return {
      title: `Линейное уравнение ${eq}`,
      steps: [
        `Переносим всё в левую часть: ${f(b)}x ${c >= 0 ? '+' : '−'} ${f(Math.abs(c))} = 0.`,
        `Переносим свободный член вправо: ${f(b)}x = ${f(-c)}.`,
        `Делим на ${f(b)}: x = ${f(-c)} / ${f(b)} = ${f(x)}.`,
      ],
      answer: `x = ${f(x)}`,
    };
  }
  const D = b * b - 4 * a * c;
  const steps = [
    `Приводим к виду ax² + bx + c = 0: a = ${f(a)}, b = ${f(b)}, c = ${f(c)}.`,
    `Дискриминант: D = b² − 4ac = ${f(b * b)} − ${f(4 * a * c)} = ${f(D)}.`,
  ];
  if (D < 0) return { title: `Квадратное уравнение ${eq}`, steps: [...steps, 'D < 0, действительных корней нет.'], answer: 'Действительных корней нет' };
  if (D === 0) {
    const x = -b / (2 * a);
    return { title: `Квадратное уравнение ${eq}`, steps: [...steps, `D = 0, один корень: x = −b / 2a = ${f(x)}.`], answer: `x = ${f(x)}` };
  }
  const sq = Math.sqrt(D);
  const x1 = (-b - sq) / (2 * a);
  const x2 = (-b + sq) / (2 * a);
  return {
    title: `Квадратное уравнение ${eq}`,
    steps: [
      ...steps,
      `D > 0, два корня. √D = ${f(sq)}.`,
      `x = (−b ± √D) / 2a = (${f(-b)} ± ${f(sq)}) / ${f(2 * a)}.`,
      `x₁ = ${f(Math.min(x1, x2))}, x₂ = ${f(Math.max(x1, x2))}.`,
      `Проверка по Виета: x₁ + x₂ = ${f(x1 + x2)} = −b/a, x₁·x₂ = ${f(x1 * x2)} = c/a.`,
    ],
    answer: `x₁ = ${f(Math.min(x1, x2))}, x₂ = ${f(Math.max(x1, x2))}`,
  };
}
