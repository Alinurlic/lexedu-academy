import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarPlus, CheckCircle2, Info, Sparkles, TrendingUp, XCircle } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog } from '@/components/ui';
import { Lexi } from '@/components/lexi/Lexi';
import { useAppStore } from '@/store/useAppStore';
import { useTrack } from '@/hooks/useTrack';
import { buildInsights, buildWeekPlan, studentSummary, type Insight } from '@/lib/insights';
import { aiAnalyze, aiStatus, type AiStatus } from '@/lib/ai';
import { TRACKS } from '@/data/subjects';
import { cn } from '@/lib/utils';
import { toast } from '@/store/toast';
import { Markdown } from '@/components/Markdown';

const TONE: Record<Insight['tone'], { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  good: { icon: CheckCircle2, cls: 'text-success border-success/30 bg-success/5' },
  warn: { icon: AlertTriangle, cls: 'text-warning border-warning/30 bg-warning/5' },
  bad: { icon: XCircle, cls: 'text-danger border-danger/30 bg-danger/5' },
  info: { icon: Info, cls: 'text-primary border-primary/30 bg-primary/5' },
};

/** «Умный анализ» по активному треку + автоплан на неделю + персональный план от ИИ (если подключён). */
export function SmartAnalysis({ compact }: { compact?: boolean }) {
  const navigate = useNavigate();
  const track = useTrack();
  const attempts = useAppStore((s) => s.attempts);
  const profile = useAppStore((s) => s.profile);
  const examFormat = useAppStore((s) => s.examFormat);
  const mistakesOpen = useAppStore((s) => s.mistakes.filter((m) => m.status !== 'mastered').length);
  const addTask = useAppStore((s) => s.addTask);
  const insights = useMemo(() => buildInsights(track, attempts, profile, examFormat), [track, attempts, profile, examFormat]);
  const [confirmPlan, setConfirmPlan] = useState(false);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void aiStatus().then(setAi);
  }, []);

  const plan = () => {
    const tasks = buildWeekPlan(track, attempts, mistakesOpen);
    tasks.forEach((t) => addTask(t));
    toast.success(`В план добавлено задач: ${tasks.length}`, 'Открой «План», чтобы посмотреть');
  };

  const askAi = async () => {
    setBusy(true);
    try {
      const r = await aiAnalyze(studentSummary(profile, attempts, examFormat, mistakesOpen));
      setAiPlan(r.reply);
    } catch (e) {
      toast.error('ИИ не смог составить план', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const shown = compact ? insights.slice(0, 3) : insights;
  return (
    <Card id="plan" className="border-violet/30">
      <CardHeader className="flex-wrap">
        <div className="flex items-center gap-3">
          <Lexi mood="thinking" size="xs" decorative />
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-violet" /> Умный анализ · {TRACKS.find((t) => t.id === track)!.name}
            </CardTitle>
            <CardDescription>Выводы из твоих ответов, времени, режимов и целей</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setConfirmPlan(true)}>
            <CalendarPlus /> Автоплан на неделю
          </Button>
          {ai?.enabled && (
            <Button size="sm" onClick={askAi} loading={busy}>
              <Sparkles /> План от Lexi (ИИ)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {shown.map((i) => {
          const t = TONE[i.tone];
          return (
            <div key={i.id} className={cn('flex gap-3 rounded-xl border p-3', t.cls)}>
              <t.icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1 text-foreground">
                <div className="text-sm font-medium">{i.title}</div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{i.text}</p>
                {i.action && (
                  <Button size="sm" variant="link" className="mt-1" onClick={() => (i.action!.to.includes('#plan') ? setConfirmPlan(true) : navigate(i.action!.to))}>
                    {i.action.label} <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {compact && insights.length > 3 && (
          <Button size="sm" variant="ghost" onClick={() => navigate('/analytics')}>
            Ещё {insights.length - 3} в аналитике <ArrowRight />
          </Button>
        )}
        {aiPlan && (
          <div className="mt-3 rounded-xl border border-violet/30 bg-violet/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet">
              <Sparkles className="size-4" /> Персональный план от Lexi (ИИ)
            </div>
            <Markdown text={aiPlan} className="text-sm leading-relaxed" />
            <p className="mt-2 text-[11px] text-muted-foreground">Сгенерировано ИИ по твоей статистике. Сверяй важные факты с учебником.</p>
          </div>
        )}
        {ai && !ai.enabled && !compact && <p className="pt-1 text-[11px] text-muted-foreground">ИИ-план недоступен: {ai.reason} Локальный анализ и автоплан работают без ИИ.</p>}
      </CardContent>
      <ConfirmDialog open={confirmPlan} onClose={() => setConfirmPlan(false)} title="Добавить автоплан на неделю?" description="В «План» будут добавлены задачи до конца недели: слабые темы, повторение ошибок и пробный экзамен." confirmLabel="Добавить" onConfirm={plan} />
    </Card>
  );
}
