import { CheckCircle2, Info, Sparkles, X, XCircle } from 'lucide-react';
import { useToasts } from '@/store/toast';
import { cn } from '@/lib/utils';
import { tr } from '@/i18n';

const ICON = { success: CheckCircle2, error: XCircle, info: Info, xp: Sparkles };
const COLOR = { success: 'text-success', error: 'text-danger', info: 'text-primary', xp: 'text-violet' };

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover p-3.5 shadow-xl animate-in slide-in-from-bottom-2 fade-in-0">
            <Icon className={cn('mt-0.5 size-[18px] shrink-0', COLOR[t.kind])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{t.description}</p>}
              {t.action && (
                <button
                  className="mt-1.5 text-[13px] font-medium text-primary hover:underline"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground" aria-label={tr('Закрыть уведомление')}>
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
