import { getSupabase } from './supabase';

/**
 * Клиент серверного ИИ LexEdu (Vercel-функция /api/lexi → Claude).
 * Ключ ИИ хранится только на сервере (ANTHROPIC_API_KEY в Vercel), браузер его не видит.
 * Если функция недоступна (локальный запуск, один HTML-файл, ключ не задан) — ИИ считается выключенным,
 * и интерфейс прямо сообщает о демо-режиме.
 */
const ENDPOINT = (import.meta.env.VITE_LEXI_API_URL as string | undefined)?.trim() || '/api/lexi';

export interface AiStatus {
  enabled: boolean;
  model?: string;
  requiresAuth?: boolean;
  reason?: string;
}

let statusPromise: Promise<AiStatus> | null = null;

export function aiStatus(): Promise<AiStatus> {
  if (location.protocol === 'file:') return Promise.resolve({ enabled: false, reason: 'Файл открыт с диска — серверный ИИ недоступен.' });
  statusPromise ??= fetch(ENDPOINT, { method: 'GET' })
    .then(async (r) => {
      if (!r.ok) return { enabled: false, reason: `Сервер ИИ ответил ${r.status}` };
      const data = (await r.json()) as Partial<AiStatus>;
      return { enabled: !!data.enabled, model: data.model, requiresAuth: data.requiresAuth, reason: data.reason };
    })
    .catch(() => ({ enabled: false, reason: 'Серверная функция ИИ не найдена (локальный режим).' }));
  return statusPromise;
}

export class AiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const sb = await getSupabase();
  if (!sb) return {};
  const { data } = await sb.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new AiError(data.error ?? `Ошибка сервера ИИ (${res.status})`, res.status);
  return data;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function aiChat(messages: ChatTurn[], context: string) {
  return call<{ reply: string }>({ action: 'chat', messages, context });
}

export interface WritingGrade {
  band: number;
  criteria: { task: number; coherence: number; lexical: number; grammar: number };
  strengths: string[];
  improvements: string[];
  summary: string;
}

export function aiGradeWriting(task: 'writing1' | 'writing2' | 'speaking', prompt: string, answer: string) {
  return call<WritingGrade>({ action: 'grade', task, prompt, answer });
}

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function aiGenerateQuestions(params: { subject: string; topic: string; count: number; language: string; difficulty: string }) {
  return call<{ questions: GeneratedQuestion[] }>({ action: 'generate', ...params });
}

export function aiAnalyze(summary: string) {
  return call<{ reply: string }>({ action: 'analyze', summary });
}
