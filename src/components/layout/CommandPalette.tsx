import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, CornerDownLeft, FileQuestion, Hash, NotebookPen, Search, Zap } from 'lucide-react';
import { NAV } from './nav';
import { SUBJECTS, SUBJECT_MAP, TOPIC_MAP } from '@/data/subjects';
import { useAllQuestions, useAppStore } from '@/store/useAppStore';
import { Kbd } from '@/components/ui';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/date';

interface Item {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  keywords: string;
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const questions = useAllQuestions();
  const mistakes = useAppStore((s) => s.mistakes);
  const tasks = useAppStore((s) => s.tasks);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    if (!open) return [];
    const qmap = new Map(questions.map((q) => [q.id, q]));
    return [
      ...NAV.map((n) => ({ id: `nav-${n.to}`, group: 'Разделы', title: n.label, subtitle: n.description, icon: n.icon, to: n.to, keywords: norm(n.label + ' ' + n.description) })),
      { id: 'act-practice', group: 'Действия', title: 'Начать практику', subtitle: 'Быстрая сессия из 10 вопросов', icon: Zap, to: '/practice', keywords: 'начать практику тест сессия' },
      { id: 'act-exam', group: 'Действия', title: 'Начать пробный экзамен', subtitle: 'ЕНТ, SAT или IELTS — полный формат с таймером', icon: Zap, to: '/exams', keywords: 'пробный экзамен ент сат sat ielts айлтс тест' },
      { id: 'act-review', group: 'Действия', title: 'Повторить ошибки', subtitle: 'Режим повторения', icon: Zap, to: '/mistakes?review=1', keywords: 'повторить ошибки' },
      ...SUBJECTS.map((s) => ({ id: `subj-${s.id}`, group: 'Предметы', title: s.name, subtitle: `${s.topics.length} тем`, icon: BookOpen, to: `/subjects/${s.id}`, keywords: norm(s.name) })),
      ...SUBJECTS.flatMap((s) =>
        s.topics.map((t) => ({ id: `topic-${t.id}`, group: 'Темы', title: t.name, subtitle: `${s.name} · ${t.subtopics.join(', ')}`, icon: Hash, to: `/subjects/${s.id}?topic=${t.id}`, keywords: norm(t.name + ' ' + t.subtopics.join(' ') + ' ' + s.name) })),
      ),
      ...questions.map((q) => ({ id: `q-${q.id}`, group: 'Вопросы', title: q.question, subtitle: `${SUBJECT_MAP[q.subject].name} · ${TOPIC_MAP[q.topic]?.name ?? ''}`, icon: FileQuestion, to: `/subjects/${q.subject}?q=${q.id}`, keywords: norm(q.question + ' ' + q.tags.join(' ')) })),
      ...mistakes.flatMap((m) => {
        const q = qmap.get(m.questionId);
        if (!q) return [];
        return [{ id: `m-${m.id}`, group: 'Ошибки', title: q.question, subtitle: `${SUBJECT_MAP[q.subject].name} · ${fmtDate(m.date)}`, icon: NotebookPen, to: `/mistakes?focus=${m.id}`, keywords: norm('ошибка ' + q.question) }];
      }),
      ...tasks.map((t) => ({ id: `t-${t.id}`, group: 'Задачи плана', title: t.title, subtitle: fmtDate(t.date, { weekday: 'short', day: 'numeric', month: 'short' }), icon: CalendarDays, to: `/planner?date=${t.date}`, keywords: norm(t.title) })),
    ];
  }, [open, questions, mistakes, tasks]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return items.filter((i) => i.group === 'Разделы' || i.group === 'Действия');
    const words = q.split(/\s+/);
    const perGroup: Record<string, number> = {};
    return items.filter((i) => {
      if (!words.every((w) => i.keywords.includes(w) || norm(i.title).includes(w))) return false;
      perGroup[i.group] = (perGroup[i.group] ?? 0) + 1;
      return perGroup[i.group] <= 6;
    });
  }, [items, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (item: Item | undefined) => {
    if (!item) return;
    navigate(item.to);
    onClose();
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 pt-[10vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Глобальный поиск" className="relative w-full max-w-xl overflow-hidden rounded-2xl border bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-[18px] text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(results[active]);
              } else if (e.key === 'Escape') onClose();
            }}
            placeholder="Предметы, темы, вопросы, ошибки, задачи…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            aria-label="Поисковый запрос"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Ничего не найдено по запросу «{query}»</p>}
          {results.map((r, idx) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={r.id}>
                {header && <div className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{header}</div>}
                <button
                  data-idx={idx}
                  onMouseMove={() => setActive(idx)}
                  onClick={() => go(r)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', idx === active ? 'bg-accent text-accent-foreground' : '')}
                >
                  <r.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{r.title}</span>
                    {r.subtitle && <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                  </span>
                  {idx === active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 border-t px-4 py-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> навигация</span>
          <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> открыть</span>
          <span className="ml-auto">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
