import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, CheckCircle2, CircleSlash, Clock, Flag, RotateCcw, Trash2, Trophy, XCircle } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, EmptyState, Progress, Segmented } from '@/components/ui';
import { ChartTooltip, CHART, axisProps } from '@/components/charts';
import { SubjectIcon } from '@/components/icons';
import { Explanation, QuestionMeta, QuestionView } from '@/components/QuestionView';
import { LexiBubble } from '@/components/lexi/Lexi';
import { EssayGrader } from '@/components/EssayGrader';
import { lexiSay } from '@/lib/lexi';
import { useAppStore, useQuestionMap } from '@/store/useAppStore';
import { checkAnswer, isAnswered } from '@/data/questions';
import { SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { fmtDate, fmtDateTime, fmtDuration } from '@/lib/date';
import { cn, pct } from '@/lib/utils';
import { Markdown } from '@/components/Markdown';

type Filter = 'all' | 'wrong' | 'empty' | 'flagged';

export default function ExamResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exams = useAppStore((s) => s.exams);
  const deleteExam = useAppStore((s) => s.deleteExam);
  const gradeEssay = useAppStore((s) => s.gradeEssay);
  const qmap = useQuestionMap();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const exam = exams.find((e) => e.id === id);

  const data = useMemo(() => {
    if (!exam) return null;
    const rows = exam.questionIds.filter((qid) => qmap.get(qid)?.type !== 'essay').map((qid, i) => {
      const q = qmap.get(qid);
      const ans = exam.answers[qid] ?? null;
      const answered = isAnswered(ans);
      const correct = !!q && checkAnswer(q, ans);
      return { qid, i, q, ans, answered, correct, flagged: exam.flagged.includes(qid) };
    });
    const correct = rows.filter((r) => r.correct).length;
    const unanswered = rows.filter((r) => !r.answered).length;
    const wrong = rows.length - correct - unanswered;
    const byTopic = new Map<string, { c: number; n: number }>();
    for (const r of rows) {
      if (!r.q) continue;
      const e = byTopic.get(r.q.topic) ?? { c: 0, n: 0 };
      e.n++;
      if (r.correct) e.c++;
      byTopic.set(r.q.topic, e);
    }
    const topics = [...byTopic.entries()].map(([t, v]) => ({ id: t, name: TOPIC_MAP[t]?.name ?? t, subject: TOPIC_MAP[t]?.subject, ...v, p: pct(v.c, v.n) })).sort((a, b) => a.p - b.p);
    const same = exams.filter((e) => e.config.kind === exam.config.kind && e.config.title === exam.config.title);
    const comparison = same.slice(-8).map((e) => ({ id: e.id, label: fmtDate(e.finishedAt), pct: pct(e.score, e.maxScore), current: e.id === exam.id }));
    const prevIdx = same.findIndex((e) => e.id === exam.id) - 1;
    const prev = prevIdx >= 0 ? same[prevIdx] : null;
    return { rows, correct, unanswered, wrong, topics, comparison, prev };
  }, [exam, exams, qmap]);

  if (!exam || !data) {
    return <EmptyState icon={Trophy} lexi="thinking" title="Экзамен не найден" description="Возможно, он был удалён." action={<Button onClick={() => navigate('/exams')}>К экзаменам</Button>} />;
  }

  // для SAT/IELTS шкала нелинейная (SAT начинается с 400), поэтому процент считаем по верным ответам
  const scaledTrack = !!exam.config.track && exam.config.track !== 'ent';
  const p = scaledTrack ? pct(data.correct, data.rows.length) : pct(exam.score, exam.maxScore);
  const essayIds = exam.questionIds.filter((id) => qmap.get(id)?.type === 'essay');
  const lexiLine = lexiSay(p >= 80 ? 'examGreat' : p >= 55 ? 'examGood' : 'examWeak');
  const diff = data.prev ? pct(exam.score, exam.maxScore) - pct(data.prev.score, data.prev.maxScore) : null;
  const rows = data.rows.filter((r) => (filter === 'wrong' ? r.answered && !r.correct : filter === 'empty' ? !r.answered : filter === 'flagged' ? r.flagged : true));
  const openRow = data.rows.find((r) => r.qid === open);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate('/exams')}>
          <ArrowLeft /> Все экзамены
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Удалить
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/exams')}>
            <RotateCcw /> Пройти ещё раз
          </Button>
        </div>
      </div>

      <Card className="brand-glow p-6">
        <div className="mb-5">
          <LexiBubble mood={lexiLine.mood} text={lexiLine.text} size="sm" tone={p >= 75 ? 'success' : p >= 50 ? 'violet' : 'danger'} />
        </div>
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className={cn('grid size-28 shrink-0 place-items-center rounded-3xl', p >= 75 ? 'bg-success/15 text-success' : p >= 50 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger')}>
              <div className="text-center">
                <div className="text-3xl font-semibold tabular">{exam.scaled?.value ?? exam.score}</div>
                <div className="text-xs opacity-80">из {exam.scaled?.max ?? exam.maxScore}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{fmtDateTime(exam.finishedAt)}</div>
              <h2 className="mt-1 text-xl font-semibold">{exam.config.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="default">{scaledTrack ? `${p}% верных` : `${p}%`}</Badge>
                {diff !== null && <Badge variant={diff >= 0 ? 'success' : 'danger'}>{diff >= 0 ? `+${diff}` : diff} п.п. к прошлому</Badge>}
                {exam.autoSubmitted && <Badge variant="warning">Сдано автоматически</Badge>}
              </div>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={CheckCircle2} label="Верно" value={data.correct} tone="text-success" />
            <Metric icon={XCircle} label="Неверно" value={data.wrong} tone="text-danger" />
            <Metric icon={CircleSlash} label="Без ответа" value={data.unanswered} />
            <Metric icon={Clock} label="Время" value={fmtDuration(exam.durationSec)} />
          </div>
        </div>
      </Card>

      {exam.scaled && exam.config.track && exam.config.track !== 'ent' && (
        <Card className="p-5">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="text-xs text-muted-foreground">{exam.scaled.label}</div>
              <div className="text-4xl font-semibold tabular">{exam.scaled.value}</div>
            </div>
            {exam.scaled.parts.map((p2) => (
              <div key={p2.label}>
                <div className="text-xs text-muted-foreground">{p2.label}</div>
                <div className="text-2xl font-semibold tabular">
                  {p2.value}
                  <span className="text-sm font-normal text-muted-foreground"> / {p2.max}</span>
                </div>
              </div>
            ))}
            {exam.modules?.some((m) => m.adaptive) && (
              <div className="text-xs text-muted-foreground">
                Адаптивные модули: {exam.modules.filter((m) => m.adaptive).map((m) => `${m.title.replace(' — Module 2', '')}: ${m.adaptive === 'hard' ? 'сложный' : 'простой'}`).join(', ')}
              </div>
            )}
          </div>
          {exam.scaled.note && <p className="mt-3 text-xs text-muted-foreground">{exam.scaled.note}</p>}
        </Card>
      )}

      {essayIds.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Writing: оценка эссе</CardTitle>
              <CardDescription>Итоговый band IELTS пересчитается после оценки обоих заданий (Task 2 весит вдвое больше)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {essayIds.map((id) => {
              const q = qmap.get(id);
              if (!q || q.type !== 'essay') return null;
              const text = typeof exam.answers[id] === 'string' ? (exam.answers[id] as string) : '';
              return (
                <div key={id} className="space-y-3">
                  <div className="text-sm font-medium">{q.task === 'writing1' ? 'Task 1' : 'Task 2'}</div>
                  <p className="whitespace-pre-line rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">{q.question.split('\n\n|')[0]}</p>
                  <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 text-sm">{text || <span className="text-muted-foreground">Ответ не написан</span>}</div>
                  <EssayGrader q={q} text={text} existing={exam.essays?.[id]} onGraded={(g) => gradeEssay(exam.id, id, { band: g.band, feedback: g.feedback, self: g.source === 'self' })} />
                  {exam.essays?.[id]?.feedback && <Markdown text={exam.essays[id].feedback!} className="text-sm text-muted-foreground" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{exam.config.track === 'sat' ? 'Разделы SAT' : exam.config.track === 'ielts' ? 'Секции IELTS' : 'Баллы по предметам'}</CardTitle>
              <CardDescription>{exam.config.scoring === 'ent' ? 'Соответствие и множественный выбор — 2 балла (1 при одной ошибке)' : 'Доля верных ответов по разделам'}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {exam.sectionScores.map((s) => (
              <div key={s.subject} className="flex items-center gap-3">
                <SubjectIcon subject={s.subject} className="size-8" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="truncate font-medium">{SUBJECT_MAP[s.subject].name}</span>
                    <span className="tabular">
                      <span className="font-semibold">{s.score}</span>
                      <span className="text-muted-foreground"> / {s.maxPoints}</span>
                    </span>
                  </div>
                  <Progress value={pct(s.score, s.maxPoints)} />
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {s.correct} из {s.total} верно
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Сравнение с прошлыми попытками</CardTitle>
              <CardDescription>Тот же формат, % от максимума</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.comparison} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis domain={[0, 100]} {...axisProps} />
                  <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltip fmt={(v) => `${v}%`} />} />
                  <Bar dataKey="pct" name="Результат" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {data.comparison.map((c) => (
                      <Cell key={c.id} fill={c.current ? CHART.c1 : 'hsl(var(--muted-foreground) / 0.35)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Синим выделена текущая попытка</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Результаты по темам</CardTitle>
            <CardDescription>Отсортировано от слабых к сильным</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {data.topics.map((t) => (
            <div key={t.id}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="truncate">
                  {t.name} <span className="text-xs text-muted-foreground">· {t.subject ? SUBJECT_MAP[t.subject].short : ''}</span>
                </span>
                <span className="shrink-0 text-muted-foreground tabular">
                  {t.c}/{t.n}
                </span>
              </div>
              <Progress value={t.p} indicatorClassName={t.p >= 75 ? 'bg-success' : t.p >= 50 ? 'bg-warning' : 'bg-danger'} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>Разбор заданий</CardTitle>
            <CardDescription>Нажмите на задание, чтобы увидеть ответ и объяснение</CardDescription>
          </div>
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `Все ${data.rows.length}` },
              { value: 'wrong', label: `Ошибки ${data.wrong}` },
              { value: 'empty', label: `Пустые ${data.unanswered}` },
              { value: 'flagged', label: `Флажки ${exam.flagged.length}` },
            ]}
          />
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Нет заданий в этой категории</p>
          ) : (
            <div className="divide-y rounded-xl border">
              {rows.map((r) => (
                <button key={r.qid} onClick={() => setOpen(open === r.qid ? null : r.qid)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/50">
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular', r.correct ? 'bg-success/15 text-success' : r.answered ? 'bg-danger/15 text-danger' : 'bg-secondary text-muted-foreground')}>{r.i + 1}</span>
                  <span className="line-clamp-1 flex-1 text-sm">{r.q?.question ?? 'Вопрос удалён'}</span>
                  {r.flagged && <Flag className="size-3.5 shrink-0 fill-warning text-warning" />}
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{r.q ? SUBJECT_MAP[r.q.subject].short : ''}</span>
                </button>
              ))}
            </div>
          )}
          {openRow?.q && (
            <div className="mt-4 rounded-2xl border p-5 animate-fade-up">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Задание {openRow.i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>
                  Скрыть
                </Button>
              </div>
              <QuestionMeta q={openRow.q} className="mb-3" />
              <QuestionView q={openRow.q} value={openRow.ans} onChange={() => undefined} reveal keyboard={false} />
              {!openRow.answered && <p className="mt-3 text-sm text-warning">Ответ не был дан</p>}
              <Explanation q={openRow.q} correct={openRow.correct} />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title="Удалить результат экзамена?"
        description="Запись исчезнет из истории экзаменов. Ответы останутся в общей статистике."
        confirmLabel="Удалить"
        onConfirm={() => {
          deleteExam(exam.id);
          navigate('/exams');
        }}
      />
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border bg-surface-2/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className={cn('mt-1 text-lg font-semibold tabular', tone)}>{value}</div>
    </div>
  );
}
