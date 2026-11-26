import { useMemo } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@/components/ui';
import { AchievementBadge, TIER_LABEL } from '@/components/AchievementUnlock';
import { ACHIEVEMENTS, LEVELS, LEVEL_RU, XP } from '@/data/gamification';
import { useAppStore } from '@/store/useAppStore';
import { useCoreStats, useWeeklyGoals } from '@/hooks/useStats';
import { useNavigate } from 'react-router-dom';
import { Lexi } from '@/components/lexi/Lexi';
import { fmtDate, fmtDateTime } from '@/lib/date';
import { cn, fmtNum } from '@/lib/utils';

export default function Achievements() {
  const unlocked = useAppStore((s) => s.achievements);
  const xpEvents = useAppStore((s) => s.xpEvents);
  const exams = useAppStore((s) => s.exams);
  const mistakes = useAppStore((s) => s.mistakes);
  const tasks = useAppStore((s) => s.tasks);
  const sessions = useAppStore((s) => s.sessions);
  const stats = useCoreStats();

  /** Прогресс к каждому достижению — из реальных данных. */
  const progress = useMemo<Record<string, [number, number]>>(
    () => ({
      'first-steps': [Math.min(1, sessions.length), 1],
      q100: [Math.min(100, stats.totalQuestions), 100],
      q500: [Math.min(500, stats.totalQuestions), 500],
      q1000: [Math.min(1000, stats.totalQuestions), 1000],
      streak7: [Math.min(7, stats.streak), 7],
      streak30: [Math.min(30, stats.streak), 30],
      perfect: [sessions.some((s) => s.answers.length >= 10 && s.answers.every((a) => a.correct)) ? 1 : 0, 1],
      exam1: [Math.min(1, exams.length), 1],
      exam10: [Math.min(10, exams.length), 10],
      mistakes10: [Math.min(10, mistakes.filter((m) => m.status === 'mastered').length), 10],
      'subject-complete': [0, 1],
      planner: [Math.min(20, tasks.filter((t) => t.done).length), 20],
      score100: [Math.min(100, stats.prediction.total), 100],
    }),
    [sessions, stats, exams, mistakes, tasks],
  );

  const count = Object.keys(unlocked).length;
  const lvl = stats.level;
  const weekly = useWeeklyGoals();
  const navigate = useNavigate();
  const milestones = [
    { label: 'Первые 50 вопросов', done: stats.totalQuestions >= 50, progress: stats.totalQuestions / 50 },
    { label: 'Первый пробный ЕНТ', done: exams.length >= 1, progress: exams.length },
    { label: 'Уровень 3 · Apprentice', done: lvl.current.index >= 3, progress: stats.xp / 2000 },
    { label: '1000 решённых вопросов', done: stats.totalQuestions >= 1000, progress: stats.totalQuestions / 1000 },
    { label: 'Серия 14 дней', done: stats.longestStreak >= 14, progress: stats.longestStreak / 14 },
    { label: `Прогноз ${Math.round(stats.prediction.max * 0.7)}+ баллов`, done: stats.prediction.total >= stats.prediction.max * 0.7, progress: stats.prediction.total / (stats.prediction.max * 0.7) },
    { label: 'Уровень 6 · Master', done: lvl.current.index >= 6, progress: stats.xp / 20000 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="brand-glow relative overflow-hidden p-6">
          <Lexi mood="graduate" size="md" className="absolute -right-2 -top-2 hidden opacity-95 sm:block" decorative />
          <div className="flex flex-wrap items-center gap-5">
            <div className="brand-gradient grid size-20 place-items-center rounded-3xl text-3xl font-semibold text-white">{lvl.current.index}</div>
            <div className="min-w-0 flex-1 sm:pr-28">
              <div className="text-xs text-muted-foreground">Текущий уровень</div>
              <div className="text-2xl font-semibold">
                {lvl.current.name} <span className="text-base font-normal text-muted-foreground">· {LEVEL_RU[lvl.current.name]}</span>
              </div>
              <div className="mt-3">
                <Progress value={lvl.progress * 100} className="h-2" indicatorClassName="bg-gradient-to-r from-primary to-violet" />
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular">
                  <span>{fmtNum(stats.xp)} XP</span>
                  <span>{lvl.next ? `${fmtNum(lvl.next.minXp)} XP — ${lvl.next.name}` : 'Максимум'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {LEVELS.map((l) => (
              <div key={l.index} className={cn('rounded-lg border p-2 text-center', l.index === lvl.current.index ? 'border-primary bg-primary/10' : l.index < lvl.current.index ? 'bg-secondary/60' : 'opacity-60')}>
                <div className="text-sm font-semibold">{l.index}</div>
                <div className="truncate text-[10px] text-muted-foreground">{l.name}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Как начисляется XP</CardTitle>
              <CardDescription>Опыт отражает реальную учебную работу</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ['Верный ответ', XP.correct],
              ['Бонус за сложный', XP.correctHardBonus],
              ['Завершённая сессия', XP.sessionComplete],
              ['Пробный экзамен', XP.examComplete],
              ['Ежедневная цель', XP.dailyTask],
              ['Ошибка освоена', XP.mistakeMastered],
              ['Задача из плана', XP.plannerTask],
              ['День серии', XP.streakDay],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between border-b border-dashed py-1">
                <span className="text-muted-foreground">{l}</span>
                <span className="font-medium tabular">+{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Цели недели</CardTitle>
              <CardDescription>Обновляются каждый понедельник · XP начисляется автоматически</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {weekly.map((g) => {
              const done = g.progress >= g.target;
              return (
                <button key={g.id} onClick={() => navigate(g.link)} className="block w-full text-left">
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className={cn(done && 'text-success')}>
                      {done && <Check className="mr-1 inline size-3.5" />}
                      {g.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular">
                      {g.progress}/{g.target} · +{g.xp} XP
                    </span>
                  </div>
                  <Progress value={(g.progress / g.target) * 100} className="h-1.5" indicatorClassName={done ? 'bg-success' : 'brand-gradient'} />
                </button>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Этапы пути</CardTitle>
              <CardDescription>Крупные вехи подготовки</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-3 border-l pl-5">
              {milestones.map((m) => (
                <li key={m.label} className="relative">
                  <span className={cn('absolute -left-[27px] top-0.5 grid size-4 place-items-center rounded-full border-2', m.done ? 'border-success bg-success text-white' : 'border-input bg-card')}>{m.done && <Check className="size-2.5" strokeWidth={4} />}</span>
                  <div className={cn('text-sm', m.done ? 'font-medium' : 'text-muted-foreground')}>{m.label}</div>
                  {!m.done && <Progress value={m.progress * 100} className="mt-1 h-1 max-w-56" />}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-base font-semibold">Достижения</h2>
          <span className="text-sm text-muted-foreground">
            {count} из {ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const date = unlocked[a.id];
            const [cur, max] = progress[a.id] ?? [0, 1];
            return (
              <Card key={a.id} className={cn('relative flex gap-4 overflow-hidden p-4 transition-colors', date ? '' : 'bg-card/60')}>
                {date && a.tier === 'gold' && <Lexi mood="perfect" size="xs" decorative className="absolute -bottom-1 -right-1 opacity-90" />}
                <AchievementBadge def={a} unlocked={!!date} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium', !date && 'text-muted-foreground')}>{a.title}</span>
                    <Badge variant="outline">{TIER_LABEL(a.tier)}</Badge>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{a.description}</p>
                  {date ? (
                    <p className="mt-2 text-xs text-success">Получено {fmtDate(date, { day: 'numeric', month: 'long', year: 'numeric' })} · +{a.xp} XP</p>
                  ) : (
                    <div className="mt-2">
                      <Progress value={(cur / max) * 100} className="h-1" />
                      <div className="mt-1 text-[11px] text-muted-foreground tabular">
                        {a.id === 'subject-complete' ? 'Освойте все темы любого предмета' : `${fmtNum(cur)} / ${fmtNum(max)}`} · +{a.xp} XP
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>История опыта</CardTitle>
            <CardDescription>Последние начисления XP</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-xl border">
            {[...xpEvents]
              .reverse()
              .slice(0, 15)
              .map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 text-sm">
                  <Sparkles className="size-4 text-violet" />
                  <span className="flex-1">{e.reason}</span>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(e.date)}</span>
                  <span className="w-16 text-right font-semibold tabular text-violet">+{fmtNum(e.amount)}</span>
                </div>
              ))}
            {xpEvents.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Пока нет начислений</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
