import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, Info, Loader2, MessageSquarePlus, Plus, RotateCcw, Send, Sparkles, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Input } from '@/components/ui';
import { Lexi, LexiAvatar } from '@/components/lexi/Lexi';
import { SubjectIcon } from '@/components/icons';
import { Avatar } from '@/components/layout/Avatar';
import { useAppStore, useChat, useQuestionMap } from '@/store/useAppStore';
import { askLexi } from '@/lib/assistant/engine';
import { aiStatus, type AiStatus } from '@/lib/ai';
import { studentSummary } from '@/lib/insights';
import { GENERATOR_LIST, generateTask } from '@/lib/assistant/generators';
import { parseNumeric } from '@/data/questions';
import { SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { cn, uid } from '@/lib/utils';
import { Markdown } from '@/components/Markdown';
import { fmtDate } from '@/lib/date';
import { toast } from '@/store/toast';
import type { ChatMessage } from '@/types';
import { MathText } from '@/components/MathText';
import { tr } from '@/i18n';

const SUGGESTIONS = ['Объясни мои ошибки', 'Что мне повторить?', 'Реши x^2 - 5x + 6 = 0', 'Дай задачу на проценты', 'Объясни теорему Виета', 'Законы Ньютона'];

export default function Assistant() {
  const { threads, activeId, messages: history } = useChat();
  const addMessages = useAppStore((s) => s.addChatMessages);
  const newChat = useAppStore((s) => s.newChat);
  const selectChat = useAppStore((s) => s.selectChat);
  const deleteChat = useAppStore((s) => s.deleteChat);
  const profile = useAppStore((s) => s.profile);
  const attempts = useAppStore((s) => s.attempts);
  const mistakes = useAppStore((s) => s.mistakes);
  const qmap = useQuestionMap();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const examFormat = useAppStore((s) => s.examFormat);
  useEffect(() => {
    void aiStatus().then(setStatus);
  }, []);
  const aiOn = !!status?.enabled;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [history.length, busy]);

  const openMistakes = useMemo(() => mistakes.filter((m) => m.status !== 'mastered').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [mistakes]);
  const lastLexi = [...history].reverse().find((m) => m.role === 'lexi');
  const showMistakePicker = !!lastLexi && /неосвоенных ошибок/.test(lastLexi.text);

  /** Повтор запроса после временного сбоя ИИ: вопрос уже в чате, второй раз его не добавляем. */
  const retry = async (text: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const reply = await askLexi(text, { profile, attempts, mistakes, qmap, summary: studentSummary(profile, attempts, examFormat, mistakes.filter((m) => m.status !== 'mastered').length) }, history);
      addMessages(reply);
    } catch {
      toast.error(tr('Lexi не смог ответить'), tr('Попробуйте ещё раз'));
    } finally {
      setBusy(false);
    }
  };

  const send = async (text: string) => {
    const t = text.trim().slice(0, 1000);
    if (!t || busy) return;
    const userMsg: ChatMessage = { id: uid('chat'), role: 'user', text: t, date: new Date().toISOString() };
    addMessages([userMsg]);
    setInput('');
    setBusy(true);
    try {
      // небольшая пауза — чтобы ответ не «мигал»; в демо-режиме ответ вычисляется локально
      const [reply] = await Promise.all([askLexi(t, { profile, attempts, mistakes, qmap, summary: studentSummary(profile, attempts, examFormat, mistakes.filter((m) => m.status !== 'mastered').length) }, [...history, userMsg]), new Promise((r) => setTimeout(r, 350))]);
      addMessages(reply);
    } catch {
      toast.error(tr('Lexi не смог ответить'), tr('Попробуйте ещё раз'));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="mx-auto grid max-w-[1280px] gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
      {/* Список чатов */}
      <Card className="hidden h-[calc(100vh-9.5rem)] min-h-[520px] flex-col overflow-hidden lg:flex">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <span className="text-sm font-semibold">{tr('Чаты')}</span>
          <Button size="sm" onClick={() => newChat()}>
            <MessageSquarePlus /> {tr('Новый')}
          </Button>
        </div>
        <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-2">
          {threads.length === 0 && <p className="p-3 text-xs text-muted-foreground">{tr('Пока нет чатов. Задай вопрос — начнётся новый.')}</p>}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => selectChat(t.id)}
              className={cn('group flex w-full items-center gap-2 rounded-xl border p-2.5 text-left transition-colors', t.id === activeId ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-secondary/60')}
            >
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm">{tr(t.title)}</div>
                <div className="text-[11px] text-muted-foreground">{tr('{0} · {1} сообщ.', fmtDate(t.updatedAt, { day: 'numeric', month: 'short' }), t.messages.length)}</div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => (e.stopPropagation(), setConfirmDel(t.id))}
                onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), setConfirmDel(t.id))}
                className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition hover:text-danger group-hover:opacity-100"
                aria-label={tr('Удалить чат')}
              >
                <Trash2 className="size-4" />
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex h-[calc(100vh-9.5rem)] min-h-[520px] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4">
          <LexiAvatar size={40} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{tr('Lexi-помощник')}</div>
            <div className="hidden truncate text-xs text-muted-foreground sm:block">{tr('Объясняет, решает по шагам, придумывает задачи')}</div>
          </div>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => newChat()} aria-label={tr('Новый чат')}>
            <MessageSquarePlus />
          </Button>
          {!status ? (
            <Badge variant="outline">{tr('Проверяю ИИ…')}</Badge>
          ) : aiOn ? (
            <Badge variant="success" title={status.model}>
              <Sparkles /> {tr('ИИ подключён')}
            </Badge>
          ) : (
            <Badge variant="warning" title={status.reason}>
              <Info /> {tr('Демо-режим · без ИИ')}
            </Badge>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => activeId && setConfirmDel(activeId)} disabled={!activeId} aria-label={tr('Удалить этот чат')}>
            <Trash2 />
          </Button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {history.length === 0 && (
            <div className="flex flex-col items-center py-6 text-center">
              <Lexi mood="reading" size="lg" />
              <h2 className="mt-3 text-lg font-semibold">{tr('Привет, {0}! Я Lexi.', profile.name)}</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {aiOn
                  ? tr('Задай вопрос по любому предмету ЕНТ, SAT или IELTS — объясню по шагам. Я вижу твою статистику и подскажу, что повторить.')
                  : tr('Сейчас я работаю в демо-режиме: ИИ не подключён. Я решаю линейные и квадратные уравнения по шагам, объясняю твои ошибки, придумываю задачи с проверкой и подсказываю, что повторить.')}
              </p>
            </div>
          )}
          {history.map((m) => (
            <Message key={m.id} m={m} onAsk={send} onRetry={m.id === lastLexi?.id ? retry : undefined} busy={busy} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LexiAvatar size={28} /> <Loader2 className="size-4 animate-spin" /> {tr('Lexi думает…')}
            </div>
          )}
          {showMistakePicker && !busy && (
            <div className="ml-10 flex flex-col gap-1.5">
              {openMistakes.map((m) => {
                const q = qmap.get(m.questionId);
                if (!q) return null;
                return (
                  <button key={m.id} onClick={() => send(tr('Объясни ошибку #{0}', m.id))} className="flex items-center gap-2 rounded-xl border bg-card p-2.5 text-left text-sm transition-colors hover:border-primary/50">
                    <SubjectIcon subject={q.subject} className="size-7" />
                    <span className="line-clamp-1 flex-1"><MathText text={q.question} noSub={q.subject === 'informatics'} /></span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3">
          <div className="scrollbar-thin mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(tr(s))} disabled={busy} className="shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50">
                {tr(s)}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2"
          >
            <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={tr('Спроси Lexi… например «реши 3x - 7 = 11»')} maxLength={1000} aria-label={tr('Сообщение для Lexi')} />
            <Button type="submit" disabled={!input.trim() || busy} aria-label={tr('Отправить')}>
              <Send />
            </Button>
          </form>
        </div>
      </Card>

      <div className="space-y-4 lg:col-span-2 xl:col-span-1">
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-violet" /> {tr('Новая задача')}
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{tr('Числа подбираются случайно, ответ и решение вычисляются.')}</p>
          <div className="flex flex-wrap gap-1.5">
            {GENERATOR_LIST.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  const task = generateTask({ kind: g.id });
                  addMessages([
                    { id: uid('chat'), role: 'user', text: tr('Дай задачу: {0}', g.label.toLowerCase()), date: new Date().toISOString() },
                    { id: uid('chat'), role: 'lexi', text: tr('Задача по теме «{0}». Реши и проверь ответ.', TOPIC_MAP[task.topic]?.name ?? g.label), date: new Date().toISOString(), card: { kind: 'generated', question: task.question, answer: task.answer, unit: task.unit, steps: task.steps, subject: task.subject, topic: task.topic } },
                  ]);
                }}
                className="rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:border-primary/50"
              >
                {g.label}
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-4 text-xs leading-relaxed text-muted-foreground">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="size-4" /> {tr('Как работает Lexi')}
          </div>
          {aiOn ? (
            <p>
              {tr('Ответы даёт модель ИИ {0} через сервер LexEdu. Генератор задач и разбор ошибок по кнопке работают локально. ИИ может ошибаться — сверяй важные факты по учебнику.', status?.provider === 'gemini' ? 'Google Gemini' : 'Claude')}
            </p>
          ) : (
            <>
              <p>{tr('ИИ не подключён{0}. Ответы строятся локально: решатель уравнений, генератор задач, база объяснений и анализ твоих ответов.', status?.reason ? `: ${status.reason}` : '')}</p>
              <p className="mt-2">{tr('Когда администратор добавит ключ ИИ на сервер (GEMINI_API_KEY или ANTHROPIC_API_KEY), здесь заработает полноценный ИИ.')}</p>
            </>
          )}
        </Card>
      </div>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} title={tr('Удалить этот чат?')} confirmLabel={tr('Удалить')} danger onConfirm={() => confirmDel && (deleteChat(confirmDel), toast.success(tr('Чат удалён')))} />
    </div>
  );
}

function Message({ m, onAsk, onRetry, busy }: { m: ChatMessage; onAsk: (t: string) => void; onRetry?: (t: string) => void; busy?: boolean }) {
  const navigate = useNavigate();
  if (m.role === 'user') {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</div>
        <Avatar className="size-8" />
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <LexiAvatar size={32} />
      <div className="min-w-0 max-w-[88%] space-y-2">
        <Markdown text={m.text} className="rounded-2xl rounded-tl-md border bg-surface-2/70 px-4 py-2.5 text-sm leading-relaxed" />
        {m.card?.kind === 'generated' && <GeneratedCard card={m.card} onMore={() => onAsk(tr('Дай ещё задачу: {0}', TOPIC_MAP[m.card?.kind === 'generated' ? m.card.topic : '']?.name ?? ''))} />}
        {m.card?.kind === 'retry' && onRetry && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => m.card?.kind === 'retry' && onRetry(m.card.text)}>
            <RotateCcw /> {tr('Повторить')}
          </Button>
        )}
        {m.card?.kind === 'mistake' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate('/mistakes?review=1')}>
              <RotateCcw /> {tr('Повторить ошибки')}
            </Button>
          </div>
        )}
        {m.card?.kind === 'topics' && (
          <div className="space-y-1.5">
            {m.card.items.map((t) => (
              <button key={t.topicId} onClick={() => navigate(`/practice?subject=${t.subject}&topic=${t.topicId}&count=10`)} className="flex w-full items-center gap-2 rounded-xl border bg-card p-2.5 text-left text-sm transition-colors hover:border-primary/50">
                <SubjectIcon subject={t.subject} className="size-7" />
                <span className="flex-1">
                  {TOPIC_MAP[t.topicId]?.name} <span className="text-xs text-muted-foreground">· {SUBJECT_MAP[t.subject].name}</span>
                </span>
                <Badge variant={t.accuracy < 0.5 ? 'danger' : 'warning'}>{Math.round(t.accuracy * 100)}%</Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GeneratedCard({ card, onMore }: { card: Extract<NonNullable<ChatMessage['card']>, { kind: 'generated' }>; onMore: () => void }) {
  const addQuestion = useAppStore((s) => s.addCustomQuestion);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [saved, setSaved] = useState(false);
  const check = () => {
    const n = parseNumeric(value);
    if (n === null) return;
    setResult(Math.abs(n - card.answer) < 1e-6);
  };
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <SubjectIcon subject={card.subject} className="size-6" /> {SUBJECT_MAP[card.subject].name} · {TOPIC_MAP[card.topic]?.name}
        <Badge variant="violet">{tr('Сгенерировано')}</Badge>
      </div>
      <p className="font-medium"><MathText text={card.question} /></p>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <Input value={value} onChange={(e) => (setValue(e.target.value), setResult(null))} inputMode="decimal" placeholder={tr('Ответ')} className="h-9 w-32" aria-label={tr('Ваш ответ')} />
        {card.unit && <span className="text-sm text-muted-foreground">{card.unit}</span>}
        <Button size="sm" type="submit" disabled={parseNumeric(value) === null}>
          {tr('Проверить')}
        </Button>
        <Button size="sm" type="button" variant="ghost" onClick={() => setShowSteps((v) => !v)}>
          <Eye /> {showSteps ? tr('Скрыть решение') : tr('Решение')}
        </Button>
      </form>
      {result !== null && (
        <p className={cn('mt-2 flex items-center gap-1.5 text-sm font-medium', result ? 'text-success' : 'text-danger')}>
          {result ? <Check className="size-4" /> : <X className="size-4" />}
          {result ? tr('Отлично! Так держать!') : tr('Не совсем. Посмотри решение — давай разберёмся!')}
        </p>
      )}
      {showSteps && (
        <ol className="mt-3 list-decimal space-y-1 rounded-xl bg-secondary/60 p-3 pl-8 text-sm">
          {card.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
          <li className="font-semibold">
            {tr('Ответ: {0}{1}', String(card.answer).replace('.', ','), card.unit ? ` ${card.unit}` : '')}
          </li>
        </ol>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onMore}>
          <Sparkles /> {tr('Ещё задачу')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={saved}
          onClick={() => {
            addQuestion({
              id: uid('uq'),
              type: 'numeric',
              subject: card.subject,
              topic: card.topic,
              difficulty: 'medium',
              question: card.question,
              correctAnswer: card.answer,
              tolerance: 1e-6,
              unit: card.unit,
              explanation: card.steps.join(' '),
              source: 'user',
              sourceNote: tr('Сгенерировано Lexi (демо-режим) и сохранено пользователем.'),
              verification: 'unverified',
              tags: ['lexi'],
            });
            setSaved(true);
            toast.success(tr('Задача сохранена'), tr('Она появилась в банке вопросов как «Мой вопрос»'));
          }}
        >
          <Plus /> {saved ? tr('Сохранено') : tr('В мои вопросы')}
        </Button>
      </div>
    </div>
  );
}
