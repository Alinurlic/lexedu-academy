import {
  Atom,
  Book,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  ClipboardList,
  Cpu,
  FlaskConical,
  Flame,
  Globe2,
  Landmark,
  Languages,
  Layers,
  Leaf,
  Medal,
  Mountain,
  Rocket,
  Sigma,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { SubjectId } from '@/types';
import { SUBJECT_MAP } from '@/data/subjects';
import { cn } from '@/lib/utils';
import { LexiAvatar } from '@/components/lexi/Lexi';
import { tr } from '@/i18n';

export const ICONS: Record<string, LucideIcon> = {
  sigma: Sigma,
  atom: Atom,
  landmark: Landmark,
  globe: Globe2,
  leaf: Leaf,
  flask: FlaskConical,
  book: BookOpen,
  calculator: Calculator,
  languages: Languages,
  cpu: Cpu,
  rocket: Rocket,
  target: Target,
  layers: Layers,
  mountain: Mountain,
  flame: Flame,
  sparkles: Sparkles,
  clipboard: ClipboardList,
  medal: Medal,
  check: Check,
  calendar: Calendar,
  trophy: Trophy,
  bookClosed: Book,
};

export function SubjectIcon({ subject, className, boxed = true }: { subject: SubjectId; className?: string; boxed?: boolean }) {
  const s = SUBJECT_MAP[subject];
  const Icon = ICONS[s.icon] ?? BookOpen;
  if (!boxed) return <Icon className={className} style={{ color: s.color }} />;
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', className)} style={{ backgroundColor: `${s.color}1f`, color: s.color }}>
      <Icon className="size-[18px]" />
    </span>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative shrink-0 rounded-full bg-gradient-to-br from-primary to-violet p-[2px]">
        <LexiAvatar size={32} className="block" />
      </span>
      {!collapsed && (
        <div className="text-left leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">
            Lex<span className="bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">Edu</span>
            <span className="ml-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Academy</span>
          </div>
          <div className="text-[11px] text-muted-foreground">{tr('ЕНТ · SAT · IELTS')}</div>
        </div>
      )}
    </div>
  );
}
