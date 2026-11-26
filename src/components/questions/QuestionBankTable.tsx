import { useMemo, useRef, useState } from 'react';
import { Sparkles, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Download, Eye, Pencil, Plus, RotateCcw, Search, Trash2, Upload } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, Input, Select } from '@/components/ui';
import { SubjectIcon } from '@/components/icons';
import { Explanation, QuestionMeta, QuestionView } from '@/components/QuestionView';
import { QuestionEditor } from './QuestionEditor';
import { AiGenerateDialog } from './AiGenerateDialog';
import { DEMO_QUESTIONS, DIFFICULTY_LABEL, SOURCE_LABEL, TYPE_LABEL, VERIFICATION_LABEL } from '@/data/questions';
import { SUBJECTS, SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { isDemoQuestionId, useAllQuestions, useAppStore } from '@/store/useAppStore';
import { questionImportSchema, questionWithPolicySchema } from '@/lib/schemas';
import { cn, downloadJson, plural } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { Difficulty, Question, QuestionSource, QuestionType, SubjectId, VerificationStatus } from '@/types';

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
  const [onlyBm, setOnlyBm] = useState(false);
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<Question | null>(null);
  const [editing, setEditing] = useState<Question | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

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
      if (onlyBm && !bookmarks.includes(x.id)) return false;
      if (needle && !(x.question.toLowerCase().includes(needle) || x.id.toLowerCase().includes(needle) || x.tags.some((t) => t.toLowerCase().includes(needle)))) return false;
      return true;
    });
  }, [questions, q, subject, topic, diff, type, source, ver, onlyBm, bookmarks]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const rows = filtered.slice(cur * PAGE, cur * PAGE + PAGE);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => (fn(v), setPage(0));

  const onImport = async (file: File) => {
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Файл больше 5 МБ');
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
      if (!ok.length) return toast.error('Нет корректных вопросов', `Отклонено: ${bad}. Проверьте формат и темы.`);
      const res = importQuestions(ok);
      toast.success(`Импорт: добавлено ${res.added}, обновлено ${res.updated}`, bad ? `Отклонено ${bad} (ошибки формата, неизвестная тема или официальный без источника)` : undefined);
    } catch (e) {
      toast.error('Не удалось прочитать файл', e instanceof Error ? e.message : undefined);
    }
  };

  const subj = subject === 'all' ? null : SUBJECT_MAP[subject];
  const deletedDemo = DEMO_QUESTIONS.filter((d) => deletedIds.includes(d.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} placeholder="Поиск по тексту, ID или тегу" className="pl-9" aria-label="Поиск вопросов" />
        </div>
        <Button variant="secondary" onClick={() => downloadJson({ app: 'LexEdu', kind: 'questions', exportedAt: new Date().toISOString(), questions: filtered }, `lexedu-questions-${new Date().toISOString().slice(0, 10)}.json`)}>
          <Download /> Экспорт ({filtered.length})
        </Button>
        {admin && (
          <>
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
            <Button variant="secondary" onClick={() => setAiOpen(true)}>
              <Sparkles /> ИИ
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Plus /> Вопрос
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <Select value={subject} onChange={(e) => (setSubject(e.target.value as SubjectId | 'all'), setTopic('all'), setPage(0))} aria-label="Предмет">
          <option value="all">Все предметы</option>
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={topic} onChange={(e) => resetPage(setTopic)(e.target.value)} disabled={!subj} aria-label="Тема">
          <option value="all">{subj ? 'Все темы' : 'Тема'}</option>
          {subj?.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select value={diff} onChange={(e) => resetPage(setDiff)(e.target.value as Difficulty | 'all')} aria-label="Сложность">
          <option value="all">Любая сложность</option>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => resetPage(setType)(e.target.value as QuestionType | 'all')} aria-label="Тип">
          <option value="all">Любой тип</option>
          {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Select value={source} onChange={(e) => resetPage(setSource)(e.target.value as QuestionSource | 'all')} aria-label="Источник">
          <option value="all">Все источники</option>
          {(Object.keys(SOURCE_LABEL) as QuestionSource[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select value={ver} onChange={(e) => resetPage(setVer)(e.target.value as VerificationStatus | 'all')} aria-label="Проверка">
          <option value="all">Любой статус</option>
          {(Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((s) => (
            <option key={s} value={s}>
              {VERIFICATION_LABEL[s]}
            </option>
          ))}
        </Select>
        <Button variant={onlyBm ? 'default' : 'secondary'} onClick={() => (setOnlyBm((v) => !v), setPage(0))} aria-pressed={onlyBm}>
          <Bookmark /> Закладки
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Найдено {filtered.length} {plural(filtered.length, ['вопрос', 'вопроса', 'вопросов'])} из {questions.length}. Демо-вопросы — оригинальные учебные задания LexEdu, а не официальные задания ЕНТ.
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Search} lexi="thinking" title="Ничего не найдено" description="Измените поиск или фильтры." />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border">
          {rows.map((x) => {
            const st = stats.get(x.id);
            const bm = bookmarks.includes(x.id);
            return (
              <div key={x.id} className="flex items-start gap-3 p-3 transition-colors hover:bg-secondary/40">
                <SubjectIcon subject={x.subject} className="mt-0.5 size-8" />
                <button onClick={() => setPreview(x)} className="min-w-0 flex-1 text-left">
                  <div className="line-clamp-2 text-sm">{x.question}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{TOPIC_MAP[x.topic]?.name ?? x.topic}</span>·<span>{DIFFICULTY_LABEL[x.difficulty]}</span>·<span>{TYPE_LABEL[x.type]}</span>
                    <Badge variant={x.source === 'verified' ? 'success' : x.source === 'user' ? 'violet' : 'outline'}>{SOURCE_LABEL[x.source]}</Badge>
                    {x.verification === 'reviewed' && <Badge variant="success">Проверен</Badge>}
                    {x.verification === 'needs_review' && <Badge variant="warning">Требует проверки</Badge>}
                    {admin && overrides[x.id] && <Badge variant="secondary">изменён</Badge>}
                    {admin && <span className="font-mono">{x.id}</span>}
                  </div>
                </button>
                {st && (
                  <span className={cn('mt-1 hidden text-xs tabular sm:block', st.c / st.n >= 0.7 ? 'text-success' : 'text-danger')} title="Верно / всего ответов">
                    {st.c}/{st.n}
                  </span>
                )}
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon-sm" aria-label="Просмотр" onClick={() => setPreview(x)}>
                    <Eye />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={bm ? 'Убрать из закладок' : 'В закладки'} onClick={() => toast.success(toggleBookmark(x.id) ? 'Добавлено в закладки' : 'Удалено из закладок')}>
                    {bm ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
                  </Button>
                  {admin && (
                    <>
                      <Button variant="ghost" size="icon-sm" aria-label="Редактировать" onClick={() => setEditing(x)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Удалить" onClick={() => setToDelete(x)}>
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
          <Button variant="secondary" size="icon-sm" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Предыдущая страница">
            <ChevronLeft />
          </Button>
          <span className="text-sm tabular text-muted-foreground">
            {cur + 1} / {pages}
          </span>
          <Button variant="secondary" size="icon-sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Следующая страница">
            <ChevronRight />
          </Button>
        </div>
      )}

      {admin && deletedDemo.length > 0 && (
        <details className="rounded-xl border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Скрытые демо-вопросы ({deletedDemo.length})</summary>
          <div className="mt-2 space-y-1.5">
            {deletedDemo.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="line-clamp-1 flex-1 text-muted-foreground">{d.question}</span>
                <Button size="sm" variant="ghost" onClick={() => (restore(d.id), toast.success('Вопрос восстановлен'))}>
                  <RotateCcw /> Восстановить
                </Button>
              </div>
            ))}
          </div>
        </details>
      )}

      <Dialog open={!!preview} onClose={() => setPreview(null)} title="Просмотр вопроса" size="lg">
        {preview && (
          <div className="pb-4">
            <QuestionMeta q={preview} className="mb-4" />
            <QuestionView q={preview} value={null} onChange={() => undefined} reveal keyboard={false} />
            <Explanation q={preview} correct />
            {preview.sourceRef && <p className="mt-2 text-xs text-muted-foreground">Источник: {preview.sourceRef}</p>}
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
            upsert(qq);
            toast.success(editing === 'new' ? 'Вопрос добавлен' : 'Вопрос сохранён');
            setEditing(null);
          }}
        />
      )}
      {admin && <AiGenerateDialog open={aiOpen} onClose={() => setAiOpen(false)} />}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Удалить вопрос?"
        description={toDelete && isDemoQuestionId(toDelete.id) ? 'Демо-вопрос будет скрыт из банка. Его можно восстановить ниже. История ответов сохранится.' : 'Пользовательский вопрос будет удалён без возможности восстановления. История ответов сохранится.'}
        confirmLabel="Удалить"
        onConfirm={() => {
          if (toDelete) {
            del(toDelete.id);
            toast.success('Вопрос удалён');
          }
        }}
      />
    </div>
  );
}
