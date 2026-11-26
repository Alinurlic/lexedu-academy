import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, Info, Loader2, Plus, RotateCcw, Send, Sparkles, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Input } from '@/components/ui';
import { Lexi, LexiAvatar } from '@/components/lexi/Lexi';
import { SubjectIcon } from '@/components/icons';
import { Avatar } from '@/components/layout/Avatar';
import { useAppStore, useQuestionMap } from '@/store/useAppStore';
import { askLexi } from '@/lib/assistant/engine';
import { aiStatus, type AiStatus } from '@/lib/ai';
import { studentSummary } from '@/lib/insights';
import { GENERATOR_LIST, generateTask } from '@/lib/assistant/generators';
import { parseNumeric } from '@/data/questions';
import { SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { cn, uid } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { ChatMessage } from '@/types';

const SUGGESTIONS = ['Объясни мои ошибки', 'Что мне повторить?', 'Реши x^2 - 5x + 6 = 0', 'Дай задачу на проценты', 'Объясни теорему Виета', 'Законы Ньютона'];

export default function Assistant() {
  const history = useAppStore((s) => s.assistantHistory);
  const addMessages = useAppStore((s) => s.addChatMessages);
  const clearChat = useAppStore((s) => s.clearChat);
  const profile = useAppStore((s) => s.profile);
  const attempts = useAppStore((s) => s.attempts);
  const mistakes = useAppStore((s) => s.mistakes);
  const qmap = useQuestionMap();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
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
      toast.error('Lexi не смог ответить', 'Попробуйте ещё раз');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_300px]">
      <Card className="flex h-[calc(100vh-9.5rem)] min-h-[520px] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b p-4">
          <LexiAvatar size={40} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Lexi-помощник</div>
            <div className="text-xs text-muted-foreground">Объясняет, решает по шагам, придумывает задачи</div>
          </div>
          {!status ? (
            <Badge variant="outline">Проверяю ИИ…</Badge>
          ) : aiOn ? (
            <Badge variant="success" title={status.model}>
              <Sparkles /> ИИ подключён
            </Badge>
          ) : (
            <Badge variant="warning" title={status.reason}>
              <Info /> Демо-режим · без ИИ
            </Badge>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => setConfirmClear(true)} disabled={!history.length} aria-label="Очистить переписку">
            <Trash2 />
          </Button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {history.length === 0 && (
            <div className="flex flex-col items-center py-6 text-center">
              <Lexi mood="reading" size="lg" />
              <h2 className="mt-3 text-lg font-semibold">Привет, {profile.name}! Я Lexi.</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {aiOn
                  ? 'Задай вопрос по любому предмету ЕНТ, SAT или IELTS — объясню по шагам. Я вижу твою статистику и подскажу, что повторить.'
                  : 'Сейчас я работаю в демо-режиме: ИИ не подключён. Я решаю линейные и квадратные уравнения по шагам, объясняю твои ошибки, придумываю задачи с проверкой и подсказываю, что повторить.'}
              </p>
            </div>
          )}
          {history.map((m) => (
            <Message key={m.id} m={m} onAsk={send} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LexiAvatar size={28} /> <Loader2 className="size-4 animate-spin" /> Lexi думает…
            </div>
          )}
          {showMistakePicker && !busy && (
            <div className="ml-10 flex flex-col gap-1.5">
              {openMistakes.map((m) => {
                const q = qmap.get(m.questionId);
                if (!q) return null;
                return (
                  <button key={m.id} onClick={() => send(`Объясни ошибку #${m.id}`)} className="flex items-center gap-2 rounded-xl border bg-card p-2.5 text-left text-sm transition-colors hover:border-primary/50">
                    <SubjectIcon subject={q.subject} className="size-7" />
                    <span className="line-clamp-1 flex-1">{q.question}</span>
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
              <button key={s} onClick={() => send(s)} disabled={busy} className="shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50">
                {s}
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
            <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Спроси Lexi… например «реши 3x - 7 = 11»" maxLength={1000} aria-label="Сообщение для Lexi" />
            <Button type="submit" disabled={!input.trim() || busy} aria-label="Отправить">
              <Send />
            </Button>
          </form>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-violet" /> Новая задача
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Числа подбираются случайно, ответ и решение вычисляются.</p>
          <div className="flex flex-wrap gap-1.5">
            {GENERATOR_LIST.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  const task = generateTask({ kind: g.id });
                  addMessages([
                    { id: uid('chat'), role: 'user', text: `Дай задачу: ${g.label.toLowerCase()}`, date: new Date().toISOString() },
                    { id: uid('chat'), role: 'lexi', text: `Задача по теме «${TOPIC_MAP[task.topic]?.name ?? g.label}». Реши и проверь ответ.`, date: new Date().toISOString(), card: { kind: 'generated', question: task.question, answer: task.answer, unit: task.unit, steps: task.steps, subject: task.subject, topic: task.topic } },
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
            <Info className="size-4" /> Как работает Lexi
          </div>
          {aiOn ? (
            <p>Ответы даёт модель ИИ Claude через сервер LexEdu. Генератор задач и разбор ошибок по кнопке работают локально. ИИ может ошибаться — сверяй важные факты по учебнику.</p>
          ) : (
            <>
              <p>ИИ не подключён{status?.reason ? `: ${status.reason}` : ''}. Ответы строятся локально: решатель уравнений, генератор задач, база объяснений и анализ твоих ответов.</p>
              <p className="mt-2">После публикации на Vercel с ключом ANTHROPIC_API_KEY здесь заработает полноценный ИИ.</p>
            </>
          )}
        </Card>
      </div>

      <ConfirmDialog open={confirmClear} onClose={() => setConfirmClear(false)} title="Очистить переписку с Lexi?" confirmLabel="Очистить" danger onConfirm={() => (clearChat(), toast.success('Переписка очищена'))} />
    </div>
  );
}

function Message({ m, onAsk }: { m: ChatMessage; onAsk: (t: string) => void }) {
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
        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border bg-surface-2/70 px-4 py-2.5 text-sm leading-relaxed">{m.text}</div>
        {m.card?.kind === 'generated' && <GeneratedCard card={m.card} onMore={() => onAsk(`Дай ещё задачу: ${TOPIC_MAP[m.card?.kind === 'generated' ? m.card.topic : '']?.name ?? ''}`)} />}
        {m.card?.kind === 'mistake' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate('/mistakes?review=1')}>
              <RotateCcw /> Повторить ошибки
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
        <Badge variant="violet">Сгенерировано</Badge>
      </div>
      <p className="font-medium">{card.question}</p>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <Input value={value} onChange={(e) => (setValue(e.target.value), setResult(null))} inputMode="decimal" placeholder="Ответ" className="h-9 w-32" aria-label="Ваш ответ" />
        {card.unit && <span className="text-sm text-muted-foreground">{card.unit}</span>}
        <Button size="sm" type="submit" disabled={parseNumeric(value) === null}>
          Проверить
        </Button>
        <Button size="sm" type="button" variant="ghost" onClick={() => setShowSteps((v) => !v)}>
          <Eye /> {showSteps ? 'Скрыть решение' : 'Решение'}
        </Button>
      </form>
      {result !== null && (
        <p className={cn('mt-2 flex items-center gap-1.5 text-sm font-medium', result ? 'text-success' : 'text-danger')}>
          {result ? <Check className="size-4" /> : <X className="size-4" />}
          {result ? 'Отлично! Так держать!' : 'Не совсем. Посмотри решение — давай разберёмся!'}
        </p>
      )}
      {showSteps && (
        <ol className="mt-3 list-decimal space-y-1 rounded-xl bg-secondary/60 p-3 pl-8 text-sm">
          {card.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
          <li className="font-semibold">
            Ответ: {String(card.answer).replace('.', ',')}
            {card.unit ? ` ${card.unit}` : ''}
          </li>
        </ol>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onMore}>
          <Sparkles /> Ещё задачу
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
              sourceNote: 'Сгенерировано Lexi (демо-режим) и сохранено пользователем.',
              verification: 'unverified',
              tags: ['lexi'],
            });
            setSaved(true);
            toast.success('Задача сохранена', 'Она появилась в банке вопросов как «Мой вопрос»');
          }}
        >
          <Plus /> {saved ? 'Сохранено' : 'В мои вопросы'}
        </Button>
      </div>
    </div>
  );
}
