import { useMemo, useState } from 'react';
import type { TooltipProps } from 'recharts';
import { addDays, dayKey, fmtDate, MONTHS_SHORT, startOfWeek } from '@/lib/date';
import { cn, plural } from '@/lib/utils';
import { tr } from '@/i18n';

export const CHART = {
  c1: 'var(--chart-1)',
  c2: 'var(--chart-2)',
  c3: 'var(--chart-3)',
  c4: 'var(--chart-4)',
  c5: 'var(--chart-5)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
};

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 12, fill: 'var(--chart-axis)' },
} as const;

type Fmt = (v: number, name: string) => string;

export function ChartTooltip({ active, payload, label, fmt }: TooltipProps<number, string> & { fmt?: Fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <div className="mb-1 font-medium text-foreground">{label}</div>}
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-semibold text-foreground tabular">{p.value === null || p.value === undefined ? '—' : fmt ? fmt(Number(p.value), String(p.name)) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={cn('h-0.5 w-4 rounded-full', i.dashed && 'border-t-2 border-dashed bg-transparent')} style={i.dashed ? { borderColor: i.color } : { backgroundColor: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** GitHub-подобная тепловая карта активности за 12 месяцев. */
export function ActivityHeatmap({ data }: { data: Record<string, { questions: number; seconds: number }> }) {
  const [hover, setHover] = useState<string | null>(null);
  const { weeks, months, total, activeDays } = useMemo(() => {
    const end = new Date();
    const start = startOfWeek(addDays(end, -364));
    const weeks: { key: string; date: Date; level: number; minutes: number; questions: number; future: boolean }[][] = [];
    const months: { index: number; label: string }[] = [];
    let total = 0;
    let activeDays = 0;
    let d = start;
    let lastMonth = -1;
    let w = 0;
    while (d <= end) {
      const col: (typeof weeks)[number] = [];
      for (let i = 0; i < 7; i++) {
        const k = dayKey(d);
        const e = data[k];
        const minutes = e ? Math.round(e.seconds / 60) : 0;
        const questions = e?.questions ?? 0;
        if (minutes || questions) activeDays++;
        total += minutes;
        const level = minutes === 0 && questions === 0 ? 0 : minutes < 20 ? 1 : minutes < 45 ? 2 : minutes < 90 ? 3 : 4;
        col.push({ key: k, date: d, level, minutes, questions, future: d > end });
        if (i === 0 && d.getMonth() !== lastMonth) {
          const prev = months[months.length - 1];
          if (prev && w - prev.index < 3) months.pop();
          months.push({ index: w, label: MONTHS_SHORT[d.getMonth()] });
          lastMonth = d.getMonth();
        }
        d = addDays(d, 1);
      }
      weeks.push(col);
      w++;
    }
    return { weeks, months, total, activeDays };
  }, [data]);

  const hovered = hover ? weeks.flat().find((c) => c.key === hover) : null;

  return (
    <div>
      <div className="mb-3 flex min-h-5 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        {hovered ? (
          <span>
            <span className="font-medium text-foreground">{fmtDate(hovered.date, { weekday: 'short', day: 'numeric', month: 'long' })}</span> ·{' '}
            {hovered.minutes || hovered.questions ? tr('{0} мин, {1} {2}', hovered.minutes, hovered.questions, plural(hovered.questions, ['вопрос', 'вопроса', 'вопросов'])) : tr('нет занятий')}
          </span>
        ) : (
          <span>
            {tr('{0} {1} · {2} ч за год', activeDays, plural(activeDays, ['активный день', 'активных дня', 'активных дней']), Math.round(total / 60))}
          </span>
        )}
        <span className="flex items-center gap-1">
          {tr('Меньше')}
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="size-2.5 rounded-[3px]" style={{ backgroundColor: `var(--heat-${l})` }} />
          ))}
          {tr('Больше')}
        </span>
      </div>
      <div className="scrollbar-thin overflow-x-auto pb-1">
        <div className="inline-block">
          <div className="relative ml-7 h-4 text-[10px] text-muted-foreground">
            {months.map((m) => (
              <span key={`${m.index}-${m.label}`} className="absolute" style={{ left: m.index * 14 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="mr-1 flex w-6 flex-col gap-[3px] text-[10px] text-muted-foreground">
              {[tr('Пн'), '', tr('Ср'), '', tr('Пт'), '', ''].map((l, i) => (
                <span key={i} className="h-[11px] leading-[11px]">
                  {l}
                </span>
              ))}
            </div>
            {weeks.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((c) =>
                  c.future ? (
                    <span key={c.key} className="size-[11px]" />
                  ) : (
                    <span
                      key={c.key}
                      onMouseEnter={() => setHover(c.key)}
                      onMouseLeave={() => setHover(null)}
                      title={tr('{0}: {1} мин, {2} вопр.', fmtDate(c.date, { day: 'numeric', month: 'short' }), c.minutes, c.questions)}
                      className={cn('size-[11px] rounded-[3px] transition-transform hover:scale-125', hover === c.key && 'ring-1 ring-foreground/60')}
                      style={{ backgroundColor: `var(--heat-${c.level})` }}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RingProgress({ value, size = 120, stroke = 10, children, color = 'hsl(var(--primary))' }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--secondary))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
