import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

export function Avatar({ className, name, color, emoji }: { className?: string; name?: string; color?: string; emoji?: string }) {
  const profile = useAppStore((s) => s.profile);
  const n = name ?? profile.name;
  const c = color ?? profile.avatarColor;
  const e = emoji ?? profile.avatarEmoji;
  const initials = n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white', className)} style={{ backgroundColor: c }} aria-hidden>
      {e || initials || 'EP'}
    </span>
  );
}
