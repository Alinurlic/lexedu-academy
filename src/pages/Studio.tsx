import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, PenLine, RotateCcw, Timer } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Segmented } from '@/components/ui';
import { LexiBubble } from '@/components/lexi/Lexi';
import { EssayGrader } from '@/components/EssayGrader';
import { wordCount } from '@/components/QuestionView';
import { useAllQuestions, useAppStore } from '@/store/useAppStore';
import { fmtClock, fmtDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { EssayQuestion } from '@/types';
import { Markdown } from '@/components/Markdown';

type Kind = 'writing1' | 'writing2' | 'speaking';
const LIMIT: Record<Kind, number> = { writing1: 20 * 60, writing2: 40 * 60, speaking: 2 * 60 };

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

/** Студия IELTS Writing & Speaking: письмо и устные ответы с таймером, оценка ИИ или самооценка. */
export default function Studio() {
  const questions = useAllQuestions();
  const attempts = useAppStore((s) => s.essayAttempts);
  const addAttempt = useAppStore((s) => s.addEssayAttempt);
  const [kind, setKind] = useState<Kind>('writing2');
  const prompts = useMemo(() => questions.filter((q): q is EssayQuestion => q.type === 'essay' && q.task === kind), [questions, kind]);
  const [qid, setQid] = useState<string>('');
  const q = prompts.find((p) => p.id === qid) ?? prompts[0];
  const [text, setText] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [startedAt]);
  useEffect(() => () => recRef.current?.stop(), []);
  useEffect(() => {
    setQid('');
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const remaining = startedAt ? Math.max(0, LIMIT[kind] - (now - startedAt) / 1000) : LIMIT[kind];
  const reset = () => {
    setText('');
    setStartedAt(null);
    recRef.current?.stop();
    setListening(false);
  };

  const toggleMic = () => {
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'en-GB';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let add = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) add += e.results[i][0].transcript + ' ';
      if (add) setText((t) => (t + ' ' + add).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    if (!startedAt) setStartedAt(Date.now());
  };

  const history = [...attempts].reverse().filter((a) => questions.find((x) => x.id === a.questionId && x.type === 'essay' && x.task === kind));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'writing1', label: 'Writing Task 1' }, { value: 'writing2', label: 'Writing Task 2' }, { value: 'speaking', label: 'Speaking' }]} />
        <Badge variant="outline">
          <Timer /> Рекомендуемое время: {Math.round(LIMIT[kind] / 60)} мин
        </Badge>
      </div>

      {!q ? (
        <EmptyState icon={PenLine} lexi="thinking" title="Нет заданий" description="Добавьте задания этого типа в админ-панели." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <Card className="p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select value={q.id} onChange={(e) => (setQid(e.target.value), reset())} className="h-9 max-w-full rounded-lg border border-input bg-surface px-2 text-sm" aria-label="Выбор задания">
                {prompts.map((p, i) => (
                  <option key={p.id} value={p.id}>
                    Задание {i + 1}: {p.question.replace(/^(Writing Task \d\.|Speaking Part \d\.)\s*/, '').slice(0, 70)}…
                  </option>
                ))}
              </select>
              <span className={cn('ml-auto rounded-lg border px-2.5 py-1 text-sm font-semibold tabular', startedAt && remaining < 60 && 'border-danger/50 text-danger')}>{fmtClock(remaining)}</span>
            </div>
            <p className="whitespace-pre-line rounded-xl bg-secondary/50 p-4 text-[15px] leading-relaxed">{q.question.split('\n\n|')[0]}</p>
            {q.question.includes('|') && (
              <pre className="mt-2 overflow-x-auto rounded-xl border p-3 font-sans text-sm">{q.question.split('\n').filter((l) => l.startsWith('|') && !l.startsWith('|---')).join('\n')}</pre>
            )}
            {kind === 'speaking' && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant={listening ? 'danger' : 'default'} onClick={toggleMic} disabled={!SR}>
                  {listening ? <MicOff /> : <Mic />} {listening ? 'Остановить запись' : 'Говорить (распознавание речи)'}
                </Button>
                {!SR && <span className="text-xs text-warning">Распознавание речи поддерживается в Chrome и Edge. Можно ввести ответ текстом.</span>}
                {listening && <span className="text-xs text-danger">● Идёт запись…</span>}
              </div>
            )}
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, 12000));
                if (!startedAt) setStartedAt(Date.now());
              }}
              placeholder={kind === 'speaking' ? 'Здесь появится расшифровка ответа (или введите текст)…' : 'Start writing your answer…'}
              spellCheck={false}
              className="mt-4 min-h-[300px] w-full rounded-xl border border-input bg-surface p-4 text-[15px] leading-relaxed focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              aria-label="Ответ"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className={cn(wordCount(text) >= q.minWords && 'text-success')}>
                Слов: {wordCount(text)} / минимум {q.minWords}
              </span>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw /> Начать заново
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <EssayGrader key={q.id} q={q} text={text} onGraded={(g) => addAttempt({ questionId: q.id, text, band: g.band, feedback: g.feedback, criteria: g.criteria, source: g.source })} />
            <LexiBubble mood="studying" size="xs" text={kind === 'writing1' ? 'В Task 1 обязательно напиши обзор (overview) и сравни ключевые цифры.' : kind === 'writing2' ? 'В Task 2 держи одну позицию от начала до конца и развивай каждый аргумент примером.' : 'Отвечай развёрнуто: причина + пример. Не заучивай ответы наизусть.'} />
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>История</CardTitle>
                  <CardDescription>Оценённые ответы этого типа</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.length === 0 && <p className="text-sm text-muted-foreground">Пока нет оценённых ответов</p>}
                {history.slice(0, 8).map((a) => (
                  <details key={a.id} className="rounded-lg border p-2.5 text-sm">
                    <summary className="flex cursor-pointer items-center justify-between gap-2">
                      <span className="text-muted-foreground">{fmtDateTime(a.date)}</span>
                      <Badge variant={a.source === 'ai' ? 'violet' : 'secondary'}>
                        band {a.band} · {a.source === 'ai' ? 'ИИ' : 'самооценка'}
                      </Badge>
                    </summary>
                    <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-muted-foreground">{a.text}</p>
                    {a.feedback && <Markdown text={a.feedback} className="mt-2" />}
                  </details>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
