import { useState } from 'react';
import { Languages } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { setUiLanguage } from '@/lib/uiLang';
import { cn } from '@/lib/utils';
import type { UiLang } from '@/i18n';

const LABEL: Record<UiLang, string> = { ru: 'РУС', kk: 'ҚАЗ' };
const HINT: Record<UiLang, string> = { ru: 'Интерфейс на русском', kk: 'Интерфейс қазақ тілінде' };

/**
 * Переключатель языка интерфейса.
 * pill — две кнопки «РУС | ҚАЗ» (главная, вход, анкета); button — одна кнопка с языком, на который переключить (верхняя панель).
 */
export function LangSwitch({ variant = 'pill', className }: { variant?: 'pill' | 'button'; className?: string }) {
  const lang = useAppStore((s) => s.profile.language) ?? 'ru';
  const [busy, setBusy] = useState(false);
  const choose = async (l: UiLang) => {
    if (l === lang || busy) return;
    setBusy(true);
    try {
      await setUiLanguage(l);
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'button') {
    const next: UiLang = lang === 'kk' ? 'ru' : 'kk';
    return (
      <button
        type="button"
        onClick={() => void choose(next)}
        disabled={busy}
        title={HINT[next]}
        aria-label={HINT[next]}
        className={cn('inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60', className)}
      >
        <Languages className="size-4" />
        {LABEL[next]}
      </button>
    );
  }

  return (
    <div role="group" aria-label="Язык интерфейса / Интерфейс тілі" className={cn('inline-flex rounded-lg border bg-surface p-0.5 text-xs font-semibold', className)}>
      {(['ru', 'kk'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => void choose(l)}
          disabled={busy}
          aria-pressed={lang === l}
          title={HINT[l]}
          className={cn('rounded-md px-2.5 py-1 transition-colors', lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
