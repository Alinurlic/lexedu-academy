import * as React from 'react';
import { cn } from '@/lib/utils';

/** Лёгкий поповер: закрытие по клику вне и по Escape. */
export function Popover({ trigger, children, align = 'end', className, open: openProp, onOpenChange }: { trigger: (p: { open: boolean; toggle: () => void }) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: 'start' | 'end'; className?: string; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [inner, setInner] = React.useState(false);
  const open = openProp ?? inner;
  const setOpen = React.useCallback((v: boolean) => (onOpenChange ? onOpenChange(v) : setInner(v)), [onOpenChange]);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);
  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div className={cn('absolute top-full z-50 mt-2 rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95', align === 'end' ? 'right-0' : 'left-0', className)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, children, onClick, danger }: { icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-secondary', danger && 'text-danger')}>
      {Icon && <Icon className="size-4 text-muted-foreground" />}
      {children}
    </button>
  );
}
