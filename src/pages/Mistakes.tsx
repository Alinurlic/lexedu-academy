import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Brain, CheckCircle2, ChevronDown, NotebookPen, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, EmptyState, Input, Progress, Select } from '@/components/ui';
import { SubjectIcon } from '@/components/icons';
import { Lexi } from '@/components/lexi/Lexi';
import { Explanation, QuestionMeta, QuestionView } from '@/components/QuestionView';
import { useAppStore, useQuestionMap } from '@/store/useAppStore';
import { checkAnswer, formatAnswer, formatCorrect, isAnswered } from '@/data/questions';
import { SUBJECTS, SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { fmtDate } from '@/lib/date';
import { cn, plural, shuffle } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Answer, Mistake, MistakeStatus, SubjectId } from '@/types';
import { MathText } from '@/components/MathText';

export const STATUS_META: Record<MistakeStatus, { label: string; variant: 'danger' | 'warning' | 'success' }> = {
  new: { label: 'Новая', variant: 'danger' },
  learning: { label: 'Изучаю', variant: 'warning' },
  mastered: { label: 'Освоена', variant: 'success' },
};

export default function Mistakes() {
  const [params, setParams] = useSearchParams();
  const mistakes = useAppStore((s) => s.mistakes);
  const setStatus = useAppStore((s) => s.setMistakeStatus);
  const deleteMistake = useAppStore((s) => s.deleteMistake);
  const qmap = useQuestionMap();

  const [subject, setSubject] = useState<SubjectId | 'all'>('all');
  const [topic, setTopic] = useState('all');
  const [status, setStatusFilter] = useState<MistakeStatus | 'all' | 'active'>('active');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(params.get('focus'));
  const [toDelete, setToDelete] = useState<Mistake | null>(null);
  const [reviewQueue, setReviewQueue] = useState<string[] | null>(null);

  useEffect(() => {
    const f = params.get('focus');
    if (f) {
      setExpanded(f);
      setStatusFilter('all');
      setTimeout(() => document.getElementById(`mistake-${f}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    }
  }, [params]);

  const enriched = useMemo(
    () =>
      mistakes
        .map((m) => ({ m, q: qmap.get(m.questionId) }))
        .filter((x): x is { m: Mistake; q: NonNullable<typeof x.q> } => !!x.q)
        .sort((a, b) => b.m.date.localeCompare(a.m.date)),
    [mistakes, qmap],
  );

  // Прогресс после ошибки: ответы на тот же вопрос после даты ошибки
  const attempts = useAppStore((s) => s.attempts);
  const after = useMemo(() => {
    const first = new Map(mistakes.map((m) => [m.questionId, m.date]));
    const res = new Map<string, { n: number; c: number }>();
    for (const a of attempts) {
      const d = first.get(a.questionId);
      if (!d || a.date <= d) continue;
      const e = res.get(a.questionId) ?? { n: 0, c: 0 };
      e.n++;
      if (a.correct) e.c++;
      res.set(a.questionId, e);
    }
    return res;
  }, [attempts, mistakes]);
  const afterTotals = [...after.values()].reduce((s, x) => ({ n: s.n + x.n, c: s.c + x.c }), { n: 0, c: 0 });

  const filtered = enriched.filter(({ m, q }) => {
    if (subject !== 'all' && q.subject !== subject) return false;
    if (topic !== 'all' && q.topic !== topic) return false;
    if (status === 'active' && m.status === 'mastered') return false;
    if (status !== 'all' && status !== 'active' && m.status !== status) return false;
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { new: 0, learning: 0, mastered: 0 };
  enriched.forEach(({ m }) => counts[m.status]++);
  const total = enriched.length;

  const startReview = (ids?: string[]) => {
    const pool = ids ?? filtered.filter(({ m }) => m.status !== 'mastered').map(({ m }) => m.questionId);
    if (!pool.length) {
      toast.info('Нечего повторять', 'Все ошибки в выбранном фильтре освоены');
      return;
    }
    setReviewQueue(shuffle(pool).slice(0, 20));
  };

  useEffect(() => {
    if (params.get('review') === '1' && !reviewQueue) {
      const pool = enriched.filter(({ m }) => m.status !== 'mastered').map(({ m }) => m.questionId);
      if (pool.length) setReviewQueue(shuffle(pool).slice(0, 10));
      params.delete('review');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reviewQueue) return <ReviewMode queue={reviewQueue} onExit={() => setReviewQueue(null)} />;

  const subj = subject === 'all' ? null : SUBJECT_MAP[subject];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs text-muted-foreground">Всего ошибок</div>
              <div className="text-2xl font-semibold tabular">{total}</div>
            </div>
            {(Object.keys(STATUS_META) as MistakeStatus[]).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className="text-left">
                <div className="text-xs text-muted-foreground">{STATUS_META[s].label}</div>
                <div className={cn('text-2xl font-semibold tabular', s === 'new' ? 'text-danger' : s === 'learning' ? 'text-warning' : 'text-success')}>{counts[s]}</div>
              </button>
            ))}
            <div>
              <div className="text-xs text-muted-foreground">Верно при повторе</div>
              <div className="text-2xl font-semibold tabular">{afterTotals.n ? `${Math.round((afterTotals.c / afterTotals.n) * 100)}%` : '—'}</div>
            </div>
            <div className="min-w-40 flex-1">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Освоено</span>
                <span className="tabular">{total ? Math.round((counts.mastered / total) * 100) : 0}%</span>
              </div>
              <Progress value={total ? (counts.mastered / total) * 100 : 0} indicatorClassName="bg-success" />
            </div>
          </div>
        </Card>
        <Card className="flex flex-col justify-center gap-2 p-5">
          <Button size="lg" onClick={() => startReview()} disabled={!filtered.some(({ m }) => m.status !== 'mastered')}>
            <Brain /> Режим повторения
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">До 20 ошибок из текущего фильтра</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>Тетрадь ошибок</CardTitle>
            <CardDescription>Неверные ответы добавляются сюда автоматически</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по вопросу" className="pl-9" aria-label="Поиск ошибок" />
            </div>
            <Select value={subject} onChange={(e) => (setSubject(e.target.value as SubjectId | 'all'), setTopic('all'))} aria-label="Предмет">
              <option value="all">Все предметы</option>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!subj} aria-label="Тема">
              <option value="all">{subj ? 'Все темы' : 'Сначала выберите предмет'}</option>
              {subj?.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatusFilter(e.target.value as MistakeStatus | 'all' | 'active')} aria-label="Статус">
              <option value="active">Неосвоенные</option>
              <option value="all">Все статусы</option>
              <option value="new">Новые</option>
              <option value="learning">Изучаю</option>
              <option value="mastered">Освоенные</option>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              lexi={total ? 'thinking' : 'perfect'}
              title={total ? 'Нет ошибок под этот фильтр' : 'Тетрадь ошибок пуста'}
              description={total ? 'Измените фильтры, чтобы увидеть другие записи.' : 'Когда вы ответите неверно в практике или экзамене, вопрос появится здесь.'}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map(({ m, q }) => {
                const open = expanded === m.id;
                return (
                  <div key={m.id} id={`mistake-${m.id}`} className={cn('rounded-xl border transition-colors', open && 'border-primary/40')}>
                    <button onClick={() => setExpanded(open ? null : m.id)} className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open}>
                      <SubjectIcon subject={q.subject} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-sm', !open && 'line-clamp-1')}><MathText text={q.question} noSub={q.subject === 'informatics'} /></div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {SUBJECT_MAP[q.subject].name} · {TOPIC_MAP[q.topic]?.name} · {fmtDate(m.date)}
                          {m.reviewCount > 0 && ` · повторений: ${m.reviewCount}`}
                          {after.get(m.questionId) && ` · после ошибки: ${after.get(m.questionId)!.c} из ${after.get(m.questionId)!.n} верно`}
                        </div>
                      </div>
                      <Badge variant={STATUS_META[m.status].variant}>{STATUS_META[m.status].label}</Badge>
                      <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                    </button>
                    {open && (
                      <div className="border-t p-4 animate-fade-up">
                        {q.passage && <p className="mb-3 line-clamp-4 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">{q.passage}</p>}
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
                            <div className="text-xs text-muted-foreground">Ваш ответ</div>
                            <div className="mt-0.5 font-medium text-danger"><MathText text={formatAnswer(q, m.studentAnswer)} noSub={q.subject === 'informatics'} /></div>
                          </div>
                          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                            <div className="text-xs text-muted-foreground">Правильный ответ</div>
                            <div className="mt-0.5 font-medium text-success"><MathText text={formatCorrect(q)} noSub={q.subject === 'informatics'} /></div>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{q.explanation}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Button size="sm" onClick={() => startReview([q.id])}>
                            <RotateCcw /> Повторить вопрос
                          </Button>
                          {m.status !== 'mastered' && (
                            <Button size="sm" variant="secondary" onClick={() => (setStatus(m.id, 'mastered'), toast.success('Отмечено как освоенное'))}>
                              <CheckCircle2 /> Освоено
                            </Button>
                          )}
                          <Select value={m.status} onChange={(e) => setStatus(m.id, e.target.value as MistakeStatus)} className="h-8 w-32 text-xs" aria-label="Статус ошибки">
                            <option value="new">Новая</option>
                            <option value="learning">Изучаю</option>
                            <option value="mastered">Освоена</option>
                          </Select>
                          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setToDelete(m)}>
                            <Trash2 /> Удалить
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Удалить запись?"
        description="Ошибка будет удалена из тетради. Если вы снова ошибётесь в этом вопросе, она появится заново."
        confirmLabel="Удалить"
        onConfirm={() => {
          if (toDelete) {
            deleteMistake(toDelete.id);
            toast.success('Запись удалена');
          }
        }}
      />
    </div>
  );
}

function ReviewMode({ queue, onExit }: { queue: string[]; onExit: () => void }) {
  const qmap = useQuestionMap();
  const recordReview = useAppStore((s) => s.recordReview);
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState<Answer | null>(null);
  const [checked, setChecked] = useState<{ correct: boolean; status: MistakeStatus | null } | null>(null);
  const [results, setResults] = useState<{ id: string; correct: boolean; status: MistakeStatus | null }[]>([]);
  const started = useRef(Date.now());
  const q = qmap.get(queue[idx]);
  const done = idx >= queue.length;

  const check = () => {
    if (!q || !isAnswered(draft) || checked) return;
    const correct = checkAnswer(q, draft);
    const status = recordReview(q.id, draft, correct, Date.now() - started.current);
    setChecked({ correct, status });
    setResults((r) => [...r, { id: q.id, correct, status }]);
  };
  const next = () => {
    setIdx((i) => i + 1);
    setDraft(null);
    setChecked(null);
    started.current = Date.now();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || (e.target as HTMLElement).tagName === 'BUTTON') return;
      e.preventDefault();
      if (checked) next();
      else check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (done) {
    const correct = results.filter((r) => r.correct).length;
    const mastered = results.filter((r) => r.status === 'mastered').length;
    return (
      <Card className="mx-auto max-w-lg p-8 text-center animate-fade-up">
        <Lexi mood={correct === results.length && results.length > 0 ? 'perfect' : correct >= results.length / 2 ? 'studying' : 'sad'} size="lg" className="mx-auto" animate />
        <h2 className="mt-4 text-xl font-semibold">Повторение завершено</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Верно {correct} из {results.length}. Освоено {mastered} {plural(mastered, ['ошибка', 'ошибки', 'ошибок'])}.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={onExit}>
            К тетради ошибок
          </Button>
          <Button onClick={() => navigate('/')}>На главную</Button>
        </div>
      </Card>
    );
  }

  if (!q) {
    return (
      <EmptyState icon={NotebookPen} lexi="thinking" title="Вопрос не найден" action={<Button onClick={next}>Пропустить</Button>} />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onExit} aria-label="Выйти из повторения">
          <X />
        </Button>
        <div className="flex-1">
          <div className="text-sm font-medium">Повторение ошибок</div>
          <Progress value={(idx / queue.length) * 100} className="mt-1 h-1" />
        </div>
        <span className="text-sm text-muted-foreground tabular">
          {idx + 1}/{queue.length}
        </span>
      </div>
      <Card key={q.id} className="p-5 animate-fade-up sm:p-7">
        <QuestionMeta q={q} className="mb-4" />
        <QuestionView q={q} value={draft} onChange={setDraft} reveal={!!checked} />
        {checked && (
          <>
            <Explanation q={q} correct={checked.correct} lexi />
            {checked.status && (
              <p className="mt-3 text-sm text-muted-foreground">
                Новый статус: <Badge variant={STATUS_META[checked.status].variant}>{STATUS_META[checked.status].label}</Badge>
              </p>
            )}
          </>
        )}
        <div className="mt-6 flex justify-end gap-2">
          {!checked ? (
            <>
              <Button variant="ghost" onClick={next}>
                Пропустить
              </Button>
              <Button onClick={check} disabled={!isAnswered(draft)}>
                Проверить
              </Button>
            </>
          ) : (
            <Button onClick={next}>
              {idx === queue.length - 1 ? 'Завершить' : 'Дальше'} <ArrowRight />
            </Button>
          )}
        </div>
      </Card>
      <p className="text-center text-xs text-muted-foreground">Верный ответ переводит ошибку: «Новая» → «Изучаю» → «Освоена». Неверный — возвращает в «Изучаю».</p>
    </div>
  );
}
