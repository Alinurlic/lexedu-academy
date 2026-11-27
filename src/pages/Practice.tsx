import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, BookmarkX, Clock, History, Play, Shuffle, Target } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, EmptyState, Segmented, Switch } from '@/components/ui';
import { SubjectIcon } from '@/components/icons';
import { QuestionMeta, QuestionView, Explanation } from '@/components/QuestionView';
import { SUBJECT_MAP, TOPIC_MAP, subjectsOf } from '@/data/subjects';
import { useTrack } from '@/hooks/useTrack';
import { useStudyQuestions, useAppStore, useQuestionMap } from '@/store/useAppStore';
import { useSession } from '@/store/session';
import { buildPool, pickQuestions, type PoolSource } from '@/lib/practice';
import { fmtDateTime, fmtDuration } from '@/lib/date';
import { cn, pct, plural } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Difficulty, PracticeSessionResult, SubjectId } from '@/types';

const COUNTS = [5, 10, 15, 20];
const TIMERS = [5, 10, 20, 30];

export default function Practice() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const allQ = useStudyQuestions().list;
  const attempts = useAppStore((s) => s.attempts);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const mistakes = useAppStore((s) => s.mistakes);
  const sessions = useAppStore((s) => s.sessions);
  const profile = useAppStore((s) => s.profile);
  const active = useSession((s) => s.practice);
  const setPractice = useSession((s) => s.setPractice);

  const track = useTrack();
  const trackSubjects = subjectsOf(track);
  const questions = useMemo(() => allQ.filter((q) => q.type !== 'essay' && SUBJECT_MAP[q.subject]?.track === track), [allQ, track]);
  const initialSubject = (params.get('subject') as SubjectId | 'all' | null) ?? (track === 'ent' ? profile.profileSubjects[0] : trackSubjects[0].id);
  const [tab, setTab] = useState<'new' | 'bookmarks' | 'history'>('new');
  const [subject, setSubject] = useState<SubjectId | 'all'>(SUBJECT_MAP[initialSubject as SubjectId] || initialSubject === 'all' ? initialSubject : 'math');
  const [topics, setTopics] = useState<string[]>(params.get('topic') ? [params.get('topic')!] : []);
  const [difficulty, setDifficulty] = useState<Difficulty | 'any'>('any');
  const [source, setSource] = useState<PoolSource>((params.get('source') as PoolSource) ?? 'all');
  const [count, setCount] = useState(Number(params.get('count')) || 10);
  const [timerOn, setTimerOn] = useState(false);
  const [timerMin, setTimerMin] = useState(10);
  const [preview, setPreview] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<PracticeSessionResult | null>(null);

  useEffect(() => {
    if (subject !== 'all' && SUBJECT_MAP[subject]?.track !== track) {
      setSubject(track === 'ent' ? profile.profileSubjects[0] : trackSubjects[0].id);
      setTopics([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  useEffect(() => {
    if (params.get('topic')) setTopics([params.get('topic')!]);
    if (params.get('subject')) setSubject(params.get('subject') as SubjectId);
  }, [params]);

  const pool = useMemo(() => buildPool(questions, { subject, topics, difficulty, source }, { attempts, bookmarks, mistakes }), [questions, subject, topics, difficulty, source, attempts, bookmarks, mistakes]);
  const subj = subject === 'all' ? null : SUBJECT_MAP[subject];
  const realCount = Math.min(count, pool.length);

  const start = () => {
    if (!pool.length) return;
    const picked = pickQuestions(pool, realCount, attempts);
    const subjCounts = new Map<SubjectId, number>();
    picked.forEach((q) => subjCounts.set(q.subject, (subjCounts.get(q.subject) ?? 0) + 1));
    const mainSubject = [...subjCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    setPractice({
      subject: mainSubject,
      topics: [...new Set(picked.map((q) => q.topic))],
      questionIds: picked.map((q) => q.id),
      current: 0,
      entries: {},
      startedAt: new Date().toISOString(),
      timeLimitSec: timerOn ? timerMin * 60 : null,
      label: subj ? subj.name : source === 'bookmarks' ? 'Закладки' : source === 'mistakes' ? 'Ошибки' : 'Смешанная практика',
    });
    navigate('/practice/session');
  };

  const startBookmarks = () => {
    setSubject('all');
    setTopics([]);
    setDifficulty('any');
    setSource('bookmarks');
    setTab('new');
    toast.info('Выбраны закладки', 'Проверьте настройки и нажмите «Начать сессию»');
  };

  const qmap = useQuestionMap();
  const previewQ = preview ? qmap.get(preview) : undefined;
  const recent = [...sessions].reverse().slice(0, 30);

  return (
    <div className="space-y-6">
      {active && (
        <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="text-sm font-medium">У вас есть незавершённая сессия: {active.label}</div>
            <div className="text-xs text-muted-foreground">
              Отвечено {Object.values(active.entries).filter((e) => e.submitted).length} из {active.questionIds.length}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => (setPractice(null), toast.info('Сессия отменена'))}>
              Отменить
            </Button>
            <Button size="sm" onClick={() => navigate('/practice/session')}>
              <Play /> Продолжить
            </Button>
          </div>
        </Card>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'new', label: 'Новая сессия' },
          { value: 'bookmarks', label: `Закладки (${bookmarks.length})` },
          { value: 'history', label: 'История' },
        ]}
      />

      {tab === 'new' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>1. Предмет</CardTitle>
                  <CardDescription>Выберите предмет для тренировки</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {trackSubjects.filter((s) => s.id !== 'ielts-writing' && s.id !== 'ielts-speaking').map((s) => {
                    const n = questions.filter((q) => q.subject === s.id).length;
                    return (
                      <button
                        key={s.id}
                        onClick={() => (setSubject(s.id), setTopics([]))}
                        className={cn('flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors', subject === s.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:border-primary/40')}
                      >
                        <SubjectIcon subject={s.id} className="size-8" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{s.name}</span>
                          <span className="text-[11px] text-muted-foreground">{n} вопр.</span>
                        </span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => (setSubject('all'), setTopics([]))}
                    className={cn('flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors', subject === 'all' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:border-primary/40')}
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-secondary">
                      <Shuffle className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">Все предметы</span>
                      <span className="text-[11px] text-muted-foreground">{questions.length} вопр.</span>
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {subj && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>2. Темы</CardTitle>
                    <CardDescription>Без выбора — все темы предмета</CardDescription>
                  </div>
                  {topics.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setTopics([])}>
                      Сбросить
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {subj.topics.map((t) => {
                    const on = topics.includes(t.id);
                    const n = questions.filter((q) => q.topic === t.id).length;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTopics(on ? topics.filter((x) => x !== t.id) : [...topics, t.id])}
                        aria-pressed={on}
                        className={cn('rounded-lg border px-3 py-1.5 text-sm transition-colors', on ? 'border-primary bg-primary/10 text-foreground' : 'text-muted-foreground hover:border-primary/40 hover:text-foreground')}
                      >
                        {t.name} <span className="text-xs opacity-60">{n}</span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{subj ? '3' : '2'}. Параметры</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium">Сложность</div>
                  <Segmented
                    value={difficulty}
                    onChange={setDifficulty}
                    options={[
                      { value: 'any', label: 'Любая' },
                      { value: 'easy', label: 'Лёгкая' },
                      { value: 'medium', label: 'Средняя' },
                      { value: 'hard', label: 'Сложная' },
                    ]}
                  />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Количество вопросов</div>
                  <Segmented value={String(count)} onChange={(v) => setCount(Number(v))} options={COUNTS.map((c) => ({ value: String(c), label: String(c) }))} />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Источник</div>
                  <Segmented
                    value={source}
                    onChange={setSource}
                    options={[
                      { value: 'all', label: 'Все' },
                      { value: 'unseen', label: 'Новые' },
                      { value: 'mistakes', label: 'Ошибки' },
                      { value: 'bookmarks', label: 'Закладки' },
                    ]}
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-3 text-sm font-medium">
                    <Switch checked={timerOn} onChange={setTimerOn} label="Таймер" /> Таймер
                  </div>
                  {timerOn ? (
                    <Segmented value={String(timerMin)} onChange={(v) => setTimerMin(Number(v))} options={TIMERS.map((t) => ({ value: String(t), label: `${t} мин` }))} />
                  ) : (
                    <p className="text-xs text-muted-foreground">Без ограничения по времени</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Сводка</CardTitle>
                  <CardDescription>Проверьте настройки перед стартом</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Предмет" value={subj?.name ?? 'Все предметы'} />
                <Row label="Темы" value={topics.length ? topics.map((t) => TOPIC_MAP[t]?.name).join(', ') : 'Все'} />
                <Row label="Сложность" value={{ any: 'Любая', easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' }[difficulty]} />
                <Row label="Доступно" value={`${pool.length} ${plural(pool.length, ['вопрос', 'вопроса', 'вопросов'])}`} />
                <Row label="В сессии" value={String(realCount)} />
                <Row label="Таймер" value={timerOn ? `${timerMin} мин` : 'Выключен'} />
                {pool.length > 0 && pool.length < count && <p className="rounded-lg bg-warning/10 p-2.5 text-xs text-warning">В пуле меньше вопросов, чем выбрано: будет {pool.length}.</p>}
                {pool.length === 0 && <p className="rounded-lg bg-danger/10 p-2.5 text-xs text-danger">Под эти фильтры нет вопросов. Измените тему, сложность или источник.</p>}
                <Button className="mt-2 w-full" size="lg" onClick={start} disabled={!pool.length}>
                  <Play /> Начать сессию
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">Клавиши 1–4 — выбор ответа, Enter — проверить</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'bookmarks' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Закладки</CardTitle>
              <CardDescription>Вопросы, которые вы отметили для повторения</CardDescription>
            </div>
            <Button size="sm" onClick={startBookmarks} disabled={!bookmarks.length}>
              <Target /> Практиковать закладки
            </Button>
          </CardHeader>
          <CardContent>
            {bookmarks.length === 0 ? (
              <EmptyState icon={Bookmark} lexi="reading" title="Закладок пока нет" description="Во время практики нажмите на значок закладки, чтобы сохранить вопрос." />
            ) : (
              <div className="divide-y rounded-xl border">
                {bookmarks.map((id) => {
                  const q = qmap.get(id);
                  if (!q) return null;
                  return <BookmarkRow key={id} id={id} title={q.question} subject={q.subject} onOpen={() => setPreview(id)} />;
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>История сессий</CardTitle>
              <CardDescription>Последние 30 практических сессий</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={History} lexi="motivating" title="Сессий пока нет" description="Пройдите первую практическую сессию — результаты появятся здесь." action={<Button onClick={() => setTab('new')}>Начать</Button>} />
            ) : (
              <div className="divide-y rounded-xl border">
                {recent.map((s) => {
                  const c = s.answers.filter((a) => a.correct).length;
                  const p = pct(c, s.answers.length);
                  return (
                    <button key={s.id} onClick={() => setHistoryItem(s)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/50">
                      <SubjectIcon subject={s.subject} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{SUBJECT_MAP[s.subject].name}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDateTime(s.finishedAt)} · {s.answers.length} вопр. · {fmtDuration(s.durationSec)}
                        </div>
                      </div>
                      <Badge variant={p >= 75 ? 'success' : p >= 50 ? 'warning' : 'danger'}>{p}%</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!previewQ} onClose={() => setPreview(null)} title="Вопрос" size="lg">
        {previewQ && (
          <div className="pb-4">
            <QuestionMeta q={previewQ} className="mb-4" />
            <QuestionView q={previewQ} value={null} onChange={() => undefined} reveal keyboard={false} />
            <Explanation q={previewQ} correct />
          </div>
        )}
      </Dialog>

      <Dialog open={!!historyItem} onClose={() => setHistoryItem(null)} title={historyItem ? `${SUBJECT_MAP[historyItem.subject].name} · ${fmtDateTime(historyItem.finishedAt)}` : ''} size="lg">
        {historyItem && (
          <div className="space-y-2 pb-4">
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              <Badge variant="success">Верно: {historyItem.answers.filter((a) => a.correct).length}</Badge>
              <Badge variant="danger">Ошибок: {historyItem.answers.filter((a) => !a.correct).length}</Badge>
              <Badge variant="outline">
                <Clock /> {fmtDuration(historyItem.durationSec)}
              </Badge>
              <Badge variant="violet">+{historyItem.xpEarned} XP</Badge>
            </div>
            {historyItem.answers.map((a, i) => {
              const q = qmap.get(a.questionId);
              if (!q) return null;
              return (
                <button key={i} onClick={() => (setHistoryItem(null), setPreview(q.id))} className="flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm hover:bg-secondary/50">
                  <span className={cn('mt-1 size-2 shrink-0 rounded-full', a.correct ? 'bg-success' : 'bg-danger')} />
                  <span className="line-clamp-2">{q.question}</span>
                </button>
              );
            })}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function BookmarkRow({ id, title, subject, onOpen }: { id: string; title: string; subject: SubjectId; onOpen: () => void }) {
  const toggle = useAppStore((s) => s.toggleBookmark);
  return (
    <div className="flex items-center gap-3 p-3">
      <SubjectIcon subject={subject} className="size-8" />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left text-sm hover:text-primary">
        <span className="line-clamp-2">{title}</span>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Удалить из закладок"
        onClick={() => {
          toggle(id);
          toast.info('Удалено из закладок', undefined, { label: 'Вернуть', onClick: () => toggle(id) });
        }}
      >
        <BookmarkX />
      </Button>
    </div>
  );
}

