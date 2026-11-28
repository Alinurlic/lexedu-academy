import { useState } from 'react';
import { Button, Dialog, FieldError, Input, Label, Segmented, Select, Textarea } from '@/components/ui';
import { SUBJECT_MAP } from '@/data/subjects';
import { customQuestionFormSchema } from '@/lib/schemas';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/store/toast';
import { cn, uid } from '@/lib/utils';
import type { Difficulty, Question, SubjectId } from '@/types';
import { tr } from '@/i18n';

type FormType = 'single' | 'boolean' | 'numeric';

const initial = (topic: string) => ({
  question: '',
  topic,
  difficulty: 'medium' as Difficulty,
  type: 'single' as FormType,
  options: ['', '', '', ''],
  correctIndex: 0,
  correctBool: true,
  correctNumber: '',
  explanation: '',
});

/** Создание пользовательского вопроса с валидацией Zod. */
export function AddQuestionDialog({ open, onClose, subject }: { open: boolean; onClose: () => void; subject: SubjectId }) {
  const s = SUBJECT_MAP[subject];
  const add = useAppStore((st) => st.addCustomQuestion);
  const [form, setForm] = useState(() => initial(s.topics[0].id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const res = customQuestionFormSchema.safeParse(form);
    if (!res.success) {
      const e: Record<string, string> = {};
      for (const issue of res.error.issues) e[String(issue.path[0])] ??= tr(issue.message);
      setErrors(e);
      return;
    }
    const v = res.data;
    const base = { id: uid('uq'), subject, topic: v.topic, difficulty: v.difficulty, question: v.question, explanation: v.explanation, source: 'user' as const, sourceNote: tr('Вопрос добавлен пользователем.'), tags: [tr('мой вопрос')] };
    let q: Question;
    if (v.type === 'single') {
      const opts = v.options.map((o, i) => ({ o, i })).filter((x) => x.o.length > 0);
      q = { ...base, type: 'single', options: opts.map((x) => x.o), correctAnswer: opts.findIndex((x) => x.i === v.correctIndex) };
    } else if (v.type === 'boolean') {
      q = { ...base, type: 'boolean', correctAnswer: v.correctBool };
    } else {
      q = { ...base, type: 'numeric', correctAnswer: Number(v.correctNumber.replace(',', '.')), tolerance: 1e-6 };
    }
    add(q);
    toast.success(tr('Вопрос добавлен'), tr('{0} · помечен как «Мой вопрос»', s.name));
    setForm(initial(s.topics[0].id));
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tr('Новый вопрос: {0}', s.name)}
      description={tr('Пользовательские вопросы отмечаются отдельно от демо-вопросов и официальных источников.')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tr('Отмена')}
          </Button>
          <Button onClick={save}>{tr('Сохранить вопрос')}</Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <div>
          <Label htmlFor="aq-q">{tr('Текст вопроса')}</Label>
          <Textarea id="aq-q" value={form.question} onChange={(e) => set('question', e.target.value)} placeholder={tr('Например: Найдите корень уравнения 2x + 3 = 11')} />
          <FieldError>{errors.question}</FieldError>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="aq-topic">{tr('Тема')}</Label>
            <Select id="aq-topic" value={form.topic} onChange={(e) => set('topic', e.target.value)}>
              {s.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{tr('Сложность')}</Label>
            <Segmented value={form.difficulty} onChange={(v) => set('difficulty', v)} options={[{ value: 'easy', label: tr('Лёгкий') }, { value: 'medium', label: tr('Средний') }, { value: 'hard', label: tr('Сложный') }]} />
          </div>
        </div>
        <div>
          <Label>{tr('Тип ответа')}</Label>
          <Segmented value={form.type} onChange={(v) => set('type', v)} options={[{ value: 'single', label: tr('Один из вариантов') }, { value: 'boolean', label: tr('Верно / Неверно') }, { value: 'numeric', label: tr('Число') }]} />
        </div>
        {form.type === 'single' && (
          <div>
            <Label>{tr('Варианты ответа (отметьте правильный)')}</Label>
            <div className="space-y-2">
              {form.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set('correctIndex', i)}
                    aria-label={tr('Вариант {0} правильный', i + 1)}
                    aria-pressed={form.correctIndex === i}
                    className={cn('grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold', form.correctIndex === i ? 'border-success bg-success text-white' : 'border-input text-muted-foreground')}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                  <Input value={o} onChange={(e) => set('options', form.options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={tr('Вариант {0}{1}', i + 1, i > 1 ? tr(' (необязательно)') : '')} />
                </div>
              ))}
            </div>
            <FieldError>{errors.options || errors.correctIndex}</FieldError>
          </div>
        )}
        {form.type === 'boolean' && (
          <div>
            <Label>{tr('Правильный ответ')}</Label>
            <Segmented value={form.correctBool ? 't' : 'f'} onChange={(v) => set('correctBool', v === 't')} options={[{ value: 't', label: tr('Верно') }, { value: 'f', label: tr('Неверно') }]} />
          </div>
        )}
        {form.type === 'numeric' && (
          <div className="max-w-xs">
            <Label htmlFor="aq-num">{tr('Правильный ответ (число)')}</Label>
            <Input id="aq-num" inputMode="decimal" value={form.correctNumber} onChange={(e) => set('correctNumber', e.target.value)} placeholder={tr('Например: 4 или 2,5')} />
            <FieldError>{errors.correctNumber}</FieldError>
          </div>
        )}
        <div>
          <Label htmlFor="aq-expl">{tr('Объяснение')}</Label>
          <Textarea id="aq-expl" value={form.explanation} onChange={(e) => set('explanation', e.target.value)} placeholder={tr('Почему этот ответ верный')} />
          <FieldError>{errors.explanation}</FieldError>
        </div>
      </div>
    </Dialog>
  );
}
