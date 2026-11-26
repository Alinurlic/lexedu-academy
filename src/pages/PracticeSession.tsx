import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, Clock, Flag, RotateCcw, Sparkles, Target, Timer, X, XCircle } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, EmptyState, Progress } from '@/components/ui';
import { Explanation, QuestionMeta, QuestionView } from '@/components/QuestionView';
import { Logo } from '@/components/icons';
import { Lexi } from '@/components/lexi/Lexi';
import { lexiSay } from '@/lib/lexi';
import { useSession } from '@/store/session';
import { useAppStore, useQuestionMap } from '@/store/useAppStore';
import { checkAnswer, formatAnswer, formatCorrect, isAnswered } from '@/data/questions';
import { SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { fmtClock, fmtDuration } from '@/lib/date';
import { cn, pct, plural } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Answer, PracticeSessionResult } from '@/types';

export default function PracticeSession() {
  const practice = useSession((s) => s.practice);
  const patch = useSession((s) => s.patchPractice);
  const setPractice = useSession((s) => s.setPractice);
  const recordPractice = useAppStore((s) => s.recordPractice);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const qmap = useQuestionMap();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Answer | null>(null);
  const [result, setResult] = useState<PracticeSessionResult | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [now, setNow] = useState(Date.now());
  const qStart = useRef(Date.now());

  const qid = practice?.questionIds[practice.current];
  const q = qid ? qmap.get(qid) : undefined;
  const entry = qid ? practice?.entries[qid] : undefined;

  useEffect(() => {
    setDraft(entry?.answer ?? null);
    qStart.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid]);

  useEffect(() => {
    if (!practice?.timeLimitSec || result) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [practice?.timeLimitSec, result]);

  const finish = useCallback(
    (auto = false) => {
      const p = useSession.getState().practice;
      if (!p) return;
      if (!Object.values(p.entries).some((e) => e.submitted)) {
        setPractice(null);
        toast.info(auto ? 'Время вышло' : 'Сессия закрыта', 'Нет отвеченных вопросов — результат не сохранён');
        navigate('/practice');
        return;
      }
      const answers = p.questionIds.map((id) => {
        const e = p.entries[id];
        return { questionId: id, answer: e?.submitted ? e.answer : null, correct: !!e?.correct, timeMs: e?.timeMs ?? 0 };
      });
      const durationSec = Math.round((Date.now() - new Date(p.startedAt).getTime()) / 1000);
      const res = recordPractice({ subject: p.subject, topics: p.topics, startedAt: p.startedAt, answers, durationSec });
      setResult(res);
      setPractice(null);
      if (auto) toast.info('Время вышло', 'Сессия завершена автоматически');
      toast.xp(`+${res.xpEarned} XP`, 'Сессия завершена');
    },
    [recordPractice, setPractice, navigate],
  );

  const remaining = practice?.timeLimitSec ? practice.timeLimitSec - (now - new Date(practice.startedAt).getTime()) / 1000 : null;
  useEffect(() => {
    if (remaining !== null && remaining <= 0 && !result) finish(true);
  }, [remaining, result, finish]);

  const submit = useCallback(() => {
    if (!practice || !q || !qid || entry?.submitted || !isAnswered(draft)) return;
    const correct = checkAnswer(q, draft);
    patch({ entries: { ...practice.entries, [qid]: { answer: draft, submitted: true, correct, timeMs: Date.now() - qStart.current } } });
  }, [practice, q, qid, entry, draft, patch]);

  const goto = useCallback((i: number) => practice && i >= 0 && i < practice.questionIds.length && patch({ current: i }), [practice, patch]);

  const answeredCount = practice ? Object.values(practice.entries).filter((e) => e.submitted).length : 0;
  const isLast = practice ? practice.current === practice.questionIds.length - 1 : false;

  const next = useCallback(() => {
    if (!practice) return;
    if (isLast) {
      if (answeredCount === practice.questionIds.length) finish();
      else setConfirmFinish(true);
    } else goto(practice.current + 1);
  }, [practice, isLast, answeredCount, finish, goto]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || result || confirmExit || confirmFinish) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'BUTTON') return;
      e.preventDefault();
      if (entry?.submitted) next();
      else submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entry, next, submit, result, confirmExit, confirmFinish]);

  if (result) return <PracticeResults result={result} onAgain={() => navigate('/practice')} />;

  if (!practice || !q || !qid) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <EmptyState icon={Target} lexi="reading" title="Нет активной сессии" description="Настройте практику и начните новую сессию." action={<Button onClick={() => navigate('/practice')}>К настройкам практики</Button>} />
      </div>
    );
  }

  const total = practice.questionIds.length;
  const bookmarked = bookmarks.includes(qid);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => setConfirmExit(true)} aria-label="Выйти из сессии">
            <X />
          </Button>
          <div className="hidden sm:block">
            <Logo collapsed />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{practice.label}</div>
            <div className="flex items-center gap-2">
              <Progress value={(answeredCount / total) * 100} className="h-1 max-w-48" />
              <span className="text-xs text-muted-foreground tabular">
                {answeredCount}/{total}
              </span>
            </div>
          </div>
          {remaining !== null && (
            <Badge variant={remaining < 60 ? 'danger' : 'secondary'} className="h-8 px-3 text-sm tabular">
              <Timer /> {fmtClock(remaining)}
            </Badge>
          )}
          <Button variant="secondary" size="sm" onClick={() => (answeredCount === total ? finish() : setConfirmFinish(true))}>
            <Flag /> Завершить
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex flex-wrap gap-1.5" role="navigation" aria-label="Навигация по вопросам">
          {practice.questionIds.map((id, i) => {
            const e = practice.entries[id];
            return (
              <button
                key={id}
                onClick={() => goto(i)}
                aria-label={`Вопрос ${i + 1}`}
                aria-current={i === practice.current}
                className={cn(
                  'size-8 rounded-lg border text-xs font-medium tabular transition-colors',
                  i === practice.current && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                  e?.submitted ? (e.correct ? 'border-success/50 bg-success/15 text-success' : 'border-danger/50 bg-danger/15 text-danger') : 'hover:bg-secondary',
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <Card key={qid} className="animate-fade-up p-5 sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 text-sm text-muted-foreground">
                Вопрос {practice.current + 1} из {total} · {SUBJECT_MAP[q.subject].name}
              </div>
              <QuestionMeta q={q} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const added = toggleBookmark(qid);
                toast.success(added ? 'Добавлено в закладки' : 'Удалено из закладок');
              }}
              aria-label={bookmarked ? 'Убрать из закладок' : 'Добавить в закладки'}
              aria-pressed={bookmarked}
            >
              {bookmarked ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
            </Button>
          </div>

          <QuestionView q={q} value={entry?.submitted ? entry.answer : draft} onChange={setDraft} reveal={entry?.submitted} />
          {entry?.submitted && <Explanation q={q} correct={entry.correct} lexi />}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => goto(practice.current - 1)} disabled={practice.current === 0}>
              <ArrowLeft /> Назад
            </Button>
            {!entry?.submitted ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => goto(practice.current + 1)} disabled={isLast}>
                  Пропустить
                </Button>
                <Button onClick={submit} disabled={!isAnswered(draft)}>
                  Проверить
                </Button>
              </div>
            ) : (
              <Button onClick={next}>
                {isLast ? 'Завершить сессию' : 'Следующий'} <ArrowRight />
              </Button>
            )}
          </div>
        </Card>
      </main>

      <ConfirmDialog
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="Выйти из сессии?"
        description="Прогресс сохранится — вы сможете продолжить со страницы «Практика». Чтобы засчитать результат, нажмите «Завершить»."
        confirmLabel="Выйти"
        onConfirm={() => navigate('/practice')}
      />
      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title="Завершить сессию?"
        description={`Отвечено ${answeredCount} из ${total}. Неотвеченные вопросы не попадут в статистику.`}
        confirmLabel="Завершить"
        onConfirm={() => finish()}
      />
    </div>
  );
}

function PracticeResults({ result, onAgain }: { result: PracticeSessionResult; onAgain: () => void }) {
  const navigate = useNavigate();
  const qmap = useQuestionMap();
  const answered = result.answers.filter((a) => a.answer !== null);
  const correct = answered.filter((a) => a.correct).length;
  const wrong = answered.length - correct;
  const skipped = result.answers.length - answered.length;
  const accuracy = pct(correct, answered.length);

  const topics = useMemo(() => {
    const m = new Map<string, { c: number; n: number }>();
    for (const a of answered) {
      const q = qmap.get(a.questionId);
      if (!q) continue;
      const e = m.get(q.topic) ?? { c: 0, n: 0 };
      e.n++;
      if (a.correct) e.c++;
      m.set(q.topic, e);
    }
    return [...m.entries()].map(([id, v]) => ({ id, name: TOPIC_MAP[id]?.name ?? id, ...v, p: pct(v.c, v.n) })).sort((a, b) => a.p - b.p);
  }, [answered, qmap]);

  const weakest = topics.find((t) => t.p < 70);
  const recommendation = weakest
    ? { text: `Повторите тему «${weakest.name}» (${weakest.p}%): ${TOPIC_MAP[weakest.id]?.advice}.`, cta: 'Тренировать тему', to: `/practice?subject=${result.subject}&topic=${weakest.id}&count=10` }
    : wrong > 0
      ? { text: 'Отличный результат! Закрепите его: разберите ошибки этой сессии.', cta: 'Повторить ошибки', to: '/mistakes?review=1' }
      : { text: 'Безупречно! Пора проверить себя в формате экзамена.', cta: 'Пробный ЕНТ', to: '/exams' };

  const lexiLine = useMemo(() => {
    if (answered.length >= 5 && wrong === 0) return lexiSay('perfect');
    return lexiSay(accuracy >= 80 ? 'sessionGreat' : accuracy >= 55 ? 'sessionGood' : 'sessionWeak');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => navigate('/')}>
            На главную
          </Button>
        </div>
        <Card className="brand-glow animate-fade-up p-6 sm:p-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Lexi mood={lexiLine.mood} size="md" animate />
            <div className={cn('grid size-20 shrink-0 place-items-center rounded-3xl text-2xl font-semibold tabular', accuracy >= 75 ? 'bg-success/15 text-success' : accuracy >= 50 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger')}>
              {accuracy}%
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{SUBJECT_MAP[result.subject].name} · сессия завершена</div>
              <h1 className="mt-1 text-2xl font-semibold">
                {correct} из {result.answers.length} верно
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-violet">Lexi:</span> {lexiLine.text}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="violet">
                  <Sparkles /> +{result.xpEarned} XP
                </Badge>
                <Badge variant="outline">
                  <Clock /> {fmtDuration(result.durationSec)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={Target} label="Баллы" value={`${correct}/${result.answers.length}`} />
            <Metric icon={CheckCircle2} label="Верно" value={String(correct)} tone="success" />
            <Metric icon={XCircle} label="Ошибки" value={String(wrong)} tone="danger" />
            <Metric icon={Clock} label="Пропущено" value={String(skipped)} />
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Результаты по темам</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topics.length === 0 && <p className="text-sm text-muted-foreground">Нет отвеченных вопросов.</p>}
              {topics.map((t) => (
                <div key={t.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="text-muted-foreground tabular">
                      {t.c}/{t.n} · {t.p}%
                    </span>
                  </div>
                  <Progress value={t.p} indicatorClassName={t.p >= 75 ? 'bg-success' : t.p >= 50 ? 'bg-warning' : 'bg-danger'} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-violet/30">
            <CardHeader>
              <CardTitle>Что дальше</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{recommendation.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => navigate(recommendation.to)}>
                  {recommendation.cta} <ArrowRight />
                </Button>
                <Button variant="secondary" onClick={onAgain}>
                  <RotateCcw /> Новая сессия
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Ошибки сессии {wrong > 0 && <span className="text-muted-foreground">· {wrong} {plural(wrong, ['вопрос', 'вопроса', 'вопросов'])} добавлены в тетрадь ошибок</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {wrong === 0 && <p className="text-sm text-muted-foreground">Ошибок нет — отличная работа!</p>}
            {answered
              .filter((a) => !a.correct)
              .map((a) => {
                const q = qmap.get(a.questionId);
                if (!q) return null;
                return (
                  <div key={a.questionId} className="rounded-xl border p-4">
                    <p className="text-sm font-medium">{q.question}</p>
                    <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Ваш ответ: </span>
                        <span className="text-danger">{formatAnswer(q, a.answer)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Правильный: </span>
                        <span className="text-success">{formatCorrect(q)}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[13px] text-muted-foreground">{q.explanation}</p>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className="rounded-xl border bg-surface-2/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className={cn('mt-1 text-xl font-semibold tabular', tone === 'success' && 'text-success', tone === 'danger' && 'text-danger')}>{value}</div>
    </div>
  );
}
