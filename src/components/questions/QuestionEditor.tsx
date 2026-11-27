import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, FieldError, Input, Label, Segmented, Select, Textarea } from '@/components/ui';
import { SUBJECTS, SUBJECT_MAP } from '@/data/subjects';
import { questionWithPolicySchema } from '@/lib/schemas';
import { cn, uid } from '@/lib/utils';
import type { Difficulty, Question, QuestionSource, QuestionType, SubjectId, VerificationStatus } from '@/types';

interface Form {
  id: string;
  subject: SubjectId;
  topic: string;
  difficulty: Difficulty;
  type: QuestionType;
  question: string;
  passage: string;
  options: string[];
  correctSingle: number;
  correctMulti: number[];
  correctNumber: string;
  correctBool: boolean;
  unit: string;
  explanation: string;
  source: QuestionSource;
  sourceRef: string;
  sourceNote: string;
  verification: VerificationStatus;
  tags: string;
}

function toForm(q: Question | null, subject: SubjectId): Form {
  if (!q)
    return {
      id: uid('uq'),
      subject,
      topic: SUBJECT_MAP[subject].topics[0]?.id ?? '',
      difficulty: 'medium',
      type: 'single',
      question: '',
      passage: '',
      options: ['', '', '', ''],
      correctSingle: 0,
      correctMulti: [],
      correctNumber: '',
      correctBool: true,
      unit: '',
      explanation: '',
      source: 'user',
      sourceRef: '',
      sourceNote: '',
      verification: 'unverified',
      tags: '',
    };
  return {
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    type: q.type,
    question: q.question,
    passage: q.passage ?? '',
    options: q.type === 'single' || q.type === 'multiple' ? [...q.options] : ['', '', '', ''],
    correctSingle: q.type === 'single' ? q.correctAnswer : 0,
    correctMulti: q.type === 'multiple' ? [...q.correctAnswer] : [],
    correctNumber: q.type === 'numeric' ? String(q.correctAnswer) : '',
    correctBool: q.type === 'boolean' ? q.correctAnswer : true,
    unit: q.type === 'numeric' ? (q.unit ?? '') : '',
    explanation: q.explanation,
    source: q.source,
    sourceRef: q.sourceRef ?? '',
    sourceNote: q.sourceNote ?? '',
    verification: q.verification ?? 'unverified',
    tags: q.tags.join(', '),
  };
}

function fromForm(f: Form): unknown {
  const base = {
    id: f.id,
    subject: f.subject,
    topic: f.topic,
    difficulty: f.difficulty,
    question: f.question.trim(),
    passage: f.passage.trim() || undefined,
    explanation: f.explanation.trim(),
    source: f.source,
    sourceRef: f.sourceRef.trim() || undefined,
    sourceNote: f.sourceNote.trim() || undefined,
    verification: f.verification,
    tags: f.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };
  const opts = f.options.map((o) => o.trim());
  switch (f.type) {
    case 'single':
      return { ...base, type: 'single', options: opts, correctAnswer: f.correctSingle };
    case 'multiple':
      return { ...base, type: 'multiple', options: opts, correctAnswer: [...f.correctMulti].sort() };
    case 'numeric':
      return { ...base, type: 'numeric', correctAnswer: Number(f.correctNumber.replace(',', '.').replace('−', '-')), tolerance: 1e-6, unit: f.unit.trim() || undefined };
    case 'boolean':
      return { ...base, type: 'boolean', correctAnswer: f.correctBool };
  }
}

/** Полный редактор вопроса для админ-панели. Валидация — Zod, включая правило об официальных источниках. */
export function QuestionEditor({ open, question, defaultSubject = 'math', onClose, onSave }: { open: boolean; question: Question | null; defaultSubject?: SubjectId; onClose: () => void; onSave: (q: Question) => void }) {
  const [f, setF] = useState<Form>(() => toForm(question, defaultSubject));
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) {
      setF(toForm(question, defaultSubject));
      setErrors({});
    }
  }, [open, question, defaultSubject]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const hasOptions = f.type === 'single' || f.type === 'multiple';

  const save = () => {
    const e: Record<string, string> = {};
    if (f.question.trim().length < 5) e.question = 'Минимум 5 символов';
    if (f.explanation.trim().length < 3) e.explanation = 'Добавьте объяснение';
    if (hasOptions && f.options.filter((o) => o.trim()).length !== f.options.length) e.options = 'Заполните все варианты или удалите пустые';
    if (hasOptions && f.options.length < 2) e.options = 'Нужно минимум 2 варианта';
    if (f.type === 'multiple' && f.correctMulti.length === 0) e.options = 'Отметьте хотя бы один верный вариант';
    if (f.type === 'numeric' && !Number.isFinite(Number(f.correctNumber.replace(',', '.').replace('−', '-'))) ) e.correctNumber = 'Введите число';
    if (f.type === 'numeric' && f.correctNumber.trim() === '') e.correctNumber = 'Введите число';
    const res = questionWithPolicySchema.safeParse(fromForm(f));
    if (!res.success) for (const i of res.error.issues) e[String(i.path[0])] ??= i.message;
    setErrors(e);
    if (Object.keys(e).length || !res.success) return;
    // поля, которых нет в форме (язык, аудио, группа заданий), сохраняем из исходного вопроса
    const keep = question ? { lang: question.lang, audio: question.audio, group: question.group, context: question.context } : {};
    onSave({ ...keep, ...(res.data as Question) } as Question);
  };

  const subj = SUBJECT_MAP[f.subject];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={question ? 'Редактирование вопроса' : 'Новый вопрос'}
      description={question ? `ID: ${question.id}` : 'Вопрос будет добавлен в банк'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save}>Сохранить</Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="qe-subj">Предмет</Label>
            <Select id="qe-subj" value={f.subject} onChange={(e) => setF((x) => ({ ...x, subject: e.target.value as SubjectId, topic: SUBJECT_MAP[e.target.value as SubjectId].topics[0]?.id ?? '' }))}>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="qe-topic">Тема</Label>
            <Select id="qe-topic" value={f.topic} onChange={(e) => set('topic', e.target.value)}>
              {subj.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="qe-diff">Сложность</Label>
            <Select id="qe-diff" value={f.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>
              <option value="easy">Лёгкий</option>
              <option value="medium">Средний</option>
              <option value="hard">Сложный</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Тип ответа</Label>
          <Segmented size="sm" value={f.type} onChange={(v) => set('type', v)} options={[{ value: 'single', label: 'Один' }, { value: 'multiple', label: 'Несколько' }, { value: 'numeric', label: 'Число' }, { value: 'boolean', label: 'Верно/Неверно' }]} />
        </div>
        <div>
          <Label htmlFor="qe-q">Текст вопроса</Label>
          <Textarea id="qe-q" value={f.question} onChange={(e) => set('question', e.target.value)} />
          <FieldError>{errors.question}</FieldError>
        </div>
        <div>
          <Label htmlFor="qe-p">Текст для чтения (необязательно)</Label>
          <Textarea id="qe-p" value={f.passage} onChange={(e) => set('passage', e.target.value)} className="min-h-[60px]" />
        </div>

        {hasOptions && (
          <div>
            <Label>Варианты (отметьте верные)</Label>
            <div className="space-y-2">
              {f.options.map((o, i) => {
                const on = f.type === 'single' ? f.correctSingle === i : f.correctMulti.includes(i);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`Вариант ${i + 1} верный`}
                      onClick={() => (f.type === 'single' ? set('correctSingle', i) : set('correctMulti', on ? f.correctMulti.filter((x) => x !== i) : [...f.correctMulti, i]))}
                      className={cn('grid size-8 shrink-0 place-items-center border-2 text-xs font-semibold', f.type === 'single' ? 'rounded-full' : 'rounded-md', on ? 'border-success bg-success text-white' : 'border-input text-muted-foreground')}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input value={o} onChange={(e) => set('options', f.options.map((x, j) => (j === i ? e.target.value : x)))} />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Удалить вариант"
                      disabled={f.options.length <= 2}
                      onClick={() =>
                        setF((x) => ({
                          ...x,
                          options: x.options.filter((_, j) => j !== i),
                          correctSingle: x.correctSingle === i ? 0 : x.correctSingle > i ? x.correctSingle - 1 : x.correctSingle,
                          correctMulti: x.correctMulti.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)),
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
              {f.options.length < 6 && (
                <Button size="sm" variant="ghost" onClick={() => set('options', [...f.options, ''])}>
                  <Plus /> Вариант
                </Button>
              )}
            </div>
            <FieldError>{errors.options || errors.correctAnswer}</FieldError>
          </div>
        )}
        {f.type === 'numeric' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="qe-num">Правильный ответ</Label>
              <Input id="qe-num" inputMode="decimal" value={f.correctNumber} onChange={(e) => set('correctNumber', e.target.value)} />
              <FieldError>{errors.correctNumber}</FieldError>
            </div>
            <div>
              <Label htmlFor="qe-unit">Единица измерения</Label>
              <Input id="qe-unit" value={f.unit} onChange={(e) => set('unit', e.target.value)} placeholder="м/с, %, тг…" />
            </div>
          </div>
        )}
        {f.type === 'boolean' && (
          <div>
            <Label>Правильный ответ</Label>
            <Segmented value={f.correctBool ? 't' : 'f'} onChange={(v) => set('correctBool', v === 't')} options={[{ value: 't', label: 'Верно' }, { value: 'f', label: 'Неверно' }]} />
          </div>
        )}
        <div>
          <Label htmlFor="qe-ex">Объяснение</Label>
          <Textarea id="qe-ex" value={f.explanation} onChange={(e) => set('explanation', e.target.value)} />
          <FieldError>{errors.explanation}</FieldError>
        </div>

        <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="qe-src">Источник</Label>
            <Select id="qe-src" value={f.source} onChange={(e) => set('source', e.target.value as QuestionSource)}>
              <option value="demo">Демо-вопрос (оригинальный учебный)</option>
              <option value="user">Пользовательский</option>
              <option value="verified">Официальный источник</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="qe-ver">Статус проверки</Label>
            <Select id="qe-ver" value={f.verification} onChange={(e) => set('verification', e.target.value as VerificationStatus)}>
              <option value="unverified">Не проверен экспертом</option>
              <option value="reviewed">Проверен</option>
              <option value="needs_review">Требует проверки</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="qe-ref">Ссылка на источник {f.source === 'verified' && <span className="text-danger">*</span>}</Label>
            <Input id="qe-ref" value={f.sourceRef} onChange={(e) => set('sourceRef', e.target.value)} placeholder="Сборник НЦТ, год, вариант, страница или URL" />
            <FieldError>{errors.sourceRef}</FieldError>
            {f.source === 'verified' && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-warning">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Отмечайте «Официальный источник» только для заданий из официальных материалов. Придуманные вопросы так помечать нельзя.
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="qe-tags">Теги (через запятую)</Label>
            <Input id="qe-tags" value={f.tags} onChange={(e) => set('tags', e.target.value)} />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
