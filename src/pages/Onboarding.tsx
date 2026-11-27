import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ArrowLeft, ArrowRight, Check, PlayCircle } from 'lucide-react';
import { Button, Card, FieldError, Input, Label, Select } from '@/components/ui';
import { Lexi } from '@/components/lexi/Lexi';
import { Logo } from '@/components/icons';
import { useAppStore } from '@/store/useAppStore';
import { PROFILE_COMBOS, SUBJECT_MAP, TRACKS } from '@/data/subjects';
import { LEVEL_LABEL, TRACK_DEFAULTS } from '@/hooks/useTrack';
import { daysBetween, fromKey } from '@/lib/date';
import { cn, plural } from '@/lib/utils';
import { toast } from '@/store/toast';
import { pushProfileToCloud, useAuth } from '@/lib/auth';
import type { Level, SubjectId, Track, TrackProfile } from '@/types';

const SCALE: Record<Track, { min: number; max: number; step: number; placeholder: string; lastHint: string }> = {
  ent: { min: 0, max: 140, step: 1, placeholder: 'например, 85', lastHint: 'Последний результат ЕНТ или пробного ЕНТ (0–140)' },
  sat: { min: 400, max: 1600, step: 10, placeholder: 'например, 1180', lastHint: 'Последний результат SAT или Bluebook (400–1600)' },
  ielts: { min: 0, max: 9, step: 0.5, placeholder: 'например, 6.0', lastHint: 'Последний overall band IELTS (0–9)' },
};

const LEVELS: Level[] = ['beginner', 'elementary', 'intermediate', 'upper', 'advanced'];

/** Мастер первого входа: экзамены, уровень, последние результаты, цели. Данные используются в прогнозе и плане. */
export default function Onboarding() {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name);
  const [grade, setGrade] = useState(profile.grade);
  const [tracks, setTracks] = useState<Track[]>(['ent']);
  const [combo, setCombo] = useState(profile.profileSubjects.join('+'));
  const [entLang, setEntLang] = useState<'ru' | 'kk'>(profile.entLang ?? 'ru');
  const [data, setData] = useState<Record<Track, TrackProfile & { lastInput: string; never: boolean }>>(() => {
    const out = {} as Record<Track, TrackProfile & { lastInput: string; never: boolean }>;
    for (const t of ['ent', 'sat', 'ielts'] as Track[]) {
      const year = new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear();
      out[t] = { ...TRACK_DEFAULTS[t], enabled: t === 'ent', examDate: `${year}-${t === 'ent' ? '06-15' : t === 'sat' ? '05-02' : '04-18'}`, lastInput: '', never: true };
    }
    return out;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const auth = useAuth();

  if (isSupabaseConfigured && auth.ready && !auth.userId) return <Navigate to="/login" replace />;

  const set = (t: Track, patch: Partial<TrackProfile & { lastInput: string; never: boolean }>) => setData((d) => ({ ...d, [t]: { ...d[t], ...patch } }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0 && name.trim().length < 2) e.name = 'Введите имя (минимум 2 символа)';
    if (step === 1 && !tracks.length) e.tracks = 'Выберите хотя бы один экзамен';
    if (step === 2) {
      for (const t of tracks) {
        const sc = SCALE[t];
        const d = data[t];
        if (!d.never) {
          const v = Number(d.lastInput.replace(',', '.'));
          if (!d.lastInput.trim() || !Number.isFinite(v) || v < sc.min || v > sc.max) e[`${t}-last`] = `Введите число от ${sc.min} до ${sc.max}`;
        }
        if (!Number.isFinite(d.target) || d.target < sc.min || d.target > sc.max) e[`${t}-target`] = `Цель — от ${sc.min} до ${sc.max}`;
        if (!d.examDate) e[`${t}-date`] = 'Укажите дату экзамена';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finish = () => {
    const out: Partial<Record<Track, TrackProfile>> = {};
    for (const t of ['ent', 'sat', 'ielts'] as Track[]) {
      const d = data[t];
      out[t] = { enabled: tracks.includes(t), level: d.level, lastResult: d.never ? null : Number(d.lastInput.replace(',', '.')), lastResultDate: d.never ? null : d.lastResultDate, target: d.target, examDate: d.examDate };
    }
    const [a, b] = combo.split('+') as [SubjectId, SubjectId];
    updateProfile({
      name: name.trim(),
      grade,
      tracks: out,
      activeTrack: tracks[0],
      onboarded: true,
      profileSubjects: [a, b],
      entLang,
      targetScore: out.ent!.target,
      examDate: out.ent!.examDate || profile.examDate,
    });
    void pushProfileToCloud();
    toast.success(`Добро пожаловать, ${name.trim()}!`, 'План подготовки готов');
    navigate('/', { replace: true });
  };

  const next = () => validate() && (step < 3 ? setStep(step + 1) : finish());

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-sm text-muted-foreground">Шаг {step + 1} из 4</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'brand-gradient' : 'bg-secondary')} />
          ))}
        </div>

        <Card className="brand-glow p-6 sm:p-8">
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Lexi mood="reading" size="md" />
                <div>
                  <h1 className="text-2xl font-semibold">Привет! Я Lexi.</h1>
                  <p className="mt-1 text-muted-foreground">Помогу подготовиться к ЕНТ, SAT и IELTS. Расскажи немного о себе — это займёт минуту.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ob-name">Как тебя зовут?</Label>
                  <Input id="ob-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus />
                  <FieldError>{errors.name}</FieldError>
                </div>
                <div>
                  <Label htmlFor="ob-grade">Класс</Label>
                  <Select id="ob-grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                    {[9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        {g === 12 ? 'Выпускник / студент' : `${g} класс`}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Lexi mood="exam" size="md" />
                <div>
                  <h1 className="text-2xl font-semibold">К каким экзаменам готовишься?</h1>
                  <p className="mt-1 text-muted-foreground">Можно выбрать несколько — переключаться между ними можно в верхней панели.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {TRACKS.map((t) => {
                  const on = tracks.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => setTracks(on ? tracks.filter((x) => x !== t.id) : [...tracks, t.id])} aria-pressed={on} className={cn('rounded-2xl border p-4 text-left transition-colors', on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:border-primary/40')}>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">{t.name}</span>
                        <span className={cn('grid size-5 place-items-center rounded-md border-2', on ? 'border-primary bg-primary text-white' : 'border-input')}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.full}</div>
                      <div className="mt-2 text-xs text-muted-foreground">Шкала: {t.scale}</div>
                    </button>
                  );
                })}
              </div>
              <FieldError>{errors.tracks}</FieldError>
              {tracks.includes('ent') && (
                <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Язык сдачи ЕНТ</Label>
                    <div className="flex gap-2" role="radiogroup" aria-label="Язык сдачи ЕНТ">
                      {(
                        [
                          ['ru', 'Русский'],
                          ['kk', 'Қазақ тілі'],
                        ] as const
                      ).map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={entLang === v}
                          onClick={() => setEntLang(v)}
                          className={cn('flex-1 rounded-lg border px-3 py-2 text-sm', entLang === v ? 'border-primary bg-primary/10 font-medium' : 'hover:border-primary/40')}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Задания ЕНТ будут на этом языке. Можно изменить в настройках.</p>
                  </div>
                  <div>
                    <Label htmlFor="ob-combo">Профильные предметы ЕНТ</Label>
                    <Select id="ob-combo" value={combo} onChange={(e) => setCombo(e.target.value)}>
                      {PROFILE_COMBOS.map(([a, b]) => (
                        <option key={`${a}+${b}`} value={`${a}+${b}`}>
                          {SUBJECT_MAP[a].name} + {SUBJECT_MAP[b].name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Lexi mood="thinking" size="md" />
                <div>
                  <h1 className="text-2xl font-semibold">Твой уровень и последние результаты</h1>
                  <p className="mt-1 text-muted-foreground">По ним я рассчитаю разрыв до цели и темп подготовки.</p>
                </div>
              </div>
              {tracks.map((t) => {
                const d = data[t];
                const sc = SCALE[t];
                return (
                  <div key={t} className="space-y-4 rounded-2xl border p-4">
                    <div className="font-semibold">{TRACKS.find((x) => x.id === t)!.name}</div>
                    <div>
                      <Label>Текущий уровень</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {LEVELS.map((l) => (
                          <button key={l} onClick={() => set(t, { level: l })} aria-pressed={d.level === l} className={cn('rounded-lg border px-3 py-1.5 text-sm', d.level === l ? 'border-primary bg-primary/10' : 'hover:border-primary/40')}>
                            {LEVEL_LABEL[l]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={d.never} onChange={(e) => set(t, { never: e.target.checked })} className="size-4 accent-[hsl(var(--primary))]" />
                          Ещё не сдавал(а) — ни реальный, ни пробный
                        </label>
                      </div>
                      {!d.never && (
                        <>
                          <div>
                            <Label htmlFor={`${t}-last`}>Последний результат</Label>
                            <Input id={`${t}-last`} inputMode="decimal" placeholder={sc.placeholder} value={d.lastInput} onChange={(e) => set(t, { lastInput: e.target.value })} />
                            <p className="mt-1 text-[11px] text-muted-foreground">{sc.lastHint}</p>
                            <FieldError>{errors[`${t}-last`]}</FieldError>
                          </div>
                          <div>
                            <Label htmlFor={`${t}-lastdate`}>Когда сдавал(а)</Label>
                            <Input id={`${t}-lastdate`} type="date" value={d.lastResultDate ?? ''} onChange={(e) => set(t, { lastResultDate: e.target.value || null })} />
                          </div>
                        </>
                      )}
                      <div>
                        <Label htmlFor={`${t}-target`}>Цель</Label>
                        <Input id={`${t}-target`} type="number" min={sc.min} max={sc.max} step={sc.step} value={d.target} onChange={(e) => set(t, { target: Number(e.target.value) })} />
                        <FieldError>{errors[`${t}-target`]}</FieldError>
                      </div>
                      <div>
                        <Label htmlFor={`${t}-date`}>Дата экзамена</Label>
                        <Input id={`${t}-date`} type="date" value={d.examDate} onChange={(e) => set(t, { examDate: e.target.value })} />
                        <FieldError>{errors[`${t}-date`]}</FieldError>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Lexi mood="motivating" size="md" />
                <div>
                  <h1 className="text-2xl font-semibold">Вперёд к цели, {name.trim()}!</h1>
                  <p className="mt-1 text-muted-foreground">Вот что я понял. Всё можно изменить в настройках.</p>
                </div>
              </div>
              <div className="space-y-3">
                {tracks.map((t) => {
                  const d = data[t];
                  const last = d.never ? null : Number(d.lastInput.replace(',', '.'));
                  const days = d.examDate ? daysBetween(new Date(), fromKey(d.examDate)) : 0;
                  const weeks = Math.max(1, Math.round(days / 7));
                  const gap = last === null ? null : Math.round((d.target - last) * 10) / 10;
                  return (
                    <div key={t} className="rounded-2xl border p-4 text-sm">
                      <div className="mb-1 font-semibold">{TRACKS.find((x) => x.id === t)!.name}</div>
                      <p className="text-muted-foreground">
                        Уровень: {LEVEL_LABEL[d.level].toLowerCase()}. Цель: <b className="text-foreground">{d.target}</b>
                        {last !== null && (
                          <>
                            , последний результат: <b className="text-foreground">{last}</b> (разрыв {gap! > 0 ? `+${gap}` : 'закрыт'})
                          </>
                        )}
                        . До экзамена {days > 0 ? `${days} ${plural(days, ['день', 'дня', 'дней'])} (≈${weeks} нед.)` : 'дата не указана или прошла'}.
                        {gap !== null && gap > 0 && days > 0 && <> Нужный темп: примерно +{Math.round((gap / weeks) * 100) / 100} {t === 'ielts' ? 'band' : 'балла'} в неделю.</>}
                        {last === null && ' Начнём с диагностики: пройди короткую практику или пробный экзамен — и я построю точный прогноз.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ArrowLeft /> Назад
            </Button>
            <Button onClick={next}>
              {step === 3 ? 'Начать подготовку' : 'Далее'} <ArrowRight />
            </Button>
          </div>
        </Card>

        <button
          onClick={() => {
            resetDemo();
            toast.info('Включён демо-профиль', 'Это пример с вымышленной историей. Сбросить можно в настройках.');
            navigate('/', { replace: true });
          }}
          className="mx-auto inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <PlayCircle className="size-4" /> Просто посмотреть демо с готовой историей
        </button>
      </div>
    </div>
  );
}
