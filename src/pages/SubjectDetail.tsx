import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, Circle, CircleDot, Lightbulb, Play, Plus, Search, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, Dialog, EmptyState, Input, Progress, Select } from '@/components/ui';
import { ChartTooltip, CHART, RingProgress, axisProps } from '@/components/charts';
import { SubjectIcon } from '@/components/icons';
import { Explanation, QuestionMeta, QuestionView } from '@/components/QuestionView';
import { AddQuestionDialog } from '@/components/AddQuestionDialog';
import { SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { DIFFICULTY_LABEL, SOURCE_LABEL, TYPE_LABEL } from '@/data/questions';
import { useAppStore, useStudyQuestions } from '@/store/useAppStore';
import { useSubjectSummary } from '@/hooks/useStats';
import { cn, fmtNum } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Difficulty, Question, SubjectId, TopicStatus } from '@/types';
import { MathText } from '@/components/MathText';
import { tr } from '@/i18n';

const STATUS: Record<TopicStatus, { label: string; icon: typeof Circle; cls: string }> = {
  not_started: { get label() {
    return tr('Не начата');
  }, icon: Circle, cls: 'text-muted-foreground' },
  in_progress: { get label() {
    return tr('В процессе');
  }, icon: CircleDot, cls: 'text-warning' },
  completed: { get label() {
    return tr('Освоена');
  }, icon: CheckCircle2, cls: 'text-success' },
};

export default function SubjectDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const subject = SUBJECT_MAP[id as SubjectId];
  if (!subject) return <EmptyState icon={Search} title={tr('Предмет не найден')} action={<Button onClick={() => navigate('/subjects')}>{tr('Все предметы')}</Button>} />;
  return <SubjectView key={subject.id} subjectId={subject.id} params={params} setParams={setParams} />;
}

function SubjectView({ subjectId, params, setParams }: { subjectId: SubjectId; params: URLSearchParams; setParams: ReturnType<typeof useSearchParams>[1] }) {
  const navigate = useNavigate();
  const subject = SUBJECT_MAP[subjectId];
  const summary = useSubjectSummary(subjectId);
  const all = useStudyQuestions().list;
  const attempts = useAppStore((s) => s.attempts);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const setTopicStatus = useAppStore((s) => s.setTopicStatus);
  const topicStatus = useAppStore((s) => s.topicStatus);
  const deleteCustom = useAppStore((s) => s.deleteCustomQuestion);
  const questions = useMemo(() => all.filter((q) => q.subject === subjectId), [all, subjectId]);

  const [search, setSearch] = useState('');
  const [fTopic, setFTopic] = useState(params.get('topic') ?? 'all');
  const [fDiff, setFDiff] = useState<Difficulty | 'all'>('all');
  const [fSource, setFSource] = useState<Question['source'] | 'all'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [shown, setShown] = useState(50);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const previewId = params.get('q');
  const preview = previewId ? questions.find((q) => q.id === previewId) : undefined;

  useEffect(() => {
    const t = params.get('topic');
    if (t) {
      setFTopic(t);
      setTimeout(() => document.getElementById(`topic-${t}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [params]);

  const sAttempts = useMemo(() => attempts.filter((a) => a.subject === subjectId), [attempts, subjectId]);
  const diffData = useMemo(
    () =>
      (['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
        const att = sAttempts.filter((a) => a.difficulty === d);
        return {
          name: DIFFICULTY_LABEL[d],
          count: questions.filter((q) => q.difficulty === d).length,
          accuracy: att.length ? Math.round((att.filter((a) => a.correct).length / att.length) * 100) : 0,
          attempts: att.length,
        };
      }),
    [sAttempts, questions],
  );

  const qStats = useMemo(() => {
    const m = new Map<string, { n: number; c: number }>();
    for (const a of sAttempts) {
      const e = m.get(a.questionId) ?? { n: 0, c: 0 };
      e.n++;
      if (a.correct) e.c++;
      m.set(a.questionId, e);
    }
    return m;
  }, [sAttempts]);

  const filtered = questions.filter((q) => {
    if (fTopic !== 'all' && q.topic !== fTopic) return false;
    if (fDiff !== 'all' && q.difficulty !== fDiff) return false;
    if (fSource !== 'all' && q.source !== fSource) return false;
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const notStarted = summary.topics.filter((t) => t.status === 'not_started');
  const weak = summary.topics.filter((t) => t.attempts >= 3 && t.accuracy < 0.65).sort((a, b) => a.accuracy - b.accuracy);
  const recommendations = [
    ...weak.slice(0, 2).map((t) => ({ text: tr('«{0}»: точность {1}%. Рекомендуем {2}.', t.name, Math.round(t.accuracy * 100), TOPIC_MAP[t.id].advice), topic: t.id })),
    ...notStarted.slice(0, 2).map((t) => ({ text: tr('Тема «{0}» ещё не начата — начните с 5 лёгких вопросов.', t.name), topic: t.id })),
  ];
  if (!recommendations.length) recommendations.push({ text: tr('Все темы в хорошем состоянии. Закрепите результат пробным экзаменом по предмету.'), topic: '' });

  const closePreview = () => {
    params.delete('q');
    setParams(params, { replace: true });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/subjects')}>
        <ArrowLeft /> {tr('Все предметы')}
      </Button>

      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-4">
            <SubjectIcon subject={subjectId} className="size-14 [&_svg]:size-7" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{subject.name}</h2>
              <p className="text-sm text-muted-foreground">
                {tr('{0} · {1} тем · {2} вопросов', subject.kind === 'mandatory' ? tr('Обязательный предмет ЕНТ') : tr('Профильный предмет'), subject.topics.length, questions.length)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate(`/practice?subject=${subjectId}`)}>
                  <Play /> {tr('Практика')}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                  <Plus /> {tr('Добавить вопрос')}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <RingProgress value={summary.progress / 100} size={96} stroke={8}>
              <div>
                <div className="text-lg font-semibold tabular">{summary.progress}%</div>
                <div className="text-[10px] text-muted-foreground">{tr('прогресс')}</div>
              </div>
            </RingProgress>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{tr('Точность')}</div>
                <div className="font-semibold tabular">{summary.attempts ? `${Math.round(summary.accuracy * 100)}%` : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tr('Ответов')}</div>
                <div className="font-semibold tabular">{fmtNum(summary.attempts)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tr('Уровень')}</div>
                <div className="font-semibold">{summary.level}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tr('Освоено тем')}</div>
                <div className="font-semibold tabular">
                  {summary.completedTopics}/{subject.topics.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{tr('Темы и подтемы')}</CardTitle>
              <CardDescription>{tr('Статус обновляется автоматически, но его можно задать вручную')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.topics.map((t) => {
              const st = STATUS[t.status];
              const manual = topicStatus[t.id] !== undefined;
              return (
                <div key={t.id} id={`topic-${t.id}`} className={cn('rounded-xl border p-4 transition-colors', params.get('topic') === t.id && 'border-primary ring-1 ring-primary')}>
                  <div className="flex flex-wrap items-center gap-3">
                    <st.icon className={cn('size-5 shrink-0', st.cls)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{TOPIC_MAP[t.id].subtopics.map((x) => tr(x)).join(' · ')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={manual ? t.status : 'auto'}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTopicStatus(t.id, v === 'auto' ? null : (v as TopicStatus));
                          toast.success(tr('Статус темы обновлён'), t.name);
                        }}
                        className="h-8 w-36 text-xs"
                        aria-label={tr('Статус темы {0}', t.name)}
                      >
                        <option value="auto">{tr('Авто: {0}', st.label.toLowerCase())}</option>
                        <option value="not_started">{tr('Не начата')}</option>
                        <option value="in_progress">{tr('В процессе')}</option>
                        <option value="completed">{tr('Освоена')}</option>
                      </Select>
                      <Button size="icon-sm" variant="secondary" onClick={() => navigate(`/practice?subject=${subjectId}&topic=${t.id}`)} aria-label={tr('Практика по теме {0}', t.name)}>
                        <Play />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="mb-1 flex justify-between text-muted-foreground">
                        <span>{tr('Прогресс')}</span>
                        <span className="tabular">{t.progress}%</span>
                      </div>
                      <Progress value={t.progress} />
                    </div>
                    <div>
                      <div className="text-muted-foreground">{tr('Точность')}</div>
                      <div className={cn('font-semibold tabular', t.attempts ? (t.accuracy >= 0.75 ? 'text-success' : t.accuracy < 0.5 ? 'text-danger' : '') : 'text-muted-foreground')}>{t.attempts ? `${Math.round(t.accuracy * 100)}%` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{tr('Ответов / вопросов')}</div>
                      <div className="font-semibold tabular">
                        {t.attempts} / {t.questionCount}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{tr('Сложность')}</CardTitle>
                <CardDescription>{tr('Ваша точность по уровням сложности')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diffData} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis domain={[0, 100]} {...axisProps} />
                    <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltip fmt={(v) => `${v}%`} />} />
                    <Bar dataKey="accuracy" name={tr('Точность')} fill={CHART.c1} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {diffData.map((d) => (
                  <div key={d.name} className="rounded-lg bg-secondary/60 p-2">
                    <div className="font-semibold tabular">{d.count}</div>
                    <div className="text-[10px] text-muted-foreground">{tr('вопросов · {0} отв.', d.attempts)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-violet" /> {tr('Рекомендации')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((r, i) => (
                <div key={i} className="rounded-xl bg-secondary/60 p-3 text-sm">
                  <p className="text-muted-foreground">{r.text}</p>
                  <Button size="sm" variant="link" className="mt-1" onClick={() => navigate(r.topic ? `/practice?subject=${subjectId}&topic=${r.topic}` : '/exams')}>
                    {r.topic ? tr('Тренировать') : tr('К экзаменам')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>{tr('Банк вопросов')}</CardTitle>
            <CardDescription>
              {tr('{0} из {1}. Демо-вопросы — оригинальные учебные задания LexEdu, не официальные задания ЕНТ.', filtered.length, questions.length)}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus /> {tr('Свой вопрос')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Поиск по тексту')} className="pl-9" aria-label={tr('Поиск вопросов')} />
            </div>
            <Select value={fTopic} onChange={(e) => setFTopic(e.target.value)} aria-label={tr('Фильтр по теме')}>
              <option value="all">{tr('Все темы')}</option>
              {subject.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select value={fDiff} onChange={(e) => setFDiff(e.target.value as Difficulty | 'all')} aria-label={tr('Фильтр по сложности')}>
              <option value="all">{tr('Любая сложность')}</option>
              <option value="easy">{tr('Лёгкие')}</option>
              <option value="medium">{tr('Средние')}</option>
              <option value="hard">{tr('Сложные')}</option>
            </Select>
            <Select value={fSource} onChange={(e) => setFSource(e.target.value as Question['source'] | 'all')} aria-label={tr('Фильтр по источнику')}>
              <option value="all">{tr('Все источники')}</option>
              <option value="demo">{SOURCE_LABEL.demo}</option>
              <option value="user">{SOURCE_LABEL.user}</option>
              <option value="verified">{SOURCE_LABEL.verified}</option>
              <option value="open">{SOURCE_LABEL.open}</option>
            </Select>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={Search} lexi="thinking" title={tr('Вопросы не найдены')} description={tr('Измените фильтры или добавьте собственный вопрос.')} />
          ) : (
            <div className="divide-y rounded-xl border">
              {filtered.slice(0, shown).map((q) => {
                const st = qStats.get(q.id);
                const bm = bookmarks.includes(q.id);
                return (
                  <div key={q.id} className="flex items-center gap-3 p-3">
                    <button onClick={() => setParams({ ...Object.fromEntries(params), q: q.id }, { replace: true })} className="min-w-0 flex-1 text-left">
                      <div className="line-clamp-2 text-sm hover:text-primary"><MathText text={q.question} noSub={q.subject === 'informatics'} /></div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{TOPIC_MAP[q.topic]?.name}</span>·<span>{DIFFICULTY_LABEL[q.difficulty]}</span>·<span>{TYPE_LABEL[q.type]}</span>
                        {q.source !== 'demo' && <Badge variant={q.source === 'user' ? 'violet' : q.source === 'open' ? 'outline' : 'success'}>{SOURCE_LABEL[q.source]}</Badge>}
                      </div>
                    </button>
                    {st && (
                      <span className={cn('hidden text-xs tabular sm:block', st.c / st.n >= 0.7 ? 'text-success' : 'text-danger')}>
                        {st.c}/{st.n}
                      </span>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label={bm ? tr('Убрать из закладок') : tr('В закладки')} onClick={() => toast.success(toggleBookmark(q.id) ? tr('Добавлено в закладки') : tr('Удалено из закладок'))}>
                      {bm ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
                    </Button>
                    {q.source === 'user' && (
                      <Button variant="ghost" size="icon-sm" aria-label={tr('Удалить вопрос')} onClick={() => setToDelete(q)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                );
              })}
              {filtered.length > shown && (
                <div className="flex items-center justify-between gap-3 p-3 text-sm text-muted-foreground">
                  <span>
                    {tr('Показано {0} из {1}', shown, filtered.length)}
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setShown(shown + 50)}>
                    {tr('Показать ещё')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onClose={closePreview} title={tr('Просмотр вопроса')} size="lg">
        {preview && (
          <div className="pb-4">
            <QuestionMeta q={preview} className="mb-4" />
            <QuestionView q={preview} value={null} onChange={() => undefined} reveal keyboard={false} />
            <Explanation q={preview} correct />
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => toast.success(toggleBookmark(preview.id) ? tr('Добавлено в закладки') : tr('Удалено из закладок'))}>
                {bookmarks.includes(preview.id) ? <BookmarkCheck /> : <Bookmark />} {bookmarks.includes(preview.id) ? tr('В закладках') : tr('В закладки')}
              </Button>
              <Button size="sm" onClick={() => navigate(`/practice?subject=${subjectId}&topic=${preview.topic}`)}>
                <Play /> {tr('Практика по теме')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <AddQuestionDialog open={addOpen} onClose={() => setAddOpen(false)} subject={subjectId} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title={tr('Удалить вопрос?')}
        description={tr('Вопрос будет удалён из банка, закладок и тетради ошибок.')}
        confirmLabel={tr('Удалить')}
        onConfirm={() => {
          if (toDelete) {
            deleteCustom(toDelete.id);
            toast.success(tr('Вопрос удалён'));
          }
        }}
      />
    </div>
  );
}
