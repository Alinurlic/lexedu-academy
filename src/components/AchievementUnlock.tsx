import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ACHIEVEMENTS, type AchievementDef } from '@/data/gamification';
import { ICONS } from '@/components/icons';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Lexi } from '@/components/lexi/Lexi';

const TIER: Record<AchievementDef['tier'], { ring: string; bg: string; label: string }> = {
  bronze: { ring: 'ring-amber-700/40', bg: 'from-amber-600 to-orange-700', label: 'Бронза' },
  silver: { ring: 'ring-slate-400/40', bg: 'from-slate-400 to-slate-600', label: 'Серебро' },
  gold: { ring: 'ring-yellow-400/40', bg: 'from-yellow-400 to-amber-500', label: 'Золото' },
};

export function AchievementBadge({ def, unlocked, size = 'md', animate }: { def: AchievementDef; unlocked: boolean; size?: 'md' | 'lg'; animate?: boolean }) {
  const Icon = ICONS[def.icon] ?? ICONS.trophy;
  const t = TIER[def.tier];
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-2xl ring-4',
        size === 'lg' ? 'size-24' : 'size-14',
        unlocked ? `bg-gradient-to-br text-white ${t.bg} ${t.ring}` : 'bg-secondary text-muted-foreground ring-transparent',
        animate && 'animate-pop',
      )}
    >
      {unlocked ? <Icon className={size === 'lg' ? 'size-11' : 'size-6'} /> : <Lock className={size === 'lg' ? 'size-9' : 'size-5'} />}
    </div>
  );
}

export const TIER_LABEL = (tier: AchievementDef['tier']) => TIER[tier].label;

/** Анимированное окно разблокировки достижения. */
export function AchievementUnlock() {
  const pending = useAppStore((s) => s.pendingUnlocks);
  const shift = useAppStore((s) => s.shiftUnlock);
  const navigate = useNavigate();
  const def = ACHIEVEMENTS.find((a) => a.id === pending[0]);
  if (!def) return null;
  return (
    <div className="fixed inset-0 z-[75] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0" onClick={shift} />
      <div role="dialog" aria-modal="true" aria-label="Новое достижение" className="relative w-full max-w-sm rounded-3xl border bg-popover p-8 text-center shadow-2xl animate-in zoom-in-90 fade-in-0">
        <p className="text-xs font-medium uppercase tracking-[.18em] text-primary">Достижение разблокировано</p>
        <div className="my-5 flex items-end justify-center gap-2">
          <AchievementBadge def={def} unlocked size="lg" animate />
          <Lexi mood={def.tier === 'gold' ? 'perfect' : 'celebrating'} size="md" decorative className="-mb-2" />
        </div>
        <h2 className="text-xl font-semibold">{def.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{def.description}</p>
        <p className="mt-3 text-sm font-medium text-violet">+{def.xp} XP · {TIER_LABEL(def.tier)}</p>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => (shift(), navigate('/achievements'))}>
            Все достижения
          </Button>
          <Button className="flex-1" onClick={shift}>
            Отлично!
          </Button>
        </div>
        {pending.length > 1 && <p className="mt-3 text-xs text-muted-foreground">Ещё {pending.length - 1} в очереди</p>}
      </div>
    </div>
  );
}
