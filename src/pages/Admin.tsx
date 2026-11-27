import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Plus, RotateCcw, Save, ShieldAlert, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, EmptyState, FieldError, Input, Label, Segmented, Select } from '@/components/ui';
import { Lexi } from '@/components/lexi/Lexi';
import { QuestionBankTable } from '@/components/questions/QuestionBankTable';
import { ReportsQueue } from '@/components/questions/ReportsQueue';
import { DEFAULT_EXAM_FORMAT, SUBJECTS, SUBJECT_MAP, formatMax, isBuiltinTopic } from '@/data/subjects';
import { useAllQuestions, useAppStore } from '@/store/useAppStore';
import { useAuth, hashPin } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { examFormatSchema } from '@/lib/schemas';
import { builtinQuestions } from '@/data/questions/bank';
import { fmtDateTime } from '@/lib/date';
import { uid } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { ExamFormat, ExamFormatBlock, SubjectId, Taxonomy } from '@/types';

const UNLOCK_KEY = 'lexedu-admin-unlocked';

export default function Admin() {
  const pinHash = useAppStore((s) => s.adminPinHash);
  const auth = useAuth();
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return !!pinHash && sessionStorage.getItem(UNLOCK_KEY) === pinHash;
    } catch {
      return false;
    }
  });

  if (isSupabaseConfigured) {
    if (!auth.ready) return null;
    if (auth.role !== 'admin')
      return <EmptyState icon={ShieldAlert} lexi="thinking" title="Доступ только для администраторов" description="Войдите в аккаунт с ролью администратора. Роль назначается в базе данных (profiles.role)." action={<LoginButton />} className="mx-auto mt-6 max-w-lg" />;
    return <AdminPanel serverMode />;
  }
  if (!unlocked) return <PinGate hasPin={!!pinHash} onUnlock={() => setUnlocked(true)} />;
  return <AdminPanel onLock={() => (sessionStorage.removeItem(UNLOCK_KEY), setUnlocked(false))} />;
}

function LoginButton() {
  const navigate = useNavigate();
  return <Button onClick={() => navigate('/account')}>Войти</Button>;
}

function PinGate({ hasPin, onUnlock }: { hasPin: boolean; onUnlock: () => void }) {
  const pinHash = useAppStore((s) => s.adminPinHash);
  const setPin = useAppStore((s) => s.setAdminPinHash);
  const [pin, setPinValue] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const submit = async () => {
    setError('');
    if (!/^\d{4,8}$/.test(pin)) return setError('PIN — от 4 до 8 цифр');
    if (!hasPin) {
      if (pin !== pin2) return setError('PIN-коды не совпадают');
      const h = await hashPin(pin);
      setPin(h);
      sessionStorage.setItem(UNLOCK_KEY, h);
      toast.success('PIN администратора установлен');
      return onUnlock();
    }
    if (attempts >= 5) return setError('Слишком много попыток. Обновите страницу и попробуйте снова.');
    const h = await hashPin(pin);
    if (h !== pinHash) {
      setAttempts((a) => a + 1);
      return setError('Неверный PIN');
    }
    sessionStorage.setItem(UNLOCK_KEY, h);
    onUnlock();
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <Lexi mood="confident" size="sm" decorative />
          <div>
            <h2 className="text-lg font-semibold">Админ-панель</h2>
            <p className="text-sm text-muted-foreground">{hasPin ? 'Введите PIN администратора' : 'Придумайте PIN для защиты панели'}</p>
          </div>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <Label htmlFor="pin">PIN</Label>
            <Input id="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))} />
          </div>
          {!hasPin && (
            <div>
              <Label htmlFor="pin2">Повторите PIN</Label>
              <Input id="pin2" type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
            </div>
          )}
          <FieldError>{error}</FieldError>
          <Button type="submit" className="w-full">
            <KeyRound /> {hasPin ? 'Открыть' : 'Установить PIN'}
          </Button>
        </form>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Локальный режим: PIN защищает панель от случайных изменений на этом устройстве, но это не серверная защита. Для настоящего разграничения прав подключите Supabase — тогда доступ получают только пользователи с ролью администратора.
        </p>
      </Card>
    </div>
  );
}

type Tab = 'questions' | 'reports' | 'taxonomy' | 'format' | 'users' | 'security';

function AdminPanel({ serverMode, onLock }: { serverMode?: boolean; onLock?: () => void }) {
  const [tab, setTab] = useState<Tab>('questions');
  const [reportCount, setReportCount] = useState(0);
  const questions = useAllQuestions();
  const custom = useAppStore((s) => s.customQuestions);
  const overrides = useAppStore((s) => s.questionOverrides);
  const deleted = useAppStore((s) => s.deletedQuestionIds);
  const bySource = useMemo(() => ({ demo: questions.filter((q) => q.source === 'demo').length, user: questions.filter((q) => q.source === 'user').length, verified: questions.filter((q) => q.source === 'verified').length, open: questions.filter((q) => q.source === 'open').length, review: questions.filter((q) => q.verification === 'needs_review').length }), [questions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <span className="font-semibold">Администрирование</span>
          <Badge variant={serverMode ? 'success' : 'warning'}>{serverMode ? 'Роль: администратор' : 'Локальный режим · PIN'}</Badge>
        </div>
        {onLock && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onLock}>
            <Lock /> Заблокировать
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Вопросов в банке" value={questions.length} />
        <Kpi label="Собственные LexEdu" value={bySource.demo} />
        <Kpi label="Открытые источники" value={bySource.open} />
        <Kpi label="Пользовательские" value={bySource.user} />
        <Kpi label="Официальные (с источником)" value={bySource.verified} />
        <Kpi label="Требуют проверки" value={bySource.review} />
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'questions', label: 'Вопросы' },
            { value: 'reports', label: reportCount ? `Жалобы (${reportCount})` : 'Жалобы' },
            { value: 'taxonomy', label: 'Предметы и темы' },
            { value: 'format', label: 'Формат ЕНТ' },
            { value: 'users', label: 'Пользователи' },
            { value: 'security', label: 'Безопасность' },
          ]}
        />
      </div>
      {tab === 'questions' && (
        <Card className="p-5">
          <QuestionBankTable admin />
          <p className="mt-4 text-xs text-muted-foreground">
            Изменено демо-вопросов: {Object.keys(overrides).length} · скрыто: {deleted.length} · своих вопросов: {custom.length}. Правки демо-вопросов хранятся отдельно и не изменяют исходный банк ({builtinQuestions().length} шт.).
          </p>
        </Card>
      )}
      {/* очередь жалоб держим смонтированной, чтобы счётчик на вкладке был виден сразу */}
      <div className={tab === 'reports' ? '' : 'hidden'}>
        <Card className="p-5">
          <ReportsQueue onCount={setReportCount} />
        </Card>
      </div>
      {tab === 'taxonomy' && <TaxonomyEditor />}
      {tab === 'format' && <FormatEditor />}
      {tab === 'users' && <UsersTab serverMode={!!serverMode} />}
      {tab === 'security' && <SecurityTab serverMode={!!serverMode} />}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular">{value}</div>
    </Card>
  );
}

function TaxonomyEditor() {
  const taxonomy = useAppStore((s) => s.taxonomy);
  const setTaxonomy = useAppStore((s) => s.setTaxonomy);
  const questions = useAllQuestions();
  const [subject, setSubject] = useState<SubjectId>('math');
  const [draft, setDraft] = useState<Taxonomy>(taxonomy);
  const [newTopic, setNewTopic] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  useEffect(() => setDraft(taxonomy), [taxonomy]);
  const subj = SUBJECT_MAP[subject];
  const dirty = JSON.stringify(draft) !== JSON.stringify(taxonomy);
  const topicsView = [...subj.topics.filter((t) => isBuiltinTopic(t.id)), ...draft.customTopics.filter((c) => c.subject === subject)];
  const editOf = (id: string) => draft.topicEdits[id] ?? {};
  const setEdit = (id: string, patch: { name?: string; subtopics?: string[]; advice?: string }) => setDraft({ ...draft, topicEdits: { ...draft.topicEdits, [id]: { ...editOf(id), ...patch } } });

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Предметы и темы</CardTitle>
          <CardDescription>Переименование предметов и тем, подтемы, советы для рекомендаций и новые темы</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={!dirty} onClick={() => setDraft(taxonomy)}>
            Отменить
          </Button>
          <Button size="sm" disabled={!dirty} onClick={() => (setTaxonomy(draft), toast.success('Справочник сохранён'))}>
            <Save /> Сохранить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="tx-subj">Предмет</Label>
            <Select id="tx-subj" value={subject} onChange={(e) => setSubject(e.target.value as SubjectId)}>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tx-name">Название предмета</Label>
            <Input id="tx-name" value={draft.subjectNames[subject] ?? subj.name} maxLength={60} onChange={(e) => setDraft({ ...draft, subjectNames: { ...draft.subjectNames, [subject]: e.target.value } })} />
          </div>
        </div>
        <div className="space-y-2">
          {topicsView.map((t) => {
            const builtin = isBuiltinTopic(t.id);
            const custom = draft.customTopics.find((c) => c.id === t.id);
            const used = questions.filter((q) => q.topic === t.id).length;
            const e = editOf(t.id);
            return (
              <div key={t.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1.2fr_1.4fr_auto]">
                <div>
                  <Label className="text-xs">Тема {builtin ? '' : <Badge variant="violet">новая</Badge>}</Label>
                  <Input value={e.name ?? custom?.name ?? t.name} maxLength={60} onChange={(ev) => setEdit(t.id, { name: ev.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Подтемы (через запятую)</Label>
                  <Input value={(e.subtopics ?? custom?.subtopics ?? t.subtopics).join(', ')} onChange={(ev) => setEdit(t.id, { subtopics: ev.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <Label className="text-xs">Совет Lexi («Рекомендуем …»)</Label>
                  <Input value={e.advice ?? custom?.advice ?? t.advice} maxLength={160} onChange={(ev) => setEdit(t.id, { advice: ev.target.value })} />
                </div>
                <div className="flex items-end gap-1">
                  <span className="pb-2 text-xs text-muted-foreground tabular">{used} вопр.</span>
                  {!builtin && (
                    <Button variant="ghost" size="icon-sm" aria-label="Удалить тему" disabled={used > 0} title={used > 0 ? 'Сначала перенесите или удалите вопросы темы' : 'Удалить тему'} onClick={() => setToDelete(t.id)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newTopic.trim();
            if (name.length < 2) return toast.error('Название темы — минимум 2 символа');
            setDraft({ ...draft, customTopics: [...draft.customTopics, { id: `${subject}-custom-${uid('t').slice(-6)}`, subject, name, subtopics: [], advice: `повторить тему «${name}»` }] });
            setNewTopic('');
          }}
        >
          <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder={`Новая тема: ${subj.name}`} maxLength={60} aria-label="Название новой темы" />
          <Button type="submit" variant="secondary">
            <Plus /> Тема
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">Встроенные темы нельзя удалить — к ним привязаны демо-вопросы и история ответов. Новые темы удаляются, только если в них нет вопросов.</p>
      </CardContent>
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Удалить тему?"
        description="Тема будет удалена из справочника после сохранения."
        confirmLabel="Удалить"
        onConfirm={() => {
          if (!toDelete) return;
          const edits = { ...draft.topicEdits };
          delete edits[toDelete];
          setDraft({ ...draft, customTopics: draft.customTopics.filter((c) => c.id !== toDelete), topicEdits: edits });
        }}
      />
    </Card>
  );
}

function FormatEditor() {
  const format = useAppStore((s) => s.examFormat);
  const setFormat = useAppStore((s) => s.setExamFormat);
  const [draft, setDraft] = useState<ExamFormat>(format);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => setDraft(format), [format]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(format);
  const setBlock = (i: number, patch: Partial<ExamFormatBlock>) => setDraft({ ...draft, blocks: draft.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  const save = () => {
    const r = examFormatSchema.safeParse(draft);
    if (!r.success) return setErrors(r.error.issues.map((i) => i.message));
    setErrors([]);
    setFormat(r.data as ExamFormat);
    toast.success('Формат ЕНТ сохранён', 'Прогноз балла и пробные экзамены используют новый формат');
  };

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Формат экзамена</CardTitle>
          <CardDescription>
            Используется в прогнозе балла и полном пробном ЕНТ. Обновлён: {fmtDateTime(format.updatedAt)}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            <RotateCcw /> По умолчанию
          </Button>
          <Button size="sm" disabled={!dirty} onClick={save}>
            <Save /> Сохранить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div>
            <Label htmlFor="ef-name">Название формата</Label>
            <Input id="ef-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ef-min">Время, мин</Label>
            <Input id="ef-min" type="number" min={10} max={600} value={draft.totalMinutes} onChange={(e) => setDraft({ ...draft, totalMinutes: Math.floor(Number(e.target.value) || 0) })} />
          </div>
        </div>
        <div className="space-y-2">
          {draft.blocks.map((b, i) => (
            <div key={b.key} className="grid items-end gap-2 rounded-xl border p-3 sm:grid-cols-[1.3fr_1fr_1fr_90px_90px_auto]">
              <div>
                <Label className="text-xs">Блок</Label>
                <Input value={b.label} onChange={(e) => setBlock(i, { label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Тип</Label>
                <Select value={b.slot} onChange={(e) => setBlock(i, { slot: e.target.value as ExamFormatBlock['slot'], subject: e.target.value === 'fixed' ? (b.subject ?? 'history') : undefined })}>
                  <option value="fixed">Конкретный предмет</option>
                  <option value="profile1">Профильный 1 ученика</option>
                  <option value="profile2">Профильный 2 ученика</option>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Предмет</Label>
                {b.slot === 'fixed' ? (
                  <Select value={b.subject} onChange={(e) => setBlock(i, { subject: e.target.value as SubjectId })}>
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="flex h-10 items-center text-sm text-muted-foreground">выбирает ученик</div>
                )}
              </div>
              <div>
                <Label className="text-xs">Вопросов</Label>
                <Input type="number" min={1} value={b.questions} onChange={(e) => setBlock(i, { questions: Math.floor(Number(e.target.value) || 0) })} />
              </div>
              <div>
                <Label className="text-xs">Баллов</Label>
                <Input type="number" min={1} value={b.maxPoints} onChange={(e) => setBlock(i, { maxPoints: Math.floor(Number(e.target.value) || 0) })} />
              </div>
              <Button variant="ghost" size="icon" aria-label="Удалить блок" disabled={draft.blocks.length <= 1} onClick={() => setDraft({ ...draft, blocks: draft.blocks.filter((_, j) => j !== i) })}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDraft({ ...draft, blocks: [...draft.blocks, { key: uid('blk'), label: 'Новый блок', slot: 'fixed', subject: 'english', questions: 10, maxPoints: 10 }] })}>
            <Plus /> Блок
          </Button>
          <span className="text-sm text-muted-foreground">
            Итого: {draft.blocks.reduce((s, b) => s + b.questions, 0)} вопросов · {formatMax(draft)} баллов · {draft.totalMinutes} мин
          </span>
        </div>
        {errors.length > 0 && (
          <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
            {[...new Set(errors)].map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Баллы блока начисляются пропорционально доле верных ответов. Если структура ЕНТ изменится, обновите формат здесь — код менять не нужно.</p>
      </CardContent>
      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Вернуть формат по умолчанию?" description={`${DEFAULT_EXAM_FORMAT.name}, ${DEFAULT_EXAM_FORMAT.totalMinutes} мин.`} confirmLabel="Вернуть" onConfirm={() => (setFormat(DEFAULT_EXAM_FORMAT), toast.success('Формат сброшен'))} />
    </Card>
  );
}

function UsersTab({ serverMode }: { serverMode: boolean }) {
  const [rows, setRows] = useState<{ id: string; role: string; name: string; xp: number; updated_at: string }[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!serverMode) return;
    void (async () => {
      const sb = await getSupabase();
      if (!sb) return;
      const { data, error: err } = await sb.from('profiles').select('id, role, xp, data, updated_at').order('updated_at', { ascending: false }).limit(200);
      if (err) return setError(err.message);
      setRows((data ?? []).map((r) => ({ id: r.id as string, role: r.role as string, xp: (r.xp as number) ?? 0, updated_at: r.updated_at as string, name: ((r.data as { name?: string } | null)?.name ?? '—') as string })));
    })();
  }, [serverMode]);

  if (!serverMode)
    return <EmptyState icon={Users} lexi="reading" title="Управление пользователями недоступно" description="В локальном режиме один пользователь — этот браузер. Подключите Supabase, чтобы видеть учеников и назначать роли." />;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Пользователи</CardTitle>
          <CardDescription>Роли назначаются в базе данных; администратор видит профили по политике RLS</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-danger">{error}</p>}
        {!rows && !error && <p className="text-sm text-muted-foreground">Загрузка…</p>}
        {rows && (
          <div className="divide-y rounded-xl border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="flex-1">{r.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</span>
                <Badge variant={r.role === 'admin' ? 'violet' : 'secondary'}>{r.role}</Badge>
                <span className="w-20 text-right tabular">{r.xp} XP</span>
              </div>
            ))}
            {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">Пользователей пока нет</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SecurityTab({ serverMode }: { serverMode: boolean }) {
  const setPin = useAppStore((s) => s.setAdminPinHash);
  const [confirm, setConfirm] = useState(false);
  if (serverMode) return <Card className="p-5 text-sm text-muted-foreground">Доступ определяется ролью в Supabase (profiles.role = 'admin'). Пользователь не может назначить себе роль сам — это запрещено политикой базы данных.</Card>;
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 text-warning" />
        <div className="text-sm">
          <p className="font-medium">Локальная защита PIN-кодом</p>
          <p className="mt-1 text-muted-foreground">PIN хранится в виде хеша SHA-256 и не попадает в экспорт данных. Это защита от случайных изменений, а не серверная безопасность.</p>
          <Button variant="secondary" className="mt-3" onClick={() => setConfirm(true)}>
            <KeyRound /> Сменить PIN
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Сменить PIN?"
        description="Текущий PIN будет сброшен, панель заблокируется, и вы зададите новый."
        confirmLabel="Сменить"
        onConfirm={() => {
          setPin(null);
          sessionStorage.removeItem(UNLOCK_KEY);
          location.reload();
        }}
      />
    </Card>
  );
}
