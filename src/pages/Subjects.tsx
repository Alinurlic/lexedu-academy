import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge, Card, Progress } from '@/components/ui';
import { SubjectIcon } from '@/components/icons';
import { SUBJECTS } from '@/data/subjects';
import { useAllQuestions, useAppStore } from '@/store/useAppStore';
import { subjectSummary } from '@/lib/analytics';
import { useMemo } from 'react';
import { fmtNum } from '@/lib/utils';
import { useTrack } from '@/hooks/useTrack';

export default function Subjects() {
  const attempts = useAppStore((s) => s.attempts);
  const topicStatus = useAppStore((s) => s.topicStatus);
  const profile = useAppStore((s) => s.profile);
  const track = useTrack();
  const questions = useAllQuestions();
  const summaries = useMemo(() => SUBJECTS.map((s) => ({ s, sum: subjectSummary(s.id, attempts, questions, topicStatus), n: questions.filter((q) => q.subject === s.id).length })), [attempts, questions, topicStatus]);

  const groups = track !== 'ent' ? [{ title: track === 'sat' ? 'Разделы Digital SAT' : 'Секции IELTS Academic', items: summaries.filter((x) => x.s.track === track) }] : [
    { title: 'Обязательные предметы', items: summaries.filter((x) => x.s.kind === 'mandatory') },
    { title: 'Мои профильные предметы', items: summaries.filter((x) => profile.profileSubjects.includes(x.s.id)) },
    { title: 'Другие профильные предметы', items: summaries.filter((x) => x.s.kind === 'profile' && x.s.track === 'ent' && !profile.profileSubjects.includes(x.s.id)) },
  ];

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">{g.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map(({ s, sum, n }) => (
              <Link key={s.id} to={`/subjects/${s.id}`}>
                <Card className="card-hover group h-full p-5">
                  <div className="flex items-start gap-3">
                    <SubjectIcon subject={s.id} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-semibold">{s.name}</h3>
                        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {s.topics.length} тем · {n} вопросов в банке
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">Прогресс тем</span>
                      <span className="font-medium tabular">{sum.progress}%</span>
                    </div>
                    <Progress value={sum.progress} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-secondary/60 p-2">
                      <div className="text-sm font-semibold tabular">{sum.attempts ? `${Math.round(sum.accuracy * 100)}%` : '—'}</div>
                      <div className="text-[10px] text-muted-foreground">точность</div>
                    </div>
                    <div className="rounded-lg bg-secondary/60 p-2">
                      <div className="text-sm font-semibold tabular">{fmtNum(sum.attempts)}</div>
                      <div className="text-[10px] text-muted-foreground">ответов</div>
                    </div>
                    <div className="rounded-lg bg-secondary/60 p-2">
                      <div className="text-sm font-semibold tabular">
                        {sum.completedTopics}/{s.topics.length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">тем освоено</div>
                    </div>
                  </div>
                  {sum.weakest && (
                    <div className="mt-3">
                      <Badge variant="danger">Слабая тема: {sum.weakest.name}</Badge>
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
