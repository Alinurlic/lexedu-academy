import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, BarChart3, Lightbulb, Table2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Progress, Segmented } from '@/components/ui';
import { ChartTooltip, CHART, Legend, axisProps } from '@/components/charts';
import { SubjectIcon } from '@/components/icons';
import { SmartAnalysis } from '@/components/SmartAnalysis';
import { LexiBubble } from '@/components/lexi/Lexi';
import { useAppStore } from '@/store/useAppStore';
import { useCoreStats, useWeakTopics } from '@/hooks/useStats';
import { allRelevantSubjects, difficultyStats, scoreHistory, weeklySeries } from '@/lib/analytics';
import { DIFFICULTY_LABEL } from '@/data/questions';
import { SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { WEEKDAYS_SHORT, dayKey, addDays } from '@/lib/date';
import { cn, fmtNum } from '@/lib/utils';

export default function Analytics() {
  const navigate = useNavigate();
  const attempts = useAppStore((s) => s.attempts);
  const studyLog = useAppStore((s) => s.studyLog);
  const profile = useAppStore((s) => s.profile);
  const stats = useCoreStats();
  const weak = useWeakTopics(6);
  const [weeks, setWeeks] = useState<'4' | '12' | '26'>('12');
  const [showTable, setShowTable] = useState(false);
  const w = Number(weeks);

  const periodAttempts = useMemo(() => {
    const from = addDays(new Date(), -7 * w).toISOString();
    return attempts.filter((a) => a.date >= from);
  }, [attempts, w]);

  const examFormat = useAppStore((s) => s.examFormat);
  const score = useMemo(() => scoreHistory(attempts, profile, w, examFormat), [attempts, profile, w, examFormat]);
  const weekly = useMemo(() => weeklySeries(attempts, studyLog, w), [attempts, studyLog, w]);
  const subjects = useMemo(
    () =>
      allRelevantSubjects(profile, examFormat).map((s) => {
        const arr = periodAttempts.filter((a) => a.subject === s);
        return { id: s, name: SUBJECT_MAP[s].name, accuracy: arr.length ? Math.round((arr.filter((a) => a.correct).length / arr.length) * 100) : 0, n: arr.length };
      }),
    [periodAttempts, profile],
  );
  const diff = useMemo(() => difficultyStats(periodAttempts).map((d) => ({ name: DIFFICULTY_LABEL[d.difficulty], accuracy: Math.round(d.accuracy * 100), n: d.total })), [periodAttempts]);
  const weekdays = useMemo(() => {
    const totals = Array.from({ length: 7 }, () => ({ q: 0, days: new Set<string>() }));
    for (const a of periodAttempts) {
      const d = new Date(a.date);
      const i = (d.getDay() + 6) % 7;
      totals[i].q++;
      totals[i].days.add(dayKey(d));
    }
    return totals.map((t, i) => ({ label: WEEKDAYS_SHORT[i], avg: Math.round(t.q / Math.max(1, w)) }));
  }, [periodAttempts, w]);
  const exams = useAppStore((s) => s.exams);
  const examSeries = useMemo(() => exams.slice(-12).map((e) => ({ label: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(e.finishedAt)), pct: e.maxScore ? Math.round((e.score / e.maxScore) * 100) : 0 })), [exams]);
  const ratio = useMemo(() => {
    const byMode = { practice: { n: 0, c: 0 }, exam: { n: 0, c: 0 }, review: { n: 0, c: 0 } };
    let correct = 0;
    for (const a of periodAttempts) {
      byMode[a.mode].n++;
      if (a.correct) {
        byMode[a.mode].c++;
        correct++;
      }
    }
    return { correct, wrong: periodAttempts.length - correct, total: periodAttempts.length, byMode };
  }, [periodAttempts]);
  const topicBars = useMemo(() => {
    const m = new Map<string, { c: number; n: number }>();
    const rel = new Set(allRelevantSubjects(profile));
    for (const a of periodAttempts) {
      if (!rel.has(a.subject)) continue;
      const e = m.get(a.topic) ?? { c: 0, n: 0 };
      e.n++;
      if (a.correct) e.c++;
      m.set(a.topic, e);
    }
    return [...m.entries()]
      .filter(([, v]) => v.n >= 4)
      .map(([t, v]) => ({ id: t, name: TOPIC_MAP[t]?.name ?? t, subject: TOPIC_MAP[t]?.subject, accuracy: Math.round((v.c / v.n) * 100), n: v.n }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8);
  }, [periodAttempts, profile]);

  if (attempts.length === 0) {
    return <EmptyState icon={BarChart3} lexi="reading" title="Пока нет данных для аналитики" description="Пройдите несколько практических сессий — графики и рекомендации построятся автоматически." action={<Button onClick={() => navigate('/practice')}>Начать практику</Button>} />;
  }

  const periodAcc = periodAttempts.length ? Math.round((periodAttempts.filter((a) => a.correct).length / periodAttempts.length) * 100) : 0;
  const periodHours = weekly.reduce((s, x) => s + x.hours, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={weeks} onChange={setWeeks} options={[{ value: '4', label: '4 недели' }, { value: '12', label: '3 месяца' }, { value: '26', label: '6 месяцев' }]} />
        <Button variant="secondary" size="sm" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
          <Table2 /> {showTable ? 'Скрыть таблицу' : 'Таблица данных'}
        </Button>
      </div>

      <SmartAnalysis />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Прогноз ЕНТ" value={`${stats.prediction.total}`} hint={`цель ${profile.targetScore}`} />
        <Kpi label="Точность за период" value={`${periodAcc}%`} hint={`${fmtNum(periodAttempts.length)} ответов`} />
        <Kpi label="Часов за период" value={periodHours.toFixed(1)} hint={`≈ ${(periodHours / w).toFixed(1)} ч в неделю`} />
        <Kpi label="Слабых тем" value={String(weak.length)} hint="точность < 70%" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Прогноз балла ЕНТ" desc={`По неделям, шкала ${stats.prediction.max}`}>
          <Legend items={[{ label: 'Прогноз', color: CHART.c1 }, { label: 'Цель', color: CHART.c3, dashed: true }]} />
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={score} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={20} />
                <YAxis domain={[0, stats.prediction.max]} {...axisProps} />
                <Tooltip content={<ChartTooltip fmt={(v) => `${v} б.`} />} />
                <ReferenceLine y={profile.targetScore} stroke={CHART.c3} strokeDasharray="5 4" />
                <Line dataKey="score" name="Прогноз" stroke={CHART.c1} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Точность по неделям" desc="Доля верных ответов, %">
          <div className="h-[268px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={20} />
                <YAxis domain={[0, 100]} {...axisProps} />
                <Tooltip content={<ChartTooltip fmt={(v) => `${v}%`} />} />
                <Line dataKey="accuracy" name="Точность" stroke={CHART.c1} strokeWidth={2} dot={{ r: 3 }} connectNulls activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Часы занятий" desc="Суммарно за неделю">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                <YAxis {...axisProps} />
                <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltip fmt={(v) => `${v} ч`} />} />
                <Bar dataKey="hours" name="Часы" fill={CHART.c1} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Сравнение предметов" desc="Точность за период, %">
          <div className="space-y-3 pt-1">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <SubjectIcon subject={s.id} className="size-8" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="truncate">{s.name}</span>
                    <span className="tabular">
                      <span className="font-semibold">{s.n ? `${s.accuracy}%` : '—'}</span> <span className="text-xs text-muted-foreground">· {s.n} отв.</span>
                    </span>
                  </div>
                  <Progress value={s.accuracy} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Сложность вопросов" desc="Точность по уровню сложности, %">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diff} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis domain={[0, 100]} {...axisProps} />
                <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltip fmt={(v) => `${v}%`} />} />
                <Bar dataKey="accuracy" name="Точность" fill={CHART.c1} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-around text-xs text-muted-foreground">
            {diff.map((d) => (
              <span key={d.name}>
                {d.name}: {d.n} отв.
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Активность по дням недели" desc="В среднем вопросов в день недели">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdays} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltip fmt={(v) => `${v} вопр.`} />} />
                <Bar dataKey="avg" name="В среднем" fill={CHART.c1} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="История экзаменов" desc="Результат пробных ЕНТ, % от максимума">
          {examSeries.length === 0 ? (
            <EmptyState icon={BarChart3} lexi="exam" title="Экзаменов пока нет" description="Пройди пробный экзамен — здесь появится динамика." className="py-6" />
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={examSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                  <YAxis domain={[0, 100]} {...axisProps} />
                  <Tooltip content={<ChartTooltip fmt={(v) => `${v}%`} />} />
                  <Line dataKey="pct" name="Результат" stroke={CHART.c1} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
        <ChartCard title="Верно и неверно" desc="Соотношение ответов за период">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-success">Верно · {fmtNum(ratio.correct)}</span>
                <span className="text-danger">Неверно · {fmtNum(ratio.wrong)}</span>
              </div>
              <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Верно ${ratio.correct}, неверно ${ratio.wrong}`}>
                <div className="bg-success" style={{ width: `${ratio.total ? (ratio.correct / ratio.total) * 100 : 0}%` }} />
                <div className="bg-danger" style={{ width: `${ratio.total ? (ratio.wrong / ratio.total) * 100 : 0}%` }} />
              </div>
            </div>
            {(['practice', 'exam', 'review'] as const).map((m) => {
              const r = ratio.byMode[m];
              return (
                <div key={m} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                  <span>{{ practice: 'Практика', exam: 'Экзамены', review: 'Повторение ошибок' }[m]}</span>
                  <span className="tabular text-muted-foreground">
                    <span className="font-semibold text-foreground">{r.n ? `${Math.round((r.c / r.n) * 100)}%` : '—'}</span> · {fmtNum(r.n)} отв.
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-violet/30">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-violet" /> Слабые темы и рекомендации
              </CardTitle>
              <CardDescription>Рассчитано по последним 25 ответам в каждой теме ЕНТ-предметов</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {weak.length === 0 ? <LexiBubble mood="default" text="Слабых тем не обнаружено — во всех темах с достаточной статистикой точность выше 70%." tone="success" /> : <LexiBubble mood="thinking" text="Я проанализировал твои ответы. Вот с чего лучше начать:" tone="violet" size="xs" />}
            {weak.map((t) => (
              <div key={t.topicId} className="flex gap-3 rounded-xl border p-3">
                <SubjectIcon subject={t.subject} className="size-8" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{TOPIC_MAP[t.topicId].name}</span>
                    <Badge variant={t.accuracy < 0.5 ? 'danger' : 'warning'}>
                      <AlertTriangle /> {Math.round(t.accuracy * 100)}%
                    </Badge>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.message}</p>
                  <Button size="sm" variant="link" className="mt-1" onClick={() => navigate(`/practice?subject=${t.subject}&topic=${t.topicId}&count=${t.recommendedCount}`)}>
                    Решить {t.recommendedCount} вопросов <ArrowRight />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Темы с наименьшей точностью</CardTitle>
              <CardDescription>За выбранный период, минимум 4 ответа</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topicBars.map((t) => (
              <button key={t.id} className="block w-full text-left" onClick={() => t.subject && navigate(`/subjects/${t.subject}?topic=${t.id}`)}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="truncate">
                    {t.name} <span className="text-xs text-muted-foreground">· {t.subject ? SUBJECT_MAP[t.subject].short : ''}</span>
                  </span>
                  <span className="tabular text-muted-foreground">{t.accuracy}%</span>
                </div>
                <Progress value={t.accuracy} indicatorClassName={t.accuracy < 50 ? 'bg-danger' : t.accuracy < 70 ? 'bg-warning' : 'bg-success'} />
              </button>
            ))}
            {topicBars.length === 0 && <p className="text-sm text-muted-foreground">Недостаточно данных за период</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Разбор прогноза по блокам ЕНТ</CardTitle>
            <CardDescription>Взвешенная точность (сложные вопросы весят больше, свежие ответы важнее)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.prediction.blocks.map((b) => (
            <div key={b.key} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[220px_1fr_auto]">
              <div className="flex items-center gap-2 text-sm">
                <SubjectIcon subject={b.subject} className="size-7" />
                <span className="truncate">{b.label}</span>
              </div>
              <Progress value={(b.points / b.maxPoints) * 100} className="col-span-2 h-2 sm:col-span-1" />
              <span className="row-start-1 text-sm tabular sm:row-auto">
                <span className="font-semibold">{b.points.toFixed(1)}</span> <span className="text-muted-foreground">/ {b.maxPoints}</span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {showTable && (
        <Card>
          <CardHeader>
            <CardTitle>Данные по неделям</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Неделя с</th>
                  <th className="py-2 font-medium">Вопросов</th>
                  <th className="py-2 font-medium">Точность</th>
                  <th className="py-2 font-medium">Часы</th>
                </tr>
              </thead>
              <tbody>
                {weekly.map((r) => (
                  <tr key={r.label} className="border-b last:border-0">
                    <td className="py-2">{r.label}</td>
                    <td className="py-2 tabular">{r.questions}</td>
                    <td className="py-2 tabular">{r.accuracy === null ? '—' : `${r.accuracy}%`}</td>
                    <td className="py-2 tabular">{r.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular')}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </Card>
  );
}
