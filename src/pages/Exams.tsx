import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BookOpen, ClipboardCheck, Clock, FileText, Headphones, Info, Layers, PenLine, Play, Settings2, Sigma } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, EmptyState, Input, Label, Segmented, Select } from '@/components/ui';
import { ChartTooltip, CHART, axisProps } from '@/components/charts';
import { SubjectIcon } from '@/components/icons';
import { LexiBubble } from '@/components/lexi/Lexi';
import { useAllQuestions, useAppStore } from '@/store/useAppStore';
import { useSession } from '@/store/session';
import { SUBJECT_MAP, TRACKS, formatMax, subjectsOf } from '@/data/subjects';
import { planEntFull, planIelts, planSat, planSimple, type ExamPlan } from '@/lib/exam';
import { useTrack } from '@/hooks/useTrack';
import { fmtDate, fmtDateTime, fmtDuration } from '@/lib/date';
import { cn, pct, plural } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { ExamConfig, SubjectId, Track } from '@/types';

type Preset = string;

const PRESETS: Record<Track, { id: Preset; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }[]> = {
  ent: [
    { id: 'full', icon: ClipboardCheck, title: 'Полный пробный ЕНТ', desc: '120 заданий · 240 минут · 140 баллов, по регламенту' },
    { id: 'profile', icon: Layers, title: 'Профильные предметы', desc: '2 × 40 заданий по составу ЕНТ' },
    { id: 'subject', icon: FileText, title: 'Предметный пробник', desc: 'Один предмет, выбранное число заданий' },
    { id: 'custom', icon: Settings2, title: 'Свой вариант', desc: 'Любые предметы, количество и время' },
  ],
  sat: [
    { id: 'full', icon: ClipboardCheck, title: 'Full Digital SAT', desc: '98 вопросов · 4 модуля · 2 ч 14 мин + перерыв' },
    { id: 'rw', icon: BookOpen, title: 'Reading and Writing', desc: '2 модуля × 27 вопросов, по 32 минуты' },
    { id: 'math', icon: Sigma, title: 'Math', desc: '2 модуля × 22 вопроса, по 35 минут' },
  ],
  ielts: [
    { id: 'full', icon: ClipboardCheck, title: 'IELTS Academic', desc: 'Listening + Reading + Writing (≈2 ч 30 мин)' },
    { id: 'listening', icon: Headphones, title: 'Listening', desc: '4 части · 40 вопросов · озвучка' },
    { id: 'reading', icon: BookOpen, title: 'Reading', desc: '3 текста · 40 вопросов · 60 минут' },
    { id: 'writing', icon: PenLine, title: 'Writing', desc: 'Task 1 + Task 2 · 60 минут' },
  ],
};

export default function Exams() {
  const navigate = useNavigate();
  const questions = useAllQuestions();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const exams = useAppStore((s) => s.exams);
  const examFormat = useAppStore((s) => s.examFormat);
  const activeExam = useSession((s) => s.exam);
  const setExam = useSession((s) => s.setExam);
  const track = useTrack();
  const available = (s: SubjectId) => questions.filter((q) => q.subject === s && q.type !== 'essay').length;

  const [preset, setPreset] = useState<Preset>('full');
  const [subject, setSubject] = useState<SubjectId>(profile.profileSubjects[0]);
  const [subjectCount, setSubjectCount] = useState(20);
  const [custom, setCustom] = useState<Record<string, number>>({ history: 10, [profile.profileSubjects[0]]: 10 });
  const [customTime, setCustomTime] = useState(40);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const setTrack = (t: Track) => {
    updateProfile({ activeTrack: t });
    setPreset('full');
  };

  const plan: ExamPlan | null = useMemo(() => {
    if (track === 'sat') return planSat(questions, preset === 'rw' ? 'rw' : preset === 'math' ? 'math' : 'full');
    if (track === 'ielts') return planIelts(questions, (['listening', 'reading', 'writing'].includes(preset) ? preset : 'full') as 'full');
    if (preset === 'full') return planEntFull(examFormat, profile.profileSubjects, questions);
    if (preset === 'profile') {
      const blocks = examFormat.blocks.filter((b) => b.slot !== 'fixed');
      return planEntFull({ ...examFormat, blocks, totalMinutes: Math.round((examFormat.totalMinutes * blocks.reduce((s, b) => s + b.questions, 0)) / examFormat.blocks.reduce((s, b) => s + b.questions, 0)) }, profile.profileSubjects, questions);
    }
    let config: ExamConfig;
    if (preset === 'subject') {
      const n = Math.min(subjectCount, available(subject));
      config = { title: `Пробник: ${SUBJECT_MAP[subject].name}`, kind: 'subject', sections: [{ subject, count: n, maxPoints: n }], timeLimitMin: Math.max(5, Math.round(n * 2)), track: 'ent', scoring: 'flat' };
    } else {
      const sections = Object.entries(custom)
        .filter(([, n]) => n > 0)
        .map(([s, n]) => ({ subject: s as SubjectId, count: Math.min(n, available(s as SubjectId)), maxPoints: Math.min(n, available(s as SubjectId)) }));
      config = { title: 'Свой вариант', kind: 'custom', sections, timeLimitMin: customTime, track: 'ent', scoring: 'flat' };
    }
    return config.sections.length ? planSimple(config, questions) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, preset, subject, subjectCount, custom, customTime, questions, examFormat, profile.profileSubjects]);

  const totalQ = plan ? plan.config.sections.reduce((s, x) => s + x.count, 0) : 0;
  const scale = TRACKS.find((t) => t.id === track)!.scale;

  const begin = () => {
    if (!plan || !totalQ) return;
    const p = { ...plan, modules: plan.modules.map((m) => ({ ...m })) };
    setExam({ config: p.config, modules: p.modules, moduleIndex: 0, current: 0, answers: {}, flagged: [], startedAt: new Date().toISOString(), deadline: Date.now() + p.modules[0].timeLimitSec * 1000, breakUntil: null, shortened: p.shortened });
    try {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } catch {
      /* полноэкранный режим недоступен */
    }
    navigate('/exams/session');
  };

  const start = () => (activeExam ? setConfirmReplace(true) : begin());

  const trackExams = exams.filter((e) => (e.config.track ?? 'ent') === track);
  const history = [...trackExams].reverse();
  const chartData = trackExams.slice(-10).map((e) => ({ label: fmtDate(e.finishedAt), pct: pct(e.score, e.maxScore) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={track} onChange={setTrack} options={TRACKS.map((t) => ({ value: t.id, label: t.name }))} />
        <span className="text-sm text-muted-foreground">Шкала: {scale}</span>
      </div>

      {activeExam && (
        <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="text-sm font-medium">Незавершённый экзамен: {activeExam.config.title}</div>
            <div className="text-xs text-muted-foreground">
              Часть {activeExam.moduleIndex + 1} из {activeExam.modules.length} · таймер продолжает идти
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => (setExam(null), toast.info('Экзамен отменён'))}>
              Отменить
            </Button>
            <Button size="sm" onClick={() => navigate('/exams/session')}>
              <Play /> Вернуться
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Формат</CardTitle>
                <CardDescription>Таймер по частям, навигация, флажки, автосдача, разбор каждого вопроса</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {PRESETS[track].map(({ id, icon: Icon, title, desc }) => (
                <button key={id} onClick={() => setPreset(id)} className={cn('flex items-start gap-3 rounded-xl border p-4 text-left transition-colors', preset === id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:border-primary/40')}>
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', preset === id ? 'brand-gradient text-white' : 'bg-secondary text-muted-foreground')}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          {track === 'ent' && preset === 'subject' && (
            <Card>
              <CardHeader>
                <CardTitle>Настройки пробника</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="exam-subj">Предмет</Label>
                  <Select id="exam-subj" value={subject} onChange={(e) => setSubject(e.target.value as SubjectId)}>
                    {subjectsOf('ent').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({available(s.id)})
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Количество заданий</Label>
                  <Segmented value={String(subjectCount)} onChange={(v) => setSubjectCount(Number(v))} options={[10, 20, 30, 40].map((n) => ({ value: String(n), label: String(n) }))} />
                </div>
              </CardContent>
            </Card>
          )}

          {track === 'ent' && preset === 'custom' && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Свой вариант</CardTitle>
                  <CardDescription>Число заданий по каждому предмету (0 — не включать)</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {subjectsOf('ent').map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                      <SubjectIcon subject={s.id} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">доступно {available(s.id)}</div>
                      </div>
                      <Input type="number" min={0} max={available(s.id)} value={custom[s.id] ?? 0} onChange={(e) => setCustom({ ...custom, [s.id]: Math.max(0, Math.min(available(s.id), Math.floor(Number(e.target.value) || 0))) })} className="h-9 w-20 text-center tabular" aria-label={`Заданий: ${s.name}`} />
                    </div>
                  ))}
                </div>
                <div className="max-w-xs">
                  <Label htmlFor="custom-time">Лимит времени (мин)</Label>
                  <Input id="custom-time" type="number" min={5} max={300} value={customTime} onChange={(e) => setCustomTime(Math.max(5, Math.min(300, Math.floor(Number(e.target.value) || 5))))} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="flex gap-3 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              {track === 'ent' &&
                `Формат «${examFormat.name}»: ${examFormat.blocks.reduce((n, b) => n + b.questions, 0)} заданий, ${examFormat.totalMinutes} мин, максимум ${formatMax(examFormat)} баллов. В профильных предметах: 25 заданий с одним ответом и 5 контекстных (по 1 баллу), 5 на соответствие и 5 с несколькими ответами (по 2 балла; при одной ошибке — 1 балл). Формат меняется в админ-панели.`}
              {track === 'sat' && 'Digital SAT: два раздела по два модуля. Второй модуль адаптивный: он сложнее, если в первом вы ответили верно на 60% и больше. Между разделами — перерыв 10 минут. Итоговый балл приблизительный: официальная шкала College Board рассчитывается методом IRT.'}
              {track === 'ielts' && 'Listening озвучивается синтезатором речи браузера; запись можно прослушать один раз. Reading — 3 текста. Writing оценивается ИИ (если он подключён) или по критериям самооценки. Перевод сырых баллов в band — по распространённым таблицам.'}
            </p>
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{plan?.config.title ?? 'Экзамен'}</CardTitle>
                <CardDescription>Структура</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan?.modules.length && plan.modules.length > 1 ? (
                <ol className="space-y-2">
                  {plan.modules.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 text-sm">
                      <SubjectIcon subject={m.subject} className="size-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{m.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.questionIds.length || (m.subject === 'sat-rw' ? 27 : 22)} {m.subject.startsWith('ielts-w') ? 'задания' : 'вопросов'}
                          {m.questionIds.length === 0 && ' · адаптивный'}
                          {m.breakBeforeSec ? ' · после перерыва' : ''}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular">{Math.round(m.timeLimitSec / 60)} мин</span>
                    </li>
                  ))}
                </ol>
              ) : (
                plan?.config.sections.map((s) => (
                  <div key={s.subject} className="flex items-center gap-3">
                    <SubjectIcon subject={s.subject} className="size-8" />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="truncate font-medium">{SUBJECT_MAP[s.subject].name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.count} {plural(s.count, ['задание', 'задания', 'заданий'])}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular">{s.maxPoints} б.</span>
                  </div>
                ))
              )}
              {plan?.shortened && <p className="rounded-lg bg-warning/10 p-2.5 text-xs text-warning">{plan.shortened}</p>}
              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                <div>
                  <div className="text-lg font-semibold tabular">{track === 'sat' ? (preset === 'full' ? 98 : preset === 'rw' ? 54 : 44) : totalQ}</div>
                  <div className="text-[11px] text-muted-foreground">вопросов</div>
                </div>
                <div>
                  <div className="text-lg font-semibold tabular">{plan ? Math.round(plan.config.timeLimitMin) : 0}</div>
                  <div className="text-[11px] text-muted-foreground">минут</div>
                </div>
                <div>
                  <div className="text-lg font-semibold tabular">{track === 'ent' ? plan?.config.sections.reduce((s, x) => s + x.maxPoints, 0) : track === 'sat' ? (preset === 'full' ? 1600 : 800) : '9.0'}</div>
                  <div className="text-[11px] text-muted-foreground">максимум</div>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={start} disabled={!plan || !totalQ}>
                <Play /> Начать экзамен
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">Откроется полноэкранный режим. По истечении времени часть сдаётся автоматически.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>История: {TRACKS.find((t) => t.id === track)!.name}</CardTitle>
              <CardDescription>
                {trackExams.length} {plural(trackExams.length, ['экзамен', 'экзамена', 'экзаменов'])}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <EmptyState icon={ClipboardCheck} lexi="exam" title="Экзаменов пока нет" description="Пройдите первый пробный экзамен — результаты и разбор появятся здесь." />
            ) : (
              <div className="divide-y rounded-xl border">
                {history.map((e) => {
                  const p = pct(e.score, e.maxScore);
                  return (
                    <button key={e.id} onClick={() => navigate(`/exams/${e.id}`)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/40">
                      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold tabular', p >= 75 ? 'bg-success/15 text-success' : p >= 50 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger')}>{e.scaled ? e.scaled.value : `${p}%`}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.config.title}</span>
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {fmtDateTime(e.finishedAt)} · <Clock className="size-3" /> {fmtDuration(e.durationSec)}
                          {e.autoSubmitted && <Badge variant="warning">автосдача</Badge>}
                        </span>
                      </span>
                      <span className="hidden text-sm font-semibold tabular sm:block">
                        {e.score} / {e.maxScore}
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Динамика результатов</CardTitle>
              <CardDescription>% от максимума, последние 10</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <LexiBubble mood="exam" text="Здесь появится график твоих пробных экзаменов. Удачи!" size="xs" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis domain={[0, 100]} {...axisProps} />
                    <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltip fmt={(v) => `${v}%`} />} />
                    <Bar dataKey="pct" name="Результат" fill={CHART.c1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog open={confirmReplace} onClose={() => setConfirmReplace(false)} title="Начать новый экзамен?" description="Незавершённый экзамен будет отменён без сохранения результата." confirmLabel="Начать новый" danger onConfirm={begin} />
    </div>
  );
}
