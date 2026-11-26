import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CircleDashed, ClipboardCheck, Coffee, Flag, Maximize2, Minimize2, Timer } from 'lucide-react';
import { Badge, Button, Card, Dialog, EmptyState } from '@/components/ui';
import { QuestionMeta, QuestionView } from '@/components/QuestionView';
import { Logo } from '@/components/icons';
import { useSession } from '@/store/session';
import { useAllQuestions, useAppStore, useQuestionMap } from '@/store/useAppStore';
import { isAnswered } from '@/data/questions';
import { SUBJECT_MAP } from '@/data/subjects';
import { satModule2, scoreFull } from '@/lib/exam';
import { fmtClock } from '@/lib/date';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast';

export default function ExamSession() {
  const exam = useSession((s) => s.exam);
  const patch = useSession((s) => s.patchExam);
  const setExam = useSession((s) => s.setExam);
  const recordExam = useAppStore((s) => s.recordExam);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const qmap = useQuestionMap();
  const allQuestions = useAllQuestions();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isFs, setIsFs] = useState(!!document.fullscreenElement);
  const finished = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      clearInterval(t);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  useEffect(() => {
    if (!exam) return;
    const onBefore = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [exam]);

  const submit = useCallback(
    (auto: boolean) => {
      const e = useSession.getState().exam;
      if (!e || finished.current) return;
      finished.current = true;
      window.speechSynthesis?.cancel();
      const ids = e.modules.flatMap((m) => m.questionIds);
      const modules = e.modules.map((m) => ({ title: m.title, subject: m.subject, questionIds: m.questionIds, adaptive: m.adaptive }));
      const sc = scoreFull(e.config, modules, e.answers, qmap);
      const finishedAt = new Date();
      const totalLimit = e.modules.reduce((s, m) => s + m.timeLimitSec + (m.breakBeforeSec ?? 0), 0);
      const durationSec = Math.min(totalLimit, Math.round((finishedAt.getTime() - new Date(e.startedAt).getTime()) / 1000));
      const res = recordExam({
        config: e.config,
        modules,
        startedAt: e.startedAt,
        finishedAt: finishedAt.toISOString(),
        questionIds: ids,
        answers: Object.fromEntries(ids.map((id) => [id, e.answers[id] ?? null])),
        flagged: e.flagged,
        durationSec,
        autoSubmitted: auto,
        score: sc.score,
        maxScore: sc.maxScore,
        sectionScores: sc.sectionScores,
        scaled: sc.scaled,
        essays: {},
      });
      setExam(null);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      toast.success(auto ? 'Время вышло — работа сдана автоматически' : 'Экзамен завершён', `${sc.scaled.label}: ${sc.scaled.value} из ${sc.scaled.max}`);
      navigate(`/exams/${res.id}`, { replace: true });
    },
    [qmap, recordExam, setExam, navigate],
  );

  /** Переход к следующему модулю (с адаптивной сборкой второго модуля SAT и перерывом). */
  const nextModule = useCallback(
    (auto: boolean) => {
      const e = useSession.getState().exam;
      if (!e) return;
      window.speechSynthesis?.cancel();
      const ni = e.moduleIndex + 1;
      if (ni >= e.modules.length) return submit(auto);
      const modules = [...e.modules];
      const next = { ...modules[ni] };
      if (next.questionIds.length === 0) {
        const prev = modules.slice(0, ni).reverse().find((m) => m.subject === next.subject);
        const used = new Set(modules.flatMap((m) => m.questionIds));
        const built = satModule2(next.subject, allQuestions, used, prev?.questionIds ?? [], e.answers, qmap);
        next.questionIds = built.ids;
        next.adaptive = built.adaptive;
      }
      modules[ni] = next;
      const t = Date.now();
      const breakUntil = next.breakBeforeSec ? t + next.breakBeforeSec * 1000 : null;
      patch({ modules, moduleIndex: ni, current: 0, breakUntil, deadline: (breakUntil ?? t) + next.timeLimitSec * 1000 });
      if (auto) toast.info('Время модуля вышло', 'Начинается следующая часть');
    },
    [allQuestions, qmap, patch, submit],
  );

  const onBreak = !!exam?.breakUntil && now < exam.breakUntil;
  const remaining = exam ? Math.max(0, (exam.deadline - now) / 1000) : 0;
  useEffect(() => {
    if (exam && !onBreak && remaining <= 0 && !finished.current) nextModule(true);
  }, [exam, remaining, onBreak, nextModule]);

  const mod = exam?.modules[exam.moduleIndex];
  const qid = mod?.questionIds[exam!.current];
  const q = qid ? qmap.get(qid) : undefined;

  const stats = useMemo(() => {
    if (!exam || !mod) return { answered: 0, unanswered: 0, flagged: 0, unansweredIdx: [] as number[], flaggedIdx: [] as number[] };
    const unansweredIdx = mod.questionIds.map((id, i) => (isAnswered(exam.answers[id]) ? -1 : i)).filter((i) => i >= 0);
    const flaggedIdx = mod.questionIds.map((id, i) => (exam.flagged.includes(id) ? i : -1)).filter((i) => i >= 0);
    return { answered: mod.questionIds.length - unansweredIdx.length, unanswered: unansweredIdx.length, flagged: flaggedIdx.length, unansweredIdx, flaggedIdx };
  }, [exam, mod]);

  const goto = (i: number) => exam && mod && i >= 0 && i < mod.questionIds.length && patch({ current: i });
  const gotoNextUnanswered = () => {
    if (!exam || !stats.unansweredIdx.length) return;
    goto(stats.unansweredIdx.find((i) => i > exam.current) ?? stats.unansweredIdx[0]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || confirmOpen) return;
      if (e.key === 'ArrowRight') goto((exam?.current ?? 0) + 1);
      if (e.key === 'ArrowLeft') goto((exam?.current ?? 0) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!exam || !mod) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <EmptyState icon={ClipboardCheck} lexi="exam" title="Нет активного экзамена" description="Выберите формат и начните пробный экзамен." action={<Button onClick={() => navigate('/exams')}>К экзаменам</Button>} />
      </div>
    );
  }

  if (onBreak) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <Card className="max-w-md p-8 text-center">
          <Coffee className="mx-auto size-10 text-primary" />
          <h1 className="mt-3 text-xl font-semibold">Перерыв</h1>
          <p className="mt-1 text-sm text-muted-foreground">Следующая часть: {mod.title}. На реальном SAT перерыв длится 10 минут.</p>
          <div className="my-5 text-4xl font-semibold tabular">{fmtClock((exam.breakUntil! - now) / 1000)}</div>
          <Button
            onClick={() => {
              const t = Date.now();
              patch({ breakUntil: null, deadline: t + mod.timeLimitSec * 1000 });
            }}
          >
            Начать сейчас
          </Button>
        </Card>
      </div>
    );
  }

  if (!q || !qid) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <EmptyState icon={ClipboardCheck} title="Модуль пуст" description="В банке не нашлось вопросов для этой части." action={<Button onClick={() => nextModule(false)}>Дальше</Button>} />
      </div>
    );
  }

  const flagged = exam.flagged.includes(qid);
  const total = mod.questionIds.length;
  const lowTime = remaining < 300;
  const isLastModule = exam.moduleIndex === exam.modules.length - 1;
  const multiModule = exam.modules.length > 1;

  const groups = [...new Set(mod.questionIds.map((id) => qmap.get(id)?.subject))].filter(Boolean).map((s) => ({
    subject: s!,
    items: mod.questionIds.map((id, i) => ({ id, i })).filter((x) => qmap.get(x.id)?.subject === s),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="hidden sm:block">
            <Logo collapsed />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {exam.config.title}
              {multiModule && <span className="text-muted-foreground"> · {mod.title} ({exam.moduleIndex + 1}/{exam.modules.length})</span>}
            </div>
            <div className="text-xs text-muted-foreground tabular">
              Отвечено {stats.answered}/{total} · флажков {stats.flagged}
              {mod.adaptive && <span> · адаптивный модуль: {mod.adaptive === 'hard' ? 'сложнее' : 'проще'}</span>}
            </div>
          </div>
          <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5 font-semibold tabular', lowTime ? 'border-danger/50 bg-danger/10 text-danger' : 'bg-surface')} role="timer" aria-label="Оставшееся время модуля">
            <Timer className="size-4" /> {fmtClock(remaining)}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label={isFs ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => undefined)}
          >
            {isFs ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <Button onClick={() => setConfirmOpen(true)}>{isLastModule ? 'Завершить' : 'Следующая часть'}</Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 p-4 lg:grid-cols-[1fr_300px] lg:p-6">
        <Card key={qid} className="animate-fade-up self-start p-5 sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 text-sm text-muted-foreground">
                {exam.config.track === 'ent' ? 'Задание' : 'Question'} {exam.current + 1} из {total} · {SUBJECT_MAP[q.subject].name}
              </div>
              <QuestionMeta q={q} />
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => toast.success(toggleBookmark(qid) ? 'Добавлено в закладки' : 'Удалено из закладок')} aria-pressed={bookmarks.includes(qid)} aria-label={bookmarks.includes(qid) ? 'Убрать из закладок' : 'Добавить в закладки'}>
                {bookmarks.includes(qid) ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
              </Button>
              <Button variant={flagged ? 'secondary' : 'ghost'} size="sm" onClick={() => patch({ flagged: flagged ? exam.flagged.filter((f) => f !== qid) : [...exam.flagged, qid] })} aria-pressed={flagged} className={cn(flagged && 'text-warning')}>
                <Flag className={cn(flagged && 'fill-current')} /> {flagged ? 'Отмечено' : 'На проверку'}
              </Button>
            </div>
          </div>
          <QuestionView q={q} value={exam.answers[qid] ?? null} onChange={(v) => patch({ answers: { ...useSession.getState().exam!.answers, [qid]: v } })} />
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => goto(exam.current - 1)} disabled={exam.current === 0}>
              <ArrowLeft /> Назад
            </Button>
            <div className="flex gap-1">
              {isAnswered(exam.answers[qid]) && q.type !== 'essay' && (
                <Button variant="ghost" size="sm" onClick={() => patch({ answers: { ...exam.answers, [qid]: null } })}>
                  Сбросить
                </Button>
              )}
              {stats.unanswered > 0 && (
                <Button variant="ghost" size="sm" onClick={gotoNextUnanswered} title="Перейти к следующему заданию без ответа">
                  <CircleDashed /> <span className="hidden sm:inline">К пропущенным</span>
                </Button>
              )}
            </div>
            {exam.current < total - 1 ? (
              <Button onClick={() => goto(exam.current + 1)}>
                Далее <ArrowRight />
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)}>{isLastModule ? 'Завершить' : 'Следующая часть'}</Button>
            )}
          </div>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {multiModule && (
            <Card className="p-4">
              <div className="mb-2 text-sm font-medium">Части экзамена</div>
              <ol className="space-y-1.5 text-sm">
                {exam.modules.map((m, i) => (
                  <li key={m.id} className={cn('flex items-center gap-2', i === exam.moduleIndex ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    <span className={cn('size-2 rounded-full', i < exam.moduleIndex ? 'bg-success' : i === exam.moduleIndex ? 'bg-primary' : 'bg-border')} />
                    {m.title} · {Math.round(m.timeLimitSec / 60)} мин
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[11px] text-muted-foreground">После перехода к следующей части вернуться к предыдущей нельзя.</p>
            </Card>
          )}
          <Card className="p-4">
            <div className="mb-3 text-sm font-medium">Навигация</div>
            <div className="scrollbar-thin max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {groups.map((g) => (
                <div key={g.subject}>
                  {groups.length > 1 && <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{SUBJECT_MAP[g.subject].name}</div>}
                  <div className="grid grid-cols-8 gap-1 lg:grid-cols-6">
                    {g.items.map(({ id, i }) => {
                      const answered = isAnswered(exam.answers[id]);
                      const fl = exam.flagged.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => goto(i)}
                          aria-label={`Задание ${i + 1}${answered ? ', есть ответ' : ''}${fl ? ', отмечено' : ''}`}
                          className={cn('relative aspect-square rounded-md border text-[11px] font-medium tabular transition-colors', answered ? 'border-primary/50 bg-primary/15 text-primary' : 'hover:bg-secondary', i === exam.current && 'ring-2 ring-primary ring-offset-1 ring-offset-background')}
                        >
                          {i + 1}
                          {fl && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-warning" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary/40" /> есть ответ</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border" /> без ответа</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> флажок</span>
            </div>
          </Card>
          <Card className="p-4 text-xs text-muted-foreground">
            Ответы сохраняются автоматически. Стрелки ← → переключают задания. По истечении времени {isLastModule ? 'работа сдаётся' : 'начинается следующая часть'} автоматически.
            {exam.config.scoring === 'ent' && ' Задания на соответствие и с несколькими ответами оцениваются в 2 балла (1 балл при одной ошибке).'}
          </Card>
        </aside>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={isLastModule ? 'Завершить экзамен?' : `Завершить часть «${mod.title}»?`}
        description={isLastModule ? 'После сдачи изменить ответы будет нельзя.' : 'Вернуться к этой части после перехода будет нельзя.'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Вернуться к заданиям
            </Button>
            <Button onClick={() => (setConfirmOpen(false), isLastModule ? submit(false) : nextModule(false))}>{isLastModule ? 'Сдать работу' : 'Перейти дальше'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border p-3">
            <div className="text-lg font-semibold tabular">{stats.answered}</div>
            <div className="text-[11px] text-muted-foreground">с ответом</div>
          </div>
          <div className={cn('rounded-xl border p-3', stats.unanswered && 'border-danger/40 text-danger')}>
            <div className="text-lg font-semibold tabular">{stats.unanswered}</div>
            <div className="text-[11px] text-muted-foreground">без ответа</div>
          </div>
          <div className={cn('rounded-xl border p-3', stats.flagged && 'border-warning/40 text-warning')}>
            <div className="text-lg font-semibold tabular">{stats.flagged}</div>
            <div className="text-[11px] text-muted-foreground">с флажком</div>
          </div>
        </div>
        {stats.unanswered > 0 && (
          <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> Вопросы без ответа будут засчитаны как неверные.
          </p>
        )}
        {stats.unansweredIdx.length > 0 && <JumpList title="Без ответа" items={stats.unansweredIdx} onJump={(i) => (goto(i), setConfirmOpen(false))} tone="danger" />}
        {stats.flaggedIdx.length > 0 && <JumpList title="С флажком «на проверку»" items={stats.flaggedIdx} onJump={(i) => (goto(i), setConfirmOpen(false))} tone="warning" />}
        <div className="mt-3">
          <Badge variant="outline">Осталось времени: {fmtClock(remaining)}</Badge>
        </div>
      </Dialog>
    </div>
  );
}

function JumpList({ title, items, onJump, tone }: { title: string; items: number[]; onJump: (i: number) => void; tone: 'danger' | 'warning' }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{title} — нажмите, чтобы вернуться</div>
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 60).map((i) => (
          <button key={i} onClick={() => onJump(i)} className={cn('h-7 min-w-7 rounded-md border px-1.5 text-xs font-medium tabular', tone === 'danger' ? 'border-danger/40 text-danger hover:bg-danger/10' : 'border-warning/40 text-warning hover:bg-warning/10')}>
            {i + 1}
          </button>
        ))}
        {items.length > 60 && <span className="text-xs text-muted-foreground">и ещё {items.length - 60}</span>}
      </div>
    </div>
  );
}
