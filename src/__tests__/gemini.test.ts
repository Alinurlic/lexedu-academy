import { describe, expect, it, vi } from 'vitest';

describe('Gemini', async () => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  vi.stubEnv('AI_ALLOW_ANONYMOUS', '1');
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
  it('ошибки: лимит и неверный ключ', async () => {
    const r1 = await mod.__test.viaGemini({ action: 'analyze', summary: 'x'.repeat(30) }, reply({ error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } }, 429));
    expect(r1.status).toBe(429);
    const r2 = await mod.__test.viaGemini({ action: 'analyze', summary: 'x'.repeat(30) }, reply({ error: { status: 'INVALID_ARGUMENT', message: 'API key not valid' } }, 400));
    expect(r2.status).toBe(500);
    expect((await r2.json()).error).toContain('GEMINI_API_KEY');
  });
});
