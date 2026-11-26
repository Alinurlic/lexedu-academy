import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge, Button, Dialog, Label, Select } from '@/components/ui';
import { SUBJECTS, SUBJECT_MAP } from '@/data/subjects';
import { aiGenerateQuestions, aiStatus, type AiStatus, type GeneratedQuestion } from '@/lib/ai';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/store/toast';
import { uid } from '@/lib/utils';
import type { Difficulty, SubjectId } from '@/types';

/** Генерация заданий ИИ для админа: результат проверяется вручную и сохраняется со статусом «Требует проверки». */
export function AiGenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const upsert = useAppStore((s) => s.upsertQuestion);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [subject, setSubject] = useState<SubjectId>('math');
  const [topic, setTopic] = useState(SUBJECT_MAP.math.topics[0].id);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<(GeneratedQuestion & { keep: boolean })[]>([]);

  useEffect(() => {
    if (open) void aiStatus().then(setStatus);
  }, [open]);

  const run = async () => {
    setBusy(true);
    try {
      const subj = SUBJECT_MAP[subject];
      const lang = subj.track === 'ent' && subject !== 'english' ? 'русский' : 'English';
      const r = await aiGenerateQuestions({ subject: subj.name, topic: subj.topics.find((t) => t.id === topic)?.name ?? topic, count, difficulty, language: lang });
      setItems(r.questions.map((q) => ({ ...q, keep: true })));
      if (!r.questions.length) toast.info('ИИ не вернул корректных заданий');
    } catch (e) {
      toast.error('Не удалось сгенерировать', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const keep = items.filter((i) => i.keep);
    keep.forEach((g) =>
      upsert({
        id: uid('ai'),
        type: 'single',
        subject,
        topic,
        difficulty: g.difficulty,
        question: g.question,
        options: g.options,
        correctAnswer: g.correctIndex,
        explanation: g.explanation,
        source: 'user',
        sourceNote: 'Сгенерировано ИИ (Claude) — требует проверки экспертом перед использованием.',
        verification: 'needs_review',
        tags: ['ии'],
      }),
    );
    toast.success(`Добавлено заданий: ${keep.length}`, 'Статус: «Требует проверки»');
    setItems([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Генерация заданий ИИ"
      description="Задания создаёт модель ИИ. Обязательно проверьте каждое: они сохраняются со статусом «Требует проверки»."
      footer={
        items.length ? (
          <>
            <Button variant="secondary" onClick={() => setItems([])}>
              Сбросить
            </Button>
            <Button onClick={save} disabled={!items.some((i) => i.keep)}>
              Добавить отмеченные ({items.filter((i) => i.keep).length})
            </Button>
          </>
        ) : undefined
      }
    >
      {status && !status.enabled ? (
        <p className="pb-4 text-sm text-warning">ИИ недоступен: {status.reason}</p>
      ) : (
        <div className="space-y-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label htmlFor="ag-s">Предмет</Label>
              <Select id="ag-s" value={subject} onChange={(e) => (setSubject(e.target.value as SubjectId), setTopic(SUBJECT_MAP[e.target.value as SubjectId].topics[0].id))}>
                {SUBJECTS.filter((s) => s.id !== 'ielts-writing' && s.id !== 'ielts-speaking' && s.id !== 'ielts-listening').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ag-t">Тема</Label>
              <Select id="ag-t" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {SUBJECT_MAP[subject].topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="ag-c">Количество</Label>
              <Select id="ag-c" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="ag-d">Сложность</Label>
              <Select id="ag-d" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                <option value="easy">Лёгкая</option>
                <option value="medium">Средняя</option>
                <option value="hard">Сложная</option>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button onClick={run} loading={busy} className="w-full">
                <Sparkles /> Сгенерировать
              </Button>
            </div>
          </div>
          {items.map((it, i) => (
            <label key={i} className="block cursor-pointer rounded-xl border p-3 text-sm">
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={it.keep} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))} className="mt-1 size-4" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{it.question}</div>
                  <ol className="mt-1 list-[upper-alpha] pl-5">
                    {it.options.map((o, oi) => (
                      <li key={oi} className={oi === it.correctIndex ? 'font-semibold text-success' : ''}>
                        {o}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-1 text-xs text-muted-foreground">{it.explanation}</p>
                  <Badge variant="outline" className="mt-1">
                    {it.difficulty}
                  </Badge>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </Dialog>
  );
}
