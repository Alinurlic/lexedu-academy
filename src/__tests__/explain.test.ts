import { describe, expect, it, vi } from 'vitest';
import { explainKey as clientKey, explainPayload, sha256Hex } from '@/lib/explanations';
import { explainHash, explainPrompt, ExplainBody } from '../../api/_explain';
import { DEMO_QUESTIONS } from '@/data/questions';
import { loadOpenQuestions } from '@/data/questions/open';

describe('подробные разборы: ключ кэша и подсказка для ИИ', async () => {
  const open = await loadOpenQuestions();
  const samples = [
    ...DEMO_QUESTIONS.filter((q) => q.type !== 'essay').slice(0, 40),
    ...open.filter((q) => q.lang === 'kk').slice(0, 20),
    ...open.filter((q) => /[√²∫｛]/.test(q.question)).slice(0, 20),
  ];

  it('хэш содержимого в браузере и на сервере совпадает (рус, каз, формулы, все типы)', async () => {
    for (const q of samples) {
      const p = explainPayload(q)!;
      const body = ExplainBody.parse({ action: 'explain', ...JSON.parse(JSON.stringify(p)) }); // как придёт на сервер
      expect(await sha256Hex(clientKey(p)), q.id).toBe(explainHash(body));
    }
  });

  it('исправили задание — другой хэш (старый разбор не подставится)', async () => {
    const q = DEMO_QUESTIONS.find((x) => x.type === 'single')!;
    const a = explainPayload(q)!;
    const b = explainPayload({ ...q, question: q.question + ' (исправлено)' })!;
    expect(await sha256Hex(clientKey(a))).not.toBe(await sha256Hex(clientKey(b)));
  });

  it('подсказка содержит варианты с буквами и ключ ответа', () => {
    const q = DEMO_QUESTIONS.find((x) => x.type === 'single' && x.type === 'single')!;
    const body = ExplainBody.parse({ action: 'explain', ...JSON.parse(JSON.stringify(explainPayload(q))) });
    const prompt = explainPrompt(body);
    expect(prompt).toContain('A) ');
    expect(prompt).toMatch(/Отмеченный правильный ответ \(ключ\): [A-E] — /);
  });
});

describe('разбор через Gemini (сервер)', async () => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  vi.stubEnv('AI_ALLOW_ANONYMOUS', '1');
  vi.stubEnv('GEMINI_RETRY_MS', '1');
  const mod = await import('../../api/lexi');
  const q = DEMO_QUESTIONS.find((x) => x.type === 'single')!;
  const body = { action: 'explain' as const, ...JSON.parse(JSON.stringify(explainPayload(q))) };
  const reply = (obj: unknown) => vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] })));

  it('возвращает разбор и отметку о сомнении в ключе', async () => {
    const f = reply({ explanation: '**Идея.** ' + 'Решаем по шагам. '.repeat(5), keyLooksWrong: true, comment: 'Верный ответ — B' });
    const r = await (await mod.__test.viaGemini(body, f as unknown as typeof fetch)).json();
    expect(r.explanation).toContain('Идея');
    expect(r.keyLooksWrong).toBe(true);
    expect(r.comment).toBe('Верный ответ — B');
    const sent = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.generationConfig.responseSchema.properties.keyLooksWrong.type).toBe('BOOLEAN');
  });

  it('слишком короткий ответ модели не принимается', async () => {
    const res = await mod.__test.viaGemini(body, reply({ explanation: 'ок', keyLooksWrong: false, comment: '' }) as unknown as typeof fetch);
    expect(res.status).toBe(502);
  });
});
