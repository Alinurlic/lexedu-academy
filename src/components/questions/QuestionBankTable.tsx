import { useMemo, useRef, useState } from 'react';
import { Sparkles, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Download, Eye, Pencil, Plus, RotateCcw, Search, Trash2, Upload } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, Input, Select } from '@/components/ui';
import { SubjectIcon } from '@/components/icons';
import { Explanation, QuestionMeta, QuestionView } from '@/components/QuestionView';
import { QuestionEditor } from './QuestionEditor';
import { AiGenerateDialog } from './AiGenerateDialog';
import { builtinQuestions, getModerationRows, useBank } from '@/data/questions/bank';
import { DIFFICULTY_LABEL, SOURCE_LABEL, TYPE_LABEL, VERIFICATION_LABEL } from '@/data/questions';
import { SUBJECTS, SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { isDemoQuestionId, useAllQuestions, useAppStore } from '@/store/useAppStore';
import { questionImportSchema, questionWithPolicySchema } from '@/lib/schemas';
import { cn, downloadJson, plural } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Difficulty, Question, QuestionSource, QuestionType, SubjectId, VerificationStatus, QuestionLang } from '@/types';
import { questionLang } from '@/data/questions/lang';
import { MathText } from '@/components/MathText';
import { moderate } from '@/lib/moderation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { tr } from '@/i18n';

const PAGE = 40;

/** Централизованный банк вопросов. В режиме admin доступны редактирование, удаление и импорт. */
export function QuestionBankTable({ admin }: { admin?: boolean }) {
  const questions = useAllQuestions();
  const bookmarks = useAppStore((s) => s.bookmarks);
  const attempts = useAppStore((s) => s.attempts);
  const deletedIds = useAppStore((s) => s.deletedQuestionIds);
  const overrides = useAppStore((s) => s.questionOverrides);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const upsert = useAppStore((s) => s.upsertQuestion);
  const del = useAppStore((s) => s.deleteQuestion);
  const restore = useAppStore((s) => s.restoreQuestion);
  const importQuestions = useAppStore((s) => s.importQuestions);
  const fileRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState('');
  const [subject, setSubject] = useState<SubjectId | 'all'>('all');
  const [topic, setTopic] = useState('all');
  const [diff, setDiff] = useState<Difficulty | 'all'>('all');
  const [type, setType] = useState<QuestionType | 'all'>('all');
  const [source, setSource] = useState<QuestionSource | 'all'>('all');
  const [ver, setVer] = useState<VerificationStatus | 'all'>('all');
  // ученику, сдающему ЕНТ на казахском, сразу показываем задания на казахском (фильтр можно сменить)
  const [lang, setLang] = useState<QuestionLang | 'all'>(() => (!admin && useAppStore.getState().profile.entLang === 'kk' ? 'kk' : 'all'));
  const [onlyBm, setOnlyBm] = useState(false);
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<Question | null>(null);
  const [editing, setEditing] = useState<Question | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  useBank((st) => st.version); // перерисовка после загрузки/изменения общих правок

  const stats = useMemo(() => {
    const m = new Map<string, { n: number; c: number }>();
    for (const a of attempts) {
      const e = m.get(a.questionId) ?? { n: 0, c: 0 };
      e.n++;
      if (a.correct) e.c++;
      m.set(a.questionId, e);
    }
    return m;
  }, [attempts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return questions.filter((x) => {
      if (subject !== 'all' && x.subject !== subject) return false;
      if (topic !== 'all' && x.topic !== topic) return false;
      if (diff !== 'all' && x.difficulty !== diff) return false;
      if (type !== 'all' && x.type !== type) return false;
      if (source !== 'all' && x.source !== source) return false;
      if (ver !== 'all' && (x.verification ?? 'unverified') !== ver) return false;
      if (lang !== 'all' && questionLang(x) !== lang) return false;
      if (onlyBm && !bookmarks.includes(x.id)) return false;
      if (needle && !(x.question.toLowerCase().includes(needle) || x.id.toLowerCase().includes(needle) || x.tags.some((t) => t.toLowerCase().includes(needle)))) return false;
      return true;
    });
  }, [questions, q, subject, topic, diff, type, source, ver, lang, onlyBm, bookmarks]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const rows = filtered.slice(cur * PAGE, cur * PAGE + PAGE);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => (fn(v), setPage(0));

  const onImport = async (file: File) => {
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error(tr('Файл больше 5 МБ'));
      const raw = questionImportSchema.parse(JSON.parse(await file.text()));
      const list = Array.isArray(raw) ? raw : raw.questions;
      const ok: Question[] = [];
      let bad = 0;
      for (const item of list) {
        const r = questionWithPolicySchema.safeParse(item);
        if (!r.success || !TOPIC_MAP[r.data.topic] || TOPIC_MAP[r.data.topic].subject !== r.data.subject) {
          bad++;
          continue;
        }
        const qq = r.data as Question;
        // «демо»-метку носят только оригинальные вопросы LexEdu
        ok.push(qq.source === 'demo' && !isDemoQuestionId(qq.id) ? { ...qq, source: 'user' } : qq);
      }
      if (!ok.length) return toast.error(tr('Нет корректных вопросов'), tr('Отклонено: {0}. Проверьте формат и темы.', bad));
      const res = importQuestions(ok);
      toast.success(tr('Импорт: добавлено {0}, обновлено {1}', res.added, res.updated), bad ? tr('Отклонено {0} (ошибки формата, неизвестная тема или официальный без источника)', bad) : undefined);
    } catch (e) {
      toast.error(tr('Не удалось прочитать файл'), e instanceof Error ? e.message : undefined);
    }
  };

  const subj = subject === 'all' ? null : SUBJECT_MAP[subject];
  // С Supabase правки встроенных заданий администратор делает для всех учеников (question_moderation)
  const globalMode = admin && isSupabaseConfigured;
  const hiddenIds = globalMode ? getModerationRows().filter((r) => r.hidden).map((r) => r.question_id) : deletedIds;
  const deletedDemo = builtinQuestions().filter((d) => hiddenIds.includes(d.id));
  const restoreQ = async (id: string) => {
    try {
      if (globalMode) await moderate(id, { hidden: false });
      else restore(id);
      toast.success(globalMode ? tr('Вопрос снова виден всем ученикам') : tr('Вопрос восстановлен'));
    } catch (e) {
      toast.error(tr('Не удалось восстановить'), e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} placeholder={tr('Поиск по тексту, ID или тегу')} className="pl-9" aria-label={tr('Поиск вопросов')} />
        </div>
        <Button variant="secondary" onClick={() => downloadJson({ app: 'LexEdu', kind: 'questions', exportedAt: new Date().toISOString(), questions: filtered }, `lexedu-questions-${new Date().toISOString().slice(0, 10)}.json`)}>
          <Download /> {tr('Экспорт ({0})', filtered.length)}
        </Button>
        {admin && (
          <>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload /> {tr('Импорт JSON')}
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
            <Button variant="secondary" onClick={() => setAiOpen(true)}>
              <Sparkles /> {tr('ИИ')}
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Plus /> {tr('Вопрос')}
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Select value={subject} onChange={(e) => (setSubject(e.target.value as SubjectId | 'all'), setTopic('all'), setPage(0))} aria-label={tr('Предмет')}>
          <option value="all">{tr('Все предметы')}</option>
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={topic} onChange={(e) => resetPage(setTopic)(e.target.value)} disabled={!subj} aria-label={tr('Тема')}>
          <option value="all">{subj ? tr('Все темы') : tr('Тема')}</option>
          {subj?.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select value={diff} onChange={(e) => resetPage(setDiff)(e.target.value as Difficulty | 'all')} aria-label={tr('Сложность')}>
          <option value="all">{tr('Любая сложность')}</option>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => resetPage(setType)(e.target.value as QuestionType | 'all')} aria-label={tr('Тип')}>
          <option value="all">{tr('Любой тип')}</option>
          {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Select value={source} onChange={(e) => resetPage(setSource)(e.target.value as QuestionSource | 'all')} aria-label={tr('Источник')}>
          <option value="all">{tr('Все источники')}</option>
          {(Object.keys(SOURCE_LABEL) as QuestionSource[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select value={ver} onChange={(e) => resetPage(setVer)(e.target.value as VerificationStatus | 'all')} aria-label={tr('Проверка')}>
          <option value="all">{tr('Любой статус')}</option>
          {(Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((s) => (
            <option key={s} value={s}>
              {VERIFICATION_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select value={lang} onChange={(e) => resetPage(setLang)(e.target.value as QuestionLang | 'all')} aria-label={tr('Язык')}>
          <option value="all">{tr('Любой язык')}</option>
          <option value="ru">{tr('Русский')}</option>
          <option value="kk">{tr('Казахский')}</option>
          <option value="en">{tr('Английский')}</option>
        </Select>
        <Button variant={onlyBm ? 'default' : 'secondary'} onClick={() => (setOnlyBm((v) => !v), setPage(0))} aria-pressed={onlyBm}>
          <Bookmark /> {tr('Закладки')}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        {tr('Найдено {0} {1} из {2}. Демо-вопросы — оригинальные учебные задания LexEdu, а не официальные задания ЕНТ.', filtered.length, plural(filtered.length, ['вопрос', 'вопроса', 'вопросов']), questions.length)}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Search} lexi="thinking" title={tr('Ничего не найдено')} description={tr('Измените поиск или фильтры.')} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border">
          {rows.map((x) => {
            const st = stats.get(x.id);
            const bm = bookmarks.includes(x.id);
            return (
              <div key={x.id} className="flex items-start gap-3 p-3 transition-colors hover:bg-secondary/40">
                <SubjectIcon subject={x.subject} className="mt-0.5 size-8" />
                <button onClick={() => setPreview(x)} className="min-w-0 flex-1 text-left">
                  <div className="line-clamp-2 text-sm"><MathText text={x.question} noSub={x.subject === 'informatics'} /></div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{TOPIC_MAP[x.topic]?.name ?? x.topic}</span>·<span>{DIFFICULTY_LABEL[x.difficulty]}</span>·<span>{TYPE_LABEL[x.type]}</span>
                    <Badge variant={x.source === 'verified' ? 'success' : x.source === 'user' ? 'violet' : 'outline'}>{SOURCE_LABEL[x.source]}</Badge>
                    {x.verification === 'reviewed' && <Badge variant="success">{tr('Проверен')}</Badge>}
                    {x.verification === 'needs_review' && <Badge variant="warning">{tr('Требует проверки')}</Badge>}
                    {admin && overrides[x.id] && <Badge variant="secondary">{tr('изменён')}</Badge>}
                    {admin && <span className="font-mono">{x.id}</span>}
                  </div>
                </button>
                {st && (
                  <span className={cn('mt-1 hidden text-xs tabular sm:block', st.c / st.n >= 0.7 ? 'text-success' : 'text-danger')} title={tr('Верно / всего ответов')}>
                    {st.c}/{st.n}
                  </span>
                )}
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon-sm" aria-label={tr('Просмотр')} onClick={() => setPreview(x)}>
                    <Eye />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={bm ? tr('Убрать из закладок') : tr('В закладки')} onClick={() => toast.success(toggleBookmark(x.id) ? tr('Добавлено в закладки') : tr('Удалено из закладок'))}>
                    {bm ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
                  </Button>
                  {admin && (
                    <>
                      <Button variant="ghost" size="icon-sm" aria-label={tr('Редактировать')} onClick={() => setEditing(x)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={tr('Удалить')} onClick={() => setToDelete(x)}>
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="icon-sm" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label={tr('Предыдущая страница')}>
            <ChevronLeft />
          </Button>
          <span className="text-sm tabular text-muted-foreground">
            {cur + 1} / {pages}
          </span>
          <Button variant="secondary" size="icon-sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label={tr('Следующая страница')}>
            <ChevronRight />
          </Button>
        </div>
      )}

      {admin && deletedDemo.length > 0 && (
        <details className="rounded-xl border p-3 text-sm">
          <summary className="cursor-pointer font-medium">{globalMode ? tr('Скрыты для всех учеников') : tr('Скрытые демо-вопросы')} ({deletedDemo.length})</summary>
          <div className="mt-2 space-y-1.5">
            {deletedDemo.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="line-clamp-1 flex-1 text-muted-foreground"><MathText text={d.question} noSub={d.subject === 'informatics'} /></span>
                <Button size="sm" variant="ghost" onClick={() => void restoreQ(d.id)}>
                  <RotateCcw /> {tr('Восстановить')}
                </Button>
              </div>
            ))}
          </div>
        </details>
      )}

      <Dialog open={!!preview} onClose={() => setPreview(null)} title={tr('Просмотр вопроса')} size="lg">
        {preview && (
          <div className="pb-4">
            <QuestionMeta q={preview} className="mb-4" />
            <QuestionView q={preview} value={null} onChange={() => undefined} reveal keyboard={false} />
            <Explanation q={preview} correct />
            {preview.sourceRef && <p className="mt-2 text-xs text-muted-foreground">{tr('Источник: {0}', preview.sourceRef)}</p>}
          </div>
        )}
      </Dialog>

      {admin && (
        <QuestionEditor
          open={editing !== null}
          question={editing === 'new' ? null : editing}
          defaultSubject={subject === 'all' ? 'math' : subject}
          onClose={() => setEditing(null)}
          onSave={(qq) => {
            if (globalMode && editing !== 'new' && isDemoQuestionId(qq.id)) {
              void moderate(qq.id, { override: qq })
                .then(() => (toast.success(tr('Исправление сохранено для всех учеников')), setEditing(null)))
                .catch((e) => toast.error(tr('Не удалось сохранить'), e instanceof Error ? e.message : undefined));
              return;
            }
            upsert(qq);
            toast.success(editing === 'new' ? tr('Вопрос добавлен') : tr('Вопрос сохранён'));
            setEditing(null);
          }}
        />
      )}
      {admin && <AiGenerateDialog open={aiOpen} onClose={() => setAiOpen(false)} />}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title={tr('Удалить вопрос?')}
        description={toDelete && isDemoQuestionId(toDelete.id) ? tr('Демо-вопрос будет скрыт из банка. Его можно восстановить ниже. История ответов сохранится.') : tr('Пользовательский вопрос будет удалён без возможности восстановления. История ответов сохранится.')}
        confirmLabel={tr('Удалить')}
        onConfirm={() => {
          if (!toDelete) return;
          if (globalMode && isDemoQuestionId(toDelete.id)) {
            void moderate(toDelete.id, { hidden: true })
              .then(() => toast.success(tr('Вопрос скрыт для всех учеников')))
              .catch((e) => toast.error(tr('Не удалось скрыть'), e instanceof Error ? e.message : undefined));
            return;
          }
          del(toDelete.id);
          toast.success(tr('Вопрос удалён'));
        }}
      />
    </div>
  );
}
