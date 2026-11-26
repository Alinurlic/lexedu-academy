import { useState } from 'react';
import { LEXI_ALT, LEXI_AVATAR, LEXI_SRC, type LexiMood } from '@/lib/lexi';
import { cn } from '@/lib/utils';

const SIZE = { xs: 56, sm: 84, md: 120, lg: 168, xl: 220 } as const;

/** Стикер Lexi. Если изображение не загрузилось — показывается аккуратная заглушка-аватар. */
export function Lexi({ mood = 'default', size = 'md', className, animate, decorative }: { mood?: LexiMood; size?: keyof typeof SIZE; className?: string; animate?: boolean; decorative?: boolean }) {
  const [failed, setFailed] = useState(false);
  const px = SIZE[size];
  if (failed) return <LexiAvatar size={Math.round(px * 0.6)} className={className} />;
  return (
    <img
      src={LEXI_SRC[mood]}
      alt={decorative ? '' : LEXI_ALT[mood]}
      aria-hidden={decorative || undefined}
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn('shrink-0 select-none object-contain drop-shadow-[0_6px_14px_rgba(15,23,42,0.18)]', animate && 'animate-pop', className)}
      style={{ width: px, height: px }}
    />
  );
}

export function LexiAvatar({ size = 32, className }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span className={cn('grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-violet font-semibold text-white', className)} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
        L
      </span>
    );
  return <img src={LEXI_AVATAR} alt="" aria-hidden width={size} height={size} onError={() => setFailed(true)} className={cn('shrink-0 rounded-full', className)} style={{ width: size, height: size }} />;
}

/** Реплика Lexi: стикер + «облачко» с текстом. */
export function LexiBubble({ mood, text, title, size = 'sm', children, className, tone = 'default' }: { mood: LexiMood; text: string; title?: string; size?: keyof typeof SIZE; children?: React.ReactNode; className?: string; tone?: 'default' | 'success' | 'danger' | 'violet' }) {
  const toneCls = {
    default: 'border-border bg-card',
    success: 'border-success/30 bg-success/5',
    danger: 'border-danger/30 bg-danger/5',
    violet: 'border-violet/30 bg-violet/5',
  }[tone];
  return (
    <div className={cn('flex items-center gap-3 animate-fade-up', className)}>
      <Lexi mood={mood} size={size} decorative />
      <div className={cn('relative min-w-0 flex-1 rounded-2xl border p-3.5', toneCls)}>
        <span className={cn('absolute -left-[7px] top-1/2 size-3 -translate-y-1/2 rotate-45 border-b border-l', toneCls)} aria-hidden />
        {title && <div className="text-xs font-semibold uppercase tracking-wider text-violet">{title}</div>}
        <p className="text-sm leading-relaxed">{text}</p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}
