import { describe, expect, it, vi } from 'vitest';

describe('Gemini', async () => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  vi.stubEnv('AI_ALLOW_ANONYMOUS', '1');
  vi.stubEnv('GEMINI_RETRY_MS', '1');
  const mod = await import('../../api/lexi');
  const reply = (obj: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(obj), { status }));
  const ok = (text: string) => reply({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'thinking…', thought: true }, { text }] } }] });

  it('GET сообщает провайдера', async () => {
    const r = await (await mod.GET()).json();
    expect(r).toMatchObject({ enabled: true, provider: 'gemini' });
  });
  it('чат: запрос и ответ', async () => {
    const f = ok('Привет! x = 2');
    const r = await (await mod.__test.viaGemini({ action: 'chat', context: 'Имя: Тест', messages: [{ role: 'user', content: 'Реши' }, { role: 'assistant', content: 'Подсказка' }, { role: 'user', content: 'Полностью' }] }, f)).json();
    expect(r.reply).toBe('Привет! x = 2');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(':generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(init.body as string);
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(['user', 'model', 'user']);
    expect(body.systemInstruction.parts[0].text).toContain('Имя: Тест');
  });
  it('оценка эссе: band пересчитывается', async () => {
    const f = ok(JSON.stringify({ band: 9, criteria: { task: 6.3, coherence: 6, lexical: 5.5, grammar: 6 }, strengths: ['a'], improvements: ['b'], summary: 'c' }));
    const r = await (await mod.__test.viaGemini({ action: 'grade', task: 'writing2', prompt: 'Discuss both views', answer: 'word '.repeat(260) }, f)).json();
    expect(r.criteria.task).toBe(6.5);
    expect(r.band).toBe(6);
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).generationConfig.responseMimeType).toBe('application/json');
  });
  it('генерация: отбрасывает некорректные задания', async () => {
    const q = (o: string[], i: number) => ({ question: 'Q', options: o, correctIndex: i, explanation: 'E', difficulty: 'easy' });
    const f = ok(JSON.stringify({ questions: [q(['a', 'b', 'c', 'd'], 1), q(['a', 'a', 'c', 'd'], 0), q(['a', 'b', 'c'], 0), q(['a', 'b', 'c', 'd'], 7)] }));
    const r = await (await mod.__test.viaGemini({ action: 'generate', subject: 'Математика', topic: 'Проценты', count: 5, language: 'русский', difficulty: 'easy' }, f)).json();
    expect(r.questions).toHaveLength(1);
  });
  it('перегрузка (503): повтор, затем запасная модель', async () => {
    const okBody = { candidates: [{ content: { parts: [{ text: 'Ответ' }] } }] };
    const overloaded = { error: { status: 'UNAVAILABLE', message: 'This model is currently experiencing high demand.' } };
    // основная модель дважды перегружена, запасная отвечает
    const f = vi.fn(async (url: string) => (url.includes('flash-lite') ? new Response(JSON.stringify(okBody)) : new Response(JSON.stringify(overloaded), { status: 503 })));
    const r = await (await mod.__test.viaGemini({ action: 'chat', messages: [{ role: 'user', content: 'Привет' }] }, f as unknown as typeof fetch)).json();
    expect(r.reply).toBe('Ответ');
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes('gemini-flash-latest'))).toHaveLength(2);
    expect(urls.at(-1)).toContain('gemini-flash-lite-latest');
    // одна перегрузка — достаточно повтора той же модели
    let n = 0;
    const g = vi.fn(async () => (n++ === 0 ? new Response(JSON.stringify(overloaded), { status: 503 }) : new Response(JSON.stringify(okBody))));
    expect((await (await mod.__test.viaGemini({ action: 'chat', messages: [{ role: 'user', content: 'Привет' }] }, g as unknown as typeof fetch)).json()).reply).toBe('Ответ');
    expect(g).toHaveBeenCalledTimes(2);
  });
  it('перегрузка у всех моделей: 503 и понятный русский текст, без английской ошибки Google', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: { status: 'UNAVAILABLE', message: 'high demand' } }), { status: 503 }));
    const res = await mod.__test.viaGemini({ action: 'chat', messages: [{ role: 'user', content: 'Привет' }] }, f as unknown as typeof fetch);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain('перегружен');
    expect(body.error).not.toMatch(/demand/);
    expect(f).toHaveBeenCalledTimes(4);
  });
  it('ошибки: лимит и неверный ключ', async () => {
    const r1 = await mod.__test.viaGemini({ action: 'analyze', summary: 'x'.repeat(30) }, reply({ error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } }, 429));
    expect(r1.status).toBe(429);
    const r2 = await mod.__test.viaGemini({ action: 'analyze', summary: 'x'.repeat(30) }, reply({ error: { status: 'INVALID_ARGUMENT', message: 'API key not valid' } }, 400));
    expect(r2.status).toBe(500);
    expect((await r2.json()).error).toContain('GEMINI_API_KEY');
  });
});
