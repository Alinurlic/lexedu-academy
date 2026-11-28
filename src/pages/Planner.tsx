import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Copy, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, Dialog, EmptyState, FieldError, Input, Label, Progress, Segmented, Select } from '@/components/ui';
import { ChartTooltip, CHART, axisProps } from '@/components/charts';
import { SubjectIcon } from '@/components/icons';
import { useAppStore } from '@/store/useAppStore';
import { SUBJECTS, SUBJECT_MAP } from '@/data/subjects';
import { taskFormSchema } from '@/lib/schemas';
import { addDays, dayKey, fmtDate, fromKey, startOfWeek, WEEKDAYS_FULL, WEEKDAYS_SHORT, weekDays } from '@/lib/date';
import { cn, pct } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Priority, StudyTask, SubjectId, TaskKind } from '@/types';
import { tr } from '@/i18n';

const KIND_LABEL: Record<TaskKind, { label: string; unit: string }> = {
  questions: { get label() {
    return tr('Вопросы');
  }, get unit() {
    return tr('вопр.');
  } },
  topics: { get label() {
    return tr('Темы');
  }, get unit() {
    return tr('тем');
  } },
  minutes: { get label() {
    return tr('Время');
  }, get unit() {
    return tr('мин');
  } },
  custom: { get label() {
    return tr('Другое');
  }, get unit() {
    return tr('шаг.');
  } },
};
const PRIORITY: Record<Priority, { label: string; variant: 'danger' | 'warning' | 'secondary'; order: number }> = {
  high: { get label() {
    return tr('Высокий');
  }, variant: 'danger', order: 0 },
  medium: { get label() {
    return tr('Средний');
  }, variant: 'warning', order: 1 },
  low: { get label() {
    return tr('Низкий');
  }, variant: 'secondary', order: 2 },
};

export default function Planner() {
  const [params] = useSearchParams();
  const tasks = useAppStore((s) => s.tasks);
  const studyLog = useAppStore((s) => s.studyLog);
  const profile = useAppStore((s) => s.profile);
  const toggleTaskRaw = useAppStore((s) => s.toggleTask);
  const toggleTask = (id: string) => {
    const t = useAppStore.getState().tasks.find((x) => x.id === id);
    toggleTaskRaw(id);
    if (t && !t.done) toast.xp(tr('Ты молодец! Ещё один шаг к цели.'), tr('«{0}» выполнено · +15 XP', t.title));
  };
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const addTask = useAppStore((s) => s.addTask);

  const initialDate = params.get('date') ?? dayKey();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(fromKey(initialDate)));
  const [selected, setSelected] = useState(initialDate);
  const [editing, setEditing] = useState<StudyTask | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<StudyTask | null>(null);
  const [view, setView] = useState<'day' | 'week'>('day');

  useEffect(() => {
    const d = params.get('date');
    if (d) {
      setSelected(d);
      setWeekStart(startOfWeek(fromKey(d)));
    }
  }, [params]);

  const days = weekDays(weekStart);
  const dayKeys = days.map((d) => dayKey(d));
  const weekTasks = tasks.filter((t) => dayKeys.includes(t.date));
  const doneCount = weekTasks.filter((t) => t.done).length;
  const sortTasks = (arr: StudyTask[]) => [...arr].sort((a, b) => Number(a.done) - Number(b.done) || PRIORITY[a.priority].order - PRIORITY[b.priority].order || (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  const dayTasks = sortTasks(tasks.filter((t) => t.date === selected));

  const chart = useMemo(
    () =>
      days.map((d, i) => {
        const k = dayKey(d);
        const tt = tasks.filter((t) => t.date === k);
        return { label: WEEKDAYS_SHORT[i], minutes: Math.round((studyLog[k] ?? 0) / 60), done: tt.filter((t) => t.done).length, total: tt.length };
      }),
    [days, tasks, studyLog],
  );
  const weekMinutes = chart.reduce((s, c) => s + c.minutes, 0);
  const goalMinutes = profile.dailyGoalMin * 7;
  const bySubject = useMemo(() => {
    const m = new Map<SubjectId | 'none', { total: number; done: number }>();
    for (const t of weekTasks) {
      const k = t.subject ?? 'none';
      const e = m.get(k) ?? { total: 0, done: 0 };
      e.total++;
      if (t.done) e.done++;
      m.set(k, e);
    }
    return [...m.entries()];
  }, [weekTasks]);

  const copyPrevWeek = () => {
    const prevKeys = weekDays(addDays(weekStart, -7)).map((d) => dayKey(d));
    const prev = tasks.filter((t) => prevKeys.includes(t.date));
    if (!prev.length) return toast.info(tr('Прошлая неделя пуста'), tr('Нечего копировать'));
    prev.forEach((t) => addTask({ title: t.title, date: dayKey(addDays(fromKey(t.date), 7)), subject: t.subject, kind: t.kind, target: t.target, priority: t.priority, startTime: t.startTime }));
    toast.success(tr('Скопировано задач: {0}', prev.length));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={tr('Предыдущая неделя')}>
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={tr('Следующая неделя')}>
            <ChevronRight />
          </Button>
        </div>
        <div className="text-[15px] font-semibold">
          {fmtDate(days[0], { day: 'numeric', month: 'long' })} — {fmtDate(days[6], { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <Button variant="ghost" size="sm" onClick={() => (setWeekStart(startOfWeek()), setSelected(dayKey()))}>
          {tr('Сегодня')}
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'day', label: tr('День') }, { value: 'week', label: tr('Неделя') }]} />
          <Button variant="secondary" size="sm" onClick={copyPrevWeek}>
            <Copy /> {tr('Скопировать прошлую неделю')}
          </Button>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> {tr('Задача')}
          </Button>
        </div>
      </div>

      {/* Полоса дней */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((d, i) => {
          const k = dayKeys[i];
          const tt = tasks.filter((t) => t.date === k);
          const done = tt.filter((t) => t.done).length;
          const isToday = k === dayKey();
          return (
            <button
              key={k}
              onClick={() => (setSelected(k), setView('day'))}
              className={cn('rounded-xl border p-2 text-center transition-colors sm:p-3', selected === k && view === 'day' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:border-primary/40', isToday && 'border-primary/50')}
            >
              <div className={cn('text-[11px] font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>{WEEKDAYS_SHORT[i]}</div>
              <div className="text-lg font-semibold tabular">{d.getDate()}</div>
              <div className="mt-1 hidden text-[11px] text-muted-foreground sm:block">{tt.length ? `${done}/${tt.length}` : '—'}</div>
              {tt.length > 0 && <Progress value={pct(done, tt.length)} className="mt-1.5 h-1" indicatorClassName="bg-success" />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div>
          {view === 'day' ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{capitalize(fmtDate(fromKey(selected), { weekday: 'long', day: 'numeric', month: 'long' }))}</CardTitle>
                  <CardDescription>
                    {tr('{0} · занятий {1} мин', dayTasks.length ? tr('Выполнено {0} из {1}', dayTasks.filter((t) => t.done).length, dayTasks.length) : tr('Задач нет'), Math.round((studyLog[selected] ?? 0) / 60))}
                  </CardDescription>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
                  <Plus /> {tr('Добавить')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayTasks.length === 0 ? (
                  <EmptyState icon={CalendarDays} lexi="resting" title={tr('На этот день задач нет')} description={tr('Запланируйте занятия: предмет, объём и приоритет.')} action={<Button onClick={() => setEditing('new')}>{tr('Создать задачу')}</Button>} />
                ) : (
                  dayTasks.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggleTask(t.id)} onEdit={() => setEditing(t)} onDelete={() => setToDelete(t)} onStep={(d) => updateTask(t.id, { progress: Math.max(0, Math.min(t.target, t.progress + d)) })} />)
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {days.map((d, i) => {
                const k = dayKeys[i];
                const tt = sortTasks(tasks.filter((t) => t.date === k));
                return (
                  <Card key={k} className={cn(k === dayKey() && 'border-primary/50')}>
                    <CardHeader className="pb-2">
                      <div>
                        <CardTitle>{WEEKDAYS_FULL[i]}</CardTitle>
                        <CardDescription>{fmtDate(d, { day: 'numeric', month: 'long' })}</CardDescription>
                      </div>
                      <Button size="icon-sm" variant="ghost" onClick={() => (setSelected(k), setEditing('new'))} aria-label={tr('Добавить задачу на {0}', WEEKDAYS_FULL[i])}>
                        <Plus />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {tt.length === 0 && <p className="text-sm text-muted-foreground">{tr('Свободный день')}</p>}
                      {tt.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-sm">
                          <button onClick={() => toggleTask(t.id)} aria-label={t.done ? tr('Снять отметку') : tr('Отметить выполненной')} className={cn('grid size-5 shrink-0 place-items-center rounded border-2', t.done ? 'border-success bg-success text-white' : 'border-input')}>
                            {t.done && <Check className="size-3" strokeWidth={3} />}
                          </button>
                          <button onClick={() => setEditing(t)} className={cn('min-w-0 flex-1 truncate text-left hover:text-primary', t.done && 'text-muted-foreground line-through')}>
                            {t.title}
                          </button>
                          <span className={cn('size-1.5 shrink-0 rounded-full', t.priority === 'high' ? 'bg-danger' : t.priority === 'medium' ? 'bg-warning' : 'bg-muted-foreground/40')} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{tr('Цели недели')}</CardTitle>
                <CardDescription>{tr('Прогресс по задачам и времени')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{tr('Задачи')}</span>
                  <span className="tabular text-muted-foreground">
                    {doneCount}/{weekTasks.length} · {pct(doneCount, weekTasks.length)}%
                  </span>
                </div>
                <Progress value={pct(doneCount, weekTasks.length)} indicatorClassName="bg-success" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{tr('Время занятий')}</span>
                  <span className="tabular text-muted-foreground">
                    {tr('{0} / {1} ч', Math.round(weekMinutes / 6) / 10, Math.round(goalMinutes / 6) / 10)}
                  </span>
                </div>
                <Progress value={pct(weekMinutes, goalMinutes)} />
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltip fmt={(v) => tr('{0} мин', v)} />} />
                    <Bar dataKey="minutes" name={tr('Занятия')} fill={CHART.c1} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground">{tr('Минуты занятий по дням. Цель — {0} мин в день (меняется в настройках).', profile.dailyGoalMin)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{tr('По предметам')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bySubject.length === 0 && <p className="text-sm text-muted-foreground">{tr('На этой неделе задач нет')}</p>}
              {bySubject.map(([s, v]) => (
                <div key={s} className="flex items-center gap-3">
                  {s === 'none' ? <span className="grid size-8 place-items-center rounded-lg bg-secondary"><Clock className="size-4 text-muted-foreground" /></span> : <SubjectIcon subject={s} className="size-8" />}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="truncate">{s === 'none' ? tr('Общие') : SUBJECT_MAP[s].name}</span>
                      <span className="tabular text-muted-foreground">
                        {v.done}/{v.total}
                      </span>
                    </div>
                    <Progress value={pct(v.done, v.total)} className="h-1" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskDialog
        open={editing !== null}
        task={editing === 'new' ? null : editing}
        defaultDate={selected}
        onClose={() => setEditing(null)}
        onSave={(data) => {
          if (editing && editing !== 'new') {
            updateTask(editing.id, { ...data, progress: Math.min(editing.progress, data.target), done: editing.progress >= data.target ? true : editing.done && editing.target === data.target });
            toast.success(tr('Задача обновлена'));
          } else {
            addTask(data);
            toast.success(tr('Задача добавлена'), fmtDate(fromKey(data.date), { weekday: 'long', day: 'numeric', month: 'long' }));
          }
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title={tr('Удалить задачу?')}
        description={toDelete?.title}
        confirmLabel={tr('Удалить')}
        onConfirm={() => {
          if (toDelete) {
            deleteTask(toDelete.id);
            toast.success(tr('Задача удалена'));
          }
        }}
      />
    </div>
  );
}

function TaskRow({ t, onToggle, onEdit, onDelete, onStep }: { t: StudyTask; onToggle: () => void; onEdit: () => void; onDelete: () => void; onStep: (d: number) => void }) {
  const unit = KIND_LABEL[t.kind].unit;
  const step = t.kind === 'questions' ? 5 : t.kind === 'minutes' ? 10 : 1;
  return (
    <div className={cn('group flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors sm:flex-nowrap', t.done ? 'bg-success/5 border-success/30' : 'hover:border-primary/40')}>
      <button onClick={onToggle} aria-label={t.done ? tr('Снять отметку') : tr('Отметить выполненной')} aria-pressed={t.done} className={cn('grid size-6 shrink-0 place-items-center rounded-md border-2', t.done ? 'border-success bg-success text-white' : 'border-input hover:border-primary')}>
        {t.done && <Check className="size-3.5" strokeWidth={3} />}
      </button>
      {t.subject ? <SubjectIcon subject={t.subject} className="size-8" /> : <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary"><CalendarDays className="size-4 text-muted-foreground" /></span>}
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-medium', t.done && 'text-muted-foreground line-through')}>{t.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={PRIORITY[t.priority].variant}>{PRIORITY[t.priority].label}</Badge>
          {t.startTime && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" /> {t.startTime}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground tabular">
            {t.progress}/{t.target} {unit}
          </span>
          <Progress value={pct(t.progress, t.target)} className="h-1 w-16" indicatorClassName="bg-success" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={() => onStep(-step)} disabled={t.progress <= 0} aria-label={tr('Уменьшить прогресс')}>
          <Minus />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onStep(step)} disabled={t.progress >= t.target} aria-label={tr('Добавить {0} {1}', step, unit)}>
          <Plus />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={tr('Редактировать')}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={tr('Удалить')}>
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

type TaskData = Omit<StudyTask, 'id' | 'createdAt' | 'progress' | 'done'>;

function TaskDialog({ open, task, defaultDate, onClose, onSave }: { open: boolean; task: StudyTask | null; defaultDate: string; onClose: () => void; onSave: (d: TaskData) => void }) {
  const [form, setForm] = useState({ title: '', date: defaultDate, subject: '' as SubjectId | '', kind: 'questions' as TaskKind, target: '20', priority: 'medium' as Priority, startTime: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      task
        ? { title: task.title, date: task.date, subject: task.subject ?? '', kind: task.kind, target: String(task.target), priority: task.priority, startTime: task.startTime ?? '' }
        : { title: '', date: defaultDate, subject: '', kind: 'questions', target: '20', priority: 'medium', startTime: '' },
    );
  }, [open, task, defaultDate]);

  const autoTitle = () => {
    if (form.title.trim()) return form.title;
    const subj = form.subject ? SUBJECT_MAP[form.subject].name : tr('Занятие');
    return `${subj} — ${form.target} ${KIND_LABEL[form.kind].unit}`;
  };

  const save = () => {
    const payload = { title: autoTitle(), date: form.date, subject: form.subject || undefined, kind: form.kind, target: Number(form.target), priority: form.priority, startTime: form.startTime };
    const res = taskFormSchema.safeParse(payload);
    if (!res.success) {
      const e: Record<string, string> = {};
      for (const i of res.error.issues) e[String(i.path[0])] ??= tr(i.message);
      setErrors(e);
      return;
    }
    onSave({ ...res.data, startTime: res.data.startTime || undefined });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? tr('Редактировать задачу') : tr('Новая задача')}
      description={tr('Например: «Математика — 40 вопросов» или «История — 30 минут»')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tr('Отмена')}
          </Button>
          <Button onClick={save}>{task ? tr('Сохранить') : tr('Добавить')}</Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="t-subj">{tr('Предмет')}</Label>
            <Select id="t-subj" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value as SubjectId | '' })}>
              <option value="">{tr('Без предмета')}</option>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="t-date">{tr('Дата')}</Label>
            <Input id="t-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <FieldError>{errors.date}</FieldError>
          </div>
        </div>
        <div>
          <Label htmlFor="t-title">{tr('Название (необязательно)')}</Label>
          <Input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={autoTitle()} maxLength={120} />
          <FieldError>{errors.title}</FieldError>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{tr('Тип цели')}</Label>
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as TaskKind })} aria-label={tr('Тип цели')}>
              {(Object.keys(KIND_LABEL) as TaskKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k].label} ({KIND_LABEL[k].unit})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="t-target">{tr('Объём')}</Label>
            <Input id="t-target" type="number" min={1} max={500} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            <FieldError>{errors.target}</FieldError>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{tr('Приоритет')}</Label>
            <Segmented value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={[{ value: 'low', label: tr('Низкий') }, { value: 'medium', label: tr('Средний') }, { value: 'high', label: tr('Высокий') }]} />
          </div>
          <div>
            <Label htmlFor="t-time">{tr('Время начала')}</Label>
            <Input id="t-time" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <FieldError>{errors.startTime}</FieldError>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
