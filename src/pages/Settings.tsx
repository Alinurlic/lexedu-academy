import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Cloud, CloudOff, Database, Download, Monitor, Moon, RotateCcw, Save, Sun, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, FieldError, Input, Label, Select, Switch } from '@/components/ui';
import { Avatar } from '@/components/layout/Avatar';
import { exportPayload, useAppStore } from '@/store/useAppStore';
import { useCoreStats } from '@/hooks/useStats';
import { PROFILE_COMBOS, SUBJECT_MAP } from '@/data/subjects';
import { profileSchema } from '@/lib/schemas';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn, downloadJson, fmtNum } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Level, Profile, SubjectId, ThemeMode, Track, TrackProfile } from '@/types';
import { LEVEL_LABEL, trackProfile } from '@/hooks/useTrack';

const TRACK_NAME: Record<Track, string> = { ent: 'ЕНТ (ҰБТ)', sat: 'SAT', ielts: 'IELTS Academic' };
const TRACK_LIMITS: Record<Track, { min: number; max: number; step: number; unit: string }> = {
  ent: { min: 0, max: 140, step: 1, unit: 'из 140' },
  sat: { min: 400, max: 1600, step: 10, unit: '400–1600' },
  ielts: { min: 0, max: 9, step: 0.5, unit: 'band' },
};
const clampNum = (v: number, l: { min: number; max: number; step: number }) => {
  if (!Number.isFinite(v)) return l.min;
  const r = Math.round(v / l.step) * l.step;
  return Math.min(l.max, Math.max(l.min, Number(r.toFixed(1))));
};

const COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#475569'];
const EMOJI = ['', '🚀', '🎯', '📚', '🧠', '⭐', '🦉', '🔥'];

export default function Settings() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const clearAll = useAppStore((s) => s.clearAll);
  const importData = useAppStore((s) => s.importData);
  const dataMode = useAppStore((s) => s.dataMode);
  const counts = useAppStore(useShallow((s) => ({ attempts: s.attempts.length, exams: s.exams.length, mistakes: s.mistakes.length, tasks: s.tasks.length, custom: s.customQuestions.length })));
  const stats = useCoreStats();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Profile>(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<'demo' | 'clear' | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  useEffect(() => setDraft((d) => ({ ...d, theme: profile.theme, sidebarCollapsed: profile.sidebarCollapsed })), [profile.theme, profile.sidebarCollapsed]);
  useEffect(() => {
    if (hash === '#data') setTimeout(() => document.getElementById('data')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [hash]);

  const save = () => {
    const res = profileSchema.safeParse(draft);
    if (!res.success) {
      const e: Record<string, string> = {};
      for (const i of res.error.issues) e[String(i.path[0])] ??= i.message;
      setErrors(e);
      toast.error('Проверьте поля профиля');
      return;
    }
    setErrors({});
    updateProfile(res.data as Profile);
    toast.success('Настройки сохранены');
  };

  const setTheme = (t: ThemeMode) => {
    updateProfile({ theme: t });
    setDraft((d) => ({ ...d, theme: t }));
  };

  const comboKey = draft.profileSubjects.join('+');

  const onImport = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Файл слишком большой');
      const json = JSON.parse(await file.text());
      if (importData(json)) {
        setDraft(useAppStore.getState().profile);
        toast.success('Данные импортированы', file.name);
      } else toast.error('Не удалось импортировать', 'Файл не похож на резервную копию LexEdu или ExamPilot');
    } catch (e) {
      toast.error('Ошибка чтения файла', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Профиль */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Эти данные используются для прогноза и персональных рекомендаций</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16 text-xl" name={draft.name} color={draft.avatarColor} emoji={draft.avatarEmoji} />
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Цвет аватара">
                {COLORS.map((c) => (
                  <button key={c} role="radio" aria-checked={draft.avatarColor === c} aria-label={`Цвет ${c}`} onClick={() => setDraft({ ...draft, avatarColor: c })} className={cn('size-7 rounded-full ring-offset-2 ring-offset-card', draft.avatarColor === c && 'ring-2 ring-foreground')} style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Значок аватара">
                {EMOJI.map((e) => (
                  <button key={e || 'none'} role="radio" aria-checked={draft.avatarEmoji === e} onClick={() => setDraft({ ...draft, avatarEmoji: e })} className={cn('grid size-7 place-items-center rounded-md border text-sm', draft.avatarEmoji === e && 'border-primary bg-primary/10')}>
                    {e || 'Аа'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-name">Имя</Label>
              <Input id="s-name" value={draft.name} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <FieldError>{errors.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="s-grade">Класс</Label>
              <Select id="s-grade" value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: Number(e.target.value) })}>
                {[9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    {g === 12 ? 'Выпускник прошлых лет' : `${g} класс`}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="s-target">Целевой балл ЕНТ (из 140)</Label>
              <Input id="s-target" type="number" min={50} max={140} value={draft.targetScore} onChange={(e) => setDraft({ ...draft, targetScore: Math.floor(Number(e.target.value) || 0) })} />
              <FieldError>{errors.targetScore}</FieldError>
            </div>
            <div>
              <Label htmlFor="s-combo">Профильные предметы</Label>
              <Select
                id="s-combo"
                value={comboKey}
                onChange={(e) => setDraft({ ...draft, profileSubjects: e.target.value.split('+') as [SubjectId, SubjectId] })}
              >
                {PROFILE_COMBOS.map(([a, b]) => (
                  <option key={`${a}+${b}`} value={`${a}+${b}`}>
                    {SUBJECT_MAP[a].name} + {SUBJECT_MAP[b].name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="s-entlang">Язык сдачи ЕНТ</Label>
              <Select id="s-entlang" value={draft.entLang ?? 'ru'} onChange={(e) => setDraft({ ...draft, entLang: e.target.value as 'ru' | 'kk' })}>
                <option value="ru">Русский</option>
                <option value="kk">Қазақ тілі (казахский)</option>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">Задания в практике и пробных ЕНТ будут на этом языке</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary/50 p-4 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Вопросов решено</div>
              <div className="font-semibold tabular">{fmtNum(stats.totalQuestions)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Точность</div>
              <div className="font-semibold tabular">{Math.round(stats.accuracy * 100)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Экзаменов</div>
              <div className="font-semibold tabular">{counts.exams}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Уровень</div>
              <div className="font-semibold">
                {stats.level.current.index} · {stats.level.current.name}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Обучение */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Учебные цели</CardTitle>
            <CardDescription>Используются в плане, напоминаниях и на главной</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="s-date">Дата ЕНТ</Label>
            <Input id="s-date" type="date" value={draft.examDate} onChange={(e) => setDraft({ ...draft, examDate: e.target.value })} />
            <FieldError>{errors.examDate}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-min">Минут в день</Label>
            <Input id="s-min" type="number" min={10} max={600} value={draft.dailyGoalMin} onChange={(e) => setDraft({ ...draft, dailyGoalMin: Math.floor(Number(e.target.value) || 0) })} />
            <FieldError>{errors.dailyGoalMin}</FieldError>
          </div>
          <div>
            <Label htmlFor="s-q">Вопросов в день</Label>
            <Input id="s-q" type="number" min={5} max={300} value={draft.dailyQuestionGoal} onChange={(e) => setDraft({ ...draft, dailyQuestionGoal: Math.floor(Number(e.target.value) || 0) })} />
            <FieldError>{errors.dailyQuestionGoal}</FieldError>
          </div>
        </CardContent>
      </Card>

      {/* Треки */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Экзамены: уровень, результаты и цели</CardTitle>
            <CardDescription>По этим данным Lexi строит прогноз, план и умный анализ</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/onboarding')}>
            <RotateCcw /> Пройти анкету заново
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['ent', 'sat', 'ielts'] as Track[]).map((t) => {
            const tp = trackProfile(draft, t);
            const lim = TRACK_LIMITS[t];
            const set = (patch: Partial<TrackProfile>) =>
              setDraft((d) => ({
                ...d,
                ...(t === 'ent' && patch.target !== undefined ? { targetScore: patch.target } : {}),
                ...(t === 'ent' && patch.examDate !== undefined ? { examDate: patch.examDate } : {}),
                tracks: { ...d.tracks, [t]: { ...trackProfile(d, t), ...patch } },
              }));
            return (
              <div key={t} className={cn('rounded-xl border p-4', !tp.enabled && 'opacity-70')}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-medium">{TRACK_NAME[t]}</div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    Готовлюсь
                    <Switch checked={tp.enabled} onChange={(v) => set({ enabled: v })} label={`Готовлюсь к ${TRACK_NAME[t]}`} />
                  </label>
                </div>
                {tp.enabled && (
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <Label htmlFor={`tr-${t}-lv`}>Уровень</Label>
                      <Select id={`tr-${t}-lv`} value={tp.level} onChange={(e) => set({ level: e.target.value as Level })}>
                        {Object.entries(LEVEL_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`tr-${t}-last`}>Последний результат</Label>
                      <Input
                        id={`tr-${t}-last`}
                        type="number"
                        min={lim.min}
                        max={lim.max}
                        step={lim.step}
                        placeholder="не сдавал"
                        value={tp.lastResult ?? ''}
                        onChange={(e) => set({ lastResult: e.target.value === '' ? null : clampNum(Number(e.target.value), lim) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`tr-${t}-goal`}>Цель ({lim.unit})</Label>
                      <Input id={`tr-${t}-goal`} type="number" min={lim.min} max={lim.max} step={lim.step} value={tp.target} onChange={(e) => set({ target: clampNum(Number(e.target.value), t === 'ent' ? { ...lim, min: 50 } : lim) })} />
                    </div>
                    <div>
                      <Label htmlFor={`tr-${t}-date`}>Дата экзамена</Label>
                      <Input id={`tr-${t}-date`} type="date" value={tp.examDate} onChange={(e) => set({ examDate: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Интерфейс */}
      <Card>
        <CardHeader>
          <CardTitle>Интерфейс и уведомления</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Тема оформления</Label>
            <div className="grid grid-cols-3 gap-2 sm:max-w-md">
              {(
                [
                  ['dark', Moon, 'Тёмная'],
                  ['light', Sun, 'Светлая'],
                  ['system', Monitor, 'Системная'],
                ] as const
              ).map(([t, Icon, l]) => (
                <button key={t} onClick={() => setTheme(t)} aria-pressed={profile.theme === t} className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm', profile.theme === t ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:border-primary/40')}>
                  <Icon className="size-4" /> {l}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:max-w-xs">
            <Label htmlFor="s-lang">Язык интерфейса</Label>
            <Select id="s-lang" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as 'ru' | 'kk' })}>
              <option value="ru">Русский</option>
              <option value="kk" disabled>
                Қазақша (в разработке)
              </option>
            </Select>
          </div>
          <div className="divide-y rounded-xl border">
            {(
              [
                ['reminders', 'Ежедневные напоминания', 'Дни до ЕНТ и новые ошибки для повторения'],
                ['achievements', 'Достижения и уровни', 'Уведомлять о новых наградах'],
                ['weeklyReport', 'Недельный отчёт', 'Сводка прогресса в начале недели'],
              ] as const
            ).map(([k, title, desc]) => (
              <div key={k} className="flex items-center justify-between gap-4 p-3.5">
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <Switch checked={draft.notifications[k]} onChange={(v) => setDraft({ ...draft, notifications: { ...draft.notifications, [k]: v } })} label={title} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className={cn('sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl border bg-popover/95 p-3 shadow-lg backdrop-blur transition-opacity', dirty ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        <span className="mr-auto text-sm text-muted-foreground">Есть несохранённые изменения</span>
        <Button variant="ghost" onClick={() => (setDraft(profile), setErrors({}))}>
          Отменить
        </Button>
        <Button onClick={save}>
          <Save /> Сохранить
        </Button>
      </div>

      {/* Данные */}
      <Card id="data">
        <CardHeader>
          <div>
            <CardTitle>Данные</CardTitle>
            <CardDescription>Всё хранится локально в этом браузере и сохраняется автоматически</CardDescription>
          </div>
          <Badge variant={dataMode === 'demo' ? 'violet' : 'secondary'}>{dataMode === 'demo' ? 'Демо-профиль' : 'Личные данные'}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {[
              ['Ответов', counts.attempts],
              ['Экзаменов', counts.exams],
              ['Ошибок', counts.mistakes],
              ['Задач', counts.tasks],
              ['Своих вопросов', counts.custom],
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-lg bg-secondary/60 p-2.5">
                <div className="text-[11px] text-muted-foreground">{l}</div>
                <div className="font-semibold tabular">{fmtNum(Number(v))}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                downloadJson(exportPayload(), `lexedu-backup-${new Date().toISOString().slice(0, 10)}.json`);
                toast.success('Экспорт выполнен', 'Файл JSON сохранён');
              }}
            >
              <Download /> Экспорт JSON
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload /> Импорт JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = '';
              }}
            />
            <Button variant="secondary" onClick={() => setConfirm('demo')}>
              <RotateCcw /> Сбросить демо-данные
            </Button>
            <Button variant="danger" onClick={() => setConfirm('clear')}>
              <Trash2 /> Начать с чистого листа
            </Button>
          </div>
          <div className="flex items-start gap-3 rounded-xl border p-4">
            {isSupabaseConfigured ? <Cloud className="mt-0.5 size-5 text-success" /> : <CloudOff className="mt-0.5 size-5 text-muted-foreground" />}
            <div className="text-sm">
              <div className="font-medium">Облачная синхронизация {isSupabaseConfigured ? 'настроена' : 'не подключена'}</div>
              <p className="mt-0.5 text-muted-foreground">
                {isSupabaseConfigured
                  ? 'Ключи Supabase найдены. Вход и синхронизация используют схему из supabase/schema.sql.'
                  : 'Работает локальный режим. Чтобы включить аккаунты, задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env и примените supabase/schema.sql.'}
              </p>
            </div>
            <Database className="ml-auto hidden size-5 text-muted-foreground sm:block" />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm === 'demo'}
        onClose={() => setConfirm(null)}
        title="Сбросить демо-данные?"
        description="Текущая история будет заменена демо-профилем с годом подготовки. Рекомендуем сначала сделать экспорт."
        confirmLabel="Сбросить"
        onConfirm={() => {
          resetDemo();
          setDraft(useAppStore.getState().profile);
          toast.success('Демо-данные восстановлены');
        }}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        danger
        onClose={() => setConfirm(null)}
        title="Удалить всю историю?"
        description="Будут удалены ответы, экзамены, ошибки, план и достижения. Профиль и настройки сохранятся. Действие необратимо."
        confirmLabel="Удалить всё"
        onConfirm={() => {
          clearAll();
          toast.success('История очищена', 'Можно начинать подготовку с нуля');
        }}
      />
    </div>
  );
}
