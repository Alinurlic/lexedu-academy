import { afterAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { KK } from '@/i18n/kk';
import { loadUiLang, rawProp, tr, uiLang } from '@/i18n';
import { DEFAULT_EXAM_FORMAT, SUBJECTS, SUBJECT_MAP, TOPIC_MAP, TRACKS } from '@/data/subjects';
import { fmtDate, WEEKDAYS_SHORT } from '@/lib/date';
import { plural } from '@/lib/utils';

const SRC = join(__dirname, '..');
const RU = /[А-Яа-яЁё]/;
const KZ = /[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/;

/** Все ключи перевода из исходников: tr('…'), формы для plural, подписи trArray. */
function sourceKeys() {
  const files: string[] = [];
  (function walk(d: string) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) {
        if (!['__tests__', 'i18n'].includes(f)) walk(p);
      } else if (/\.(ts|tsx)$/.test(f)) files.push(p);
    }
  })(SRC);
  const keys = new Map<string, string>();
  const str = (n?: ts.Node) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);
  for (const f of files) {
    const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const name = n.expression.getText(sf);
        const add = (s: string | null) => s && RU.test(s) && keys.set(s, f.slice(SRC.length + 1));
        if (name === 'tr') add(str(n.arguments[0]));
        if (name === 'plural' && n.arguments[1] && ts.isArrayLiteralExpression(n.arguments[1])) add(str(n.arguments[1].elements[0]));
        if (name === 'trArray' && n.arguments[0] && ts.isArrayLiteralExpression(n.arguments[0])) n.arguments[0].elements.forEach((e) => add(str(e)));
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return keys;
}

describe('казахский интерфейс', () => {
  afterAll(() => loadUiLang('ru'));

  it('у каждой строки интерфейса есть перевод', () => {
    const missing = [...sourceKeys()].filter(([k]) => KK[k] === undefined).map(([k, f]) => `${f}: ${k}`);
    expect(missing).toEqual([]);
  });

  it('переведены справочники: предметы, темы, подтемы, советы, треки, формат ЕНТ', () => {
    const raw: string[] = [];
    for (const s of SUBJECTS) {
      raw.push(rawProp(s, 'name'), rawProp(s, 'short'));
      for (const t of s.topics) raw.push(rawProp(t, 'name'), rawProp(t, 'advice'), ...t.subtopics);
    }
    for (const t of TRACKS) raw.push(rawProp(t, 'name'), rawProp(t, 'full'), rawProp(t, 'scale'));
    raw.push(rawProp(DEFAULT_EXAM_FORMAT, 'name'), ...DEFAULT_EXAM_FORMAT.blocks.map((b) => rawProp(b, 'label')));
    const missing = [...new Set(raw)].filter((s) => RU.test(s) && !KZ.test(s) && KK[s] === undefined);
    expect(missing).toEqual([]);
  });

  it('подстановки {0}, {1}… совпадают в ключе и переводе', () => {
    const bad = Object.entries(KK).filter(([k, v]) => (k.match(/\{\d+\}/g) ?? []).sort().join() !== (v.match(/\{\d+\}/g) ?? []).sort().join());
    expect(bad).toEqual([]);
  });

  it('переключение языка: строки, справочники, числа и даты', async () => {
    expect(uiLang()).toBe('ru');
    expect(tr('Начать сессию')).toBe('Начать сессию');
    expect(SUBJECT_MAP.history.name).toBe('История Казахстана');

    await loadUiLang('kk');
    expect(tr('Начать сессию')).toBe('Сессияны бастау');
    expect(tr('Вопрос {0} из {1} · {2}', 3, 10, 'X')).toBe('Сұрақ 3/10 · X');
    expect(SUBJECT_MAP.history.name).toBe('Қазақстан тарихы');
    expect(TOPIC_MAP['math-algebra'].name).toBe('Алгебра');
    expect(TRACKS.find((t) => t.id === 'ent')!.name).toBe('ҰБТ');
    expect(plural(5, ['вопрос', 'вопроса', 'вопросов'])).toBe('сұрақ');
    expect(WEEKDAYS_SHORT[0]).toBe('Дс');
    expect(fmtDate(new Date(2026, 10, 28), { day: 'numeric', month: 'long', year: 'numeric' })).toBe('2026 ж. 28 қараша');
    // нет перевода — показывается русский текст
    expect(tr('Строка без перевода')).toBe('Строка без перевода');

    await loadUiLang('ru');
    expect(SUBJECT_MAP.history.name).toBe('История Казахстана');
    expect(plural(5, ['вопрос', 'вопроса', 'вопросов'])).toBe('вопросов');
  });
});
