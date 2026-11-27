import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Check, ClipboardCheck, Clock, Flame, Gauge, MessageCircleHeart, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Progress, Segmented } from '@/components/ui';
import { ActivityHeatmap, ChartTooltip, CHART, Legend, RingProgress, axisProps } from '@/components/charts';
import { SubjectIcon } from '@/components/icons';
import { SmartAnalysis } from '@/components/SmartAnalysis';
import { Lexi, LexiBubble } from '@/components/lexi/Lexi';
import { useCoreStats, usePreparation, useTrackPrediction, useWeakTopics, useWeeklyGoals } from '@/hooks/useStats';
import { useAllQuestions, useAppStore } from '@/store/useAppStore';
import { useSession } from '@/store/session';
import { activityByDay, allRelevantSubjects, blockSubjects, subjectSummary, trackHistory } from '@/lib/analytics';
import { dailyGoals } from '@/lib/dailyGoals';
import { quickPractice } from '@/lib/practice';
import { lexiSay, type LexiContext } from '@/lib/lexi';
import { addDays, dayKey, daysBetween, fmtDate, fmtDuration, fromKey, greeting, WEEKDAYS_SHORT } from '@/lib/date';
import { LEVEL_RU } from '@/data/gamification';
import { SUBJECT_MAP, TOPIC_MAP, TRACKS, subjectsOf } from '@/data/subjects';
import { cn, fmtNum, pct, plural } from '@/lib/utils';
import { toast } from '@/store/toast';

export default function Dashboard() {
  const profile = useAppStore((s) => s.profile);
  const attempts = useAppStore((s) => s.attempts);
  const sessions = useAppStore((s) => s.sessions);
  const studyLog = useAppStore((s) => s.studyLog);
  const exams = useAppStore((s) => s.exams);
  const daily = useAppStore((s) => s.daily);
  const examFormat = useAppStore((s) => s.examFormat);
  const topicStatus = useAppStore((s) => s.topicStatus);
  const toggleDailyGoal = useAppStore((s) => s.toggleDailyGoal);
  const setPractice = useSession((s) => s.setPractice);
  const questions = useAllQuestions();
  const stats = useCoreStats();
  const prep = usePreparation();
  const weak = useWeakTopics(3);
  const weekly = useWeeklyGoals();
  const navigate = useNavigate();
  const tp = useTrackPrediction();
  const trackName = TRACKS.find((t) => t.id === tp.track)!.name;
  const [range, setRange] = useState<'12' | '26'>('26');

  const history = useMemo(() => trackHistory(tp.track, attempts, profile, Number(range), examFormat), [tp.track, attempts, profile, range, examFormat]);
  const activity = useMemo(() => activityByDay(attempts, studyLog), [attempts, studyLog]);
  const goals = useMemo(() => dailyGoals(profile, attempts, sessions), [profile, attempts, sessions]);
  const blocks = useMemo(() => {
    const byId = new Map(prep.subjects.map((s) => [s.subject, s]));
    if (tp.track !== 'ent') return subjectsOf(tp.track).map((s) => ({ key: s.id, subject: s.id, maxPoints: tp.track === 'sat' ? 800 : 9, label: s.name, questions: 0, summary: subjectSummary(s.id, attempts, questions, topicStatus) }));
    return blockSubjects(profile, examFormat).map((b) => ({ ...b, summary: byId.get(b.subject)! })).filter((b) => b.summary);
  }, [profile, examFormat, prep.subjects, tp.track, attempts, questions, topicStatus]);
  const last7 = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(new Date(), i - 6);
        const k = dayKey(d);
        return { label: WEEKDAYS_SHORT[(d.getDay() + 6) % 7], minutes: Math.round((studyLog[k] ?? 0) / 60), questions: activity[k]?.questions ?? 0 };
      }),
    [studyLog, activity],
  );
  const manual = daily.date === dayKey() ? daily.manual : {};
  const examDate = tp.trackProfile.examDate || (tp.track === 'ent' ? profile.examDate : '');
  const daysLeft = examDate ? daysBetween(new Date(), fromKey(examDate)) : 0;
  const gap = Math.round((tp.target - tp.prediction.value) * 10) / 10;
  const goalsDone = goals.filter((g) => g.progress >= g.target || manual[g.id]).length;
  const first = history[0]?.score;
  const delta = first !== undefined ? Math.round((tp.prediction.value - first) * 10) / 10 : 0;
  const recentExams = [...exams].reverse().slice(0, 4);

  // Реплика Lexi зависит от реальной ситуации ученика
  const lexiCtx: LexiContext =
    stats.todaySec >= profile.dailyGoalMin * 60 * 1.5
      ? 'rest'
      : daysLeft > 0 && daysLeft <= 30
        ? 'examSoon'
        : stats.streak >= 3
          ? 'greetingStreak'
          : new Date().getHours() < 12
            ? 'greetingMorning'
            : 'greeting';
  const line = useMemo(() => lexiSay(lexiCtx, new Date().getDate()), [lexiCtx]);
  const lexiText =
    lexiCtx === 'greetingStreak' ? `Серия ${stats.streak} ${plural(stats.streak, ['день', 'дня', 'дней'])} подряд — продолжаем! Сегодня тоже можно стать лучше.` : line.text;

  const startQuick = () => {
    const p = quickPractice(questions, attempts, allRelevantSubjects(profile, examFormat), weak.map((w) => w.topicId));
    if (!p) return toast.error('Нет вопросов', 'Добавьте вопросы в банк');
    setPractice(p);
    navigate('/practice/session');
  };

  return (
    <div className="space-y-6">
      {/* Приветствие Lexi */}
      <Card className="brand-glow relative overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:p-7">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>
                <Flame /> Серия {stats.streak} {plural(stats.streak, ['день', 'дня', 'дней'])}
              </Badge>
              {daysLeft > 0 && (
                <Badge variant="outline">
                  До {trackName} {daysLeft} {plural(daysLeft, ['день', 'дня', 'дней'])}
                </Badge>
              )}
              <Badge variant="violet">
                Ур. {stats.level.current.index} · {stats.level.current.name}
              </Badge>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-[30px]">
                {greeting()}, {profile.name}.
              </h2>
              <p className="mt-1.5 max-w-xl text-muted-foreground">Продолжай подготовку. Каждый тест приближает тебя к цели.</p>
            </div>
            <div className="max-w-xl rounded-2xl border bg-card/80 p-3.5 text-sm backdrop-blur sm:hidden">
              <span className="font-semibold text-violet">Lexi: </span>
              {lexiText}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={startQuick}>
                <Zap /> Быстрая практика
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate('/exams')}>
                <ClipboardCheck /> Пробный {trackName}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate('/assistant')}>
                <MessageCircleHeart /> Спросить Lexi
              </Button>
            </div>
          </div>
          <div className="hidden items-end gap-3 sm:flex lg:justify-end">
            <div className="relative mb-10 max-w-[230px] rounded-2xl border bg-card/90 p-3.5 text-sm shadow-sm backdrop-blur">
              <span className="absolute -right-[7px] bottom-6 size-3 rotate-45 border-r border-t bg-card" aria-hidden />
              <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-violet">Lexi</div>
              {lexiText}
            </div>
            <Lexi mood={line.mood} size="lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 border-t md:grid-cols-4">
          <HeroStat label={`Цель ${trackName}`} value={String(tp.target)} hint={`шкала ${tp.prediction.min}–${tp.prediction.max}`} />
          <div className="flex items-center gap-3 border-l p-4 md:p-5">
            <RingProgress value={(tp.prediction.value - tp.prediction.min) / Math.max(1, tp.target - tp.prediction.min)} size={56} stroke={6}>
              <span className="text-sm font-semibold tabular">{tp.prediction.value}</span>
            </RingProgress>
            <div>
              <div className="text-xs text-muted-foreground">{tp.prediction.label}</div>
              <div className={cn('text-sm font-medium', gap <= 0 ? 'text-success' : '')}>{gap <= 0 ? 'Цель достигнута' : tp.track === 'ielts' ? `ещё +${gap} band` : `ещё +${gap} ${plural(gap, ['балл', 'балла', 'баллов'])}`}</div>
              {!tp.prediction.enoughData && <div className="text-[11px] text-warning">мало данных</div>}
            </div>
          </div>
          <div className="border-t p-4 md:border-l md:border-t-0 md:p-5">
            <div className="text-xs text-muted-foreground">Готовность по темам</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-semibold tabular">{prep.progress}%</span>
              <span className="text-xs text-muted-foreground">
                {prep.completed}/{prep.total} тем освоено
              </span>
            </div>
            <Progress value={prep.progress} className="mt-2" indicatorClassName="brand-gradient" />
          </div>
          <HeroStat label="Время занятий" value={`${Math.round(stats.totalHours)} ч`} hint={`сегодня ${fmtDuration(stats.todaySec)}`} className="border-l border-t md:border-t-0" />
        </div>
      </Card>

      {/* Метрики */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Target} label="Решено вопросов" value={fmtNum(stats.totalQuestions)} hint={`сегодня ${stats.todayQuestions}`} />
        <StatCard icon={Gauge} label="Верных ответов" value={`${Math.round(stats.accuracy * 100)}%`} hint={`${fmtNum(stats.correct)} верно`} />
        <StatCard icon={Flame} label="Серия" value={`${stats.streak} дн.`} hint={`рекорд ${stats.longestStreak}`} />
        <StatCard icon={Clock} label="За неделю" value={`${stats.weekHours.toFixed(1)} ч`} hint={`план выполнен на ${stats.weeklyCompletion}%`} />
        <StatCard icon={Sparkles} label="Опыт" value={fmtNum(stats.xp)} hint="XP" />
        <Link to="/achievements" className="block">
          <Card className="card-hover h-full p-4">
            <div className="text-xs text-muted-foreground">Уровень</div>
            <div className="mt-2 text-xl font-semibold">
              {stats.level.current.index} · {stats.level.current.name}
            </div>
            <Progress value={stats.level.progress * 100} className="mt-2" indicatorClassName="brand-gradient" />
            <div className="mt-1.5 text-[11px] text-muted-foreground">{stats.level.next ? `${fmtNum(stats.level.toNext)} XP до «${LEVEL_RU[stats.level.next.name]}»` : 'Максимальный уровень'}</div>
          </Card>
        </Link>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{tp.prediction.label}: динамика</CardTitle>
              <CardDescription>
                По точности ответов в каждом блоке экзамена{' '}
                {delta !== 0 && (
                  <span className={delta > 0 ? 'text-success' : 'text-danger'}>
                    · {delta > 0 ? '+' : ''}
                    {delta} за период
                  </span>
                )}
              </CardDescription>
            </div>
            <Segmented size="sm" value={range} onChange={setRange} options={[{ value: '12', label: '3 мес' }, { value: '26', label: '6 мес' }]} />
          </CardHeader>
          <CardContent>
            <Legend items={[{ label: 'Прогноз', color: CHART.c1 }, { label: `Цель (${tp.target})`, color: CHART.c3, dashed: true }]} />
            <div className="mt-3 h-72">
              {history.length < 2 ? (
                <EmptyState icon={TrendingUp} lexi="reading" title="Пока мало данных" description="Реши ещё несколько вопросов, чтобы увидеть динамику прогноза." className="h-full py-4" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                    <YAxis domain={tp.track === 'ielts' ? [0, 9] : [Math.max(tp.prediction.min, Math.min(...history.map((h) => h.score)) - (tp.track === 'sat' ? 100 : 10)), tp.prediction.max]} {...axisProps} />
                    <Tooltip content={<ChartTooltip fmt={(v) => `${v} баллов`} />} />
                    <ReferenceLine y={tp.target} stroke={CHART.c3} strokeDasharray="5 4" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="score" name="Прогноз" stroke={CHART.c1} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Задачи на сегодня</CardTitle>
              <CardDescription>
                Выполнено {goalsDone} из {goals.length} · +20 XP за каждую
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {goalsDone === goals.length && <LexiBubble mood="graduate" text={lexiSay('dailyDone').text} tone="success" className="mb-2" />}
            {goals.map((g) => {
              const done = g.progress >= g.target || !!manual[g.id];
              const auto = g.progress >= g.target;
              return (
                <div key={g.id} className={cn('flex items-center gap-3 rounded-xl border p-3 transition-colors', done ? 'border-success/30 bg-success/5' : 'hover:border-primary/40')}>
                  <button
                    onClick={() => !auto && toggleDailyGoal(g.id)}
                    disabled={auto}
                    aria-label={done ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
                    aria-pressed={done}
                    className={cn('grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors', done ? 'border-success bg-success text-white' : 'border-input hover:border-primary')}
                  >
                    {done && <Check className="size-3.5" strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-sm font-medium', done && 'text-muted-foreground line-through')}>{g.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={(g.progress / g.target) * 100} className="h-1 w-20" indicatorClassName={done ? 'bg-success' : undefined} />
                      <span className="text-[11px] text-muted-foreground tabular">
                        {g.progress}/{g.target}
                      </span>
                    </div>
                  </div>
                  {!done && (
                    <Button size="icon-sm" variant="ghost" onClick={() => navigate(g.link)} aria-label={`Перейти: ${g.title}`}>
                      <ArrowRight />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Активность за неделю</CardTitle>
              <CardDescription>Минуты занятий по дням · цель {profile.dailyGoalMin} мин</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltip fmt={(v) => `${v} мин`} />} />
                  <ReferenceLine y={profile.dailyGoalMin} stroke={CHART.c3} strokeDasharray="4 4" />
                  <Bar dataKey="minutes" name="Занятия" fill={CHART.c1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {last7.reduce((s, d) => s + d.questions, 0)} вопросов за 7 дней · пунктир — дневная цель
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Цели недели</CardTitle>
              <CardDescription>XP начисляется автоматически при выполнении</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {weekly.map((g) => {
              const done = g.progress >= g.target;
              return (
                <button key={g.id} onClick={() => navigate(g.link)} className="block w-full text-left">
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className={cn('truncate', done && 'text-success')}>
                      {done && <Check className="mr-1 inline size-3.5" />}
                      {g.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular">
                      {g.progress}/{g.target} · +{g.xp} XP
                    </span>
                  </div>
                  <Progress value={pct(g.progress, g.target)} className="h-1.5" indicatorClassName={done ? 'bg-success' : 'brand-gradient'} />
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Последние экзамены</CardTitle>
              <CardDescription>Результаты пробных ЕНТ</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/exams')}>
              Все <ArrowRight />
            </Button>
          </CardHeader>
          <CardContent>
            {recentExams.length === 0 ? (
              <EmptyState icon={ClipboardCheck} lexi="exam" title="Экзаменов пока нет" description={`Пройди первый пробный ${trackName}.`} action={<Button size="sm" onClick={() => navigate('/exams')}>Начать</Button>} className="py-6" />
            ) : (
              <div className="space-y-2">
                {recentExams.map((e) => {
                  const p = pct(e.score, e.maxScore);
                  return (
                    <Link key={e.id} to={`/exams/${e.id}`} className="flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:border-primary/40">
                      <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular', p >= 75 ? 'bg-success/15 text-success' : p >= 50 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger')}>{p}%</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.config.title}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(e.finishedAt, { day: 'numeric', month: 'short' })}</span>
                      </span>
                      <span className="text-sm font-semibold tabular">
                        {e.score}
                        <span className="text-xs font-normal text-muted-foreground">/{e.maxScore}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{tp.track === 'ent' ? 'Успеваемость по предметам ЕНТ' : `Разделы ${trackName}`}</CardTitle>
              <CardDescription>Блоки экзамена и выбранные профильные предметы</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')}>
              Все предметы <ArrowRight />
            </Button>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {blocks.map((b) => (
              <Link key={b.key} to={`/subjects/${b.subject}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 border-t px-5 py-3.5 transition-colors hover:bg-secondary/50 sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                <SubjectIcon subject={b.subject} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{SUBJECT_MAP[b.subject].name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {fmtNum(b.summary.attempts)} отв. · {b.summary.level}
                    {b.summary.weakest && ` · слабая: ${b.summary.weakest.name}`}
                  </div>
                </div>
                <div className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto">
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Темы</span>
                    <span className="tabular">{b.summary.progress}%</span>
                  </div>
                  <Progress value={b.summary.progress} className="h-1.5" />
                </div>
                <span className={cn('col-start-3 row-start-1 text-right text-sm font-semibold tabular sm:col-start-auto sm:row-start-auto', b.summary.accuracy >= 0.75 ? 'text-success' : b.summary.accuracy >= 0.55 ? '' : 'text-danger')}>
                  {b.summary.attempts ? `${Math.round(b.summary.accuracy * 100)}%` : '—'}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-violet/30">
          <CardHeader>
            <div>
              <CardTitle>Рекомендуемые темы</CardTitle>
              <CardDescription>Рассчитано по твоим ответам</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {weak.length === 0 ? (
              <LexiBubble mood="default" text="Слабых тем не найдено — во всех темах с достаточной статистикой точность выше 70%. Отлично!" tone="success" />
            ) : (
              <>
                <LexiBubble mood="confident" text={lexiSay('recommend', 1).text} tone="violet" size="xs" />
                {weak.map((w) => (
                  <div key={w.topicId} className="rounded-xl border p-3">
                    <div className="flex items-center gap-2">
                      <SubjectIcon subject={w.subject} className="size-7" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{TOPIC_MAP[w.topicId]?.name}</span>
                      <Badge variant={w.accuracy < 0.5 ? 'danger' : 'warning'}>{Math.round(w.accuracy * 100)}%</Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{TOPIC_MAP[w.topicId]?.advice}</p>
                    <Button size="sm" variant="link" className="mt-1" onClick={() => navigate(`/practice?subject=${w.subject}&topic=${w.topicId}&count=${Math.min(20, w.recommendedCount)}`)}>
                      Решить {Math.min(20, w.recommendedCount)} вопросов <ArrowRight />
                    </Button>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <SmartAnalysis compact />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Активность за 12 месяцев</CardTitle>
            <CardDescription>Интенсивность цвета — время занятий в день</CardDescription>
          </div>
          <Badge variant="outline">
            <TrendingUp /> {stats.activeDays} дн. с занятиями
          </Badge>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap data={activity} />
        </CardContent>
      </Card>
    </div>
  );
}

function HeroStat({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={cn('p-4 md:p-5', className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-2 text-xl font-semibold tabular sm:text-2xl">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}
