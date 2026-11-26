import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Target } from 'lucide-react';
import { NAV } from './nav';
import { Logo } from '@/components/icons';
import { Avatar } from './Avatar';
import { useAppStore } from '@/store/useAppStore';
import { useCoreStats, useTrackPrediction } from '@/hooks/useStats';
import { TRACKS } from '@/data/subjects';
import { cn } from '@/lib/utils';

export function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const mistakesNew = useAppStore((s) => s.mistakes.filter((m) => m.status === 'new').length);
  const stats = useCoreStats();
  const tp = useTrackPrediction();
  const navigate = useNavigate();
  const collapsed = !mobile && profile.sidebarCollapsed;

  return (
    <aside className={cn('flex h-full flex-col border-r bg-surface transition-[width] duration-200', mobile ? 'w-72' : collapsed ? 'w-[72px]' : 'w-64')}>
      <div className={cn('flex h-16 items-center px-4', collapsed && 'justify-center px-0')}>
        <button onClick={() => (navigate('/'), onNavigate?.())} aria-label="LexEdu Academy — на главную">
          <Logo collapsed={collapsed} />
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Основная навигация">
        {NAV.map((item, i) => {
          const prev = NAV[i - 1];
          const groupStart = prev && (prev.group ?? 'main') !== (item.group ?? 'main');
          const groupLabel = { main: '', tools: 'Инструменты', system: 'Система' }[item.group ?? 'main'];
          return (
            <div key={item.to}>
              {groupStart && (collapsed ? <div className="mx-2 my-2 h-px bg-border" /> : <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground/70">{groupLabel}</div>)}
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-0',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="brand-gradient absolute -left-3 top-2 h-6 w-[3px] rounded-r-full" />}
                    <item.icon className="size-[18px] shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.to === '/mistakes' && mistakesNew > 0 && (
                      <span className="rounded-md bg-danger/15 px-1.5 text-[11px] font-semibold text-danger tabular">{mistakesNew}</span>
                    )}
                    {!collapsed && item.to === '/assistant' && <span className="rounded-md bg-violet/15 px-1.5 text-[10px] font-semibold text-violet">демо</span>}
                  </>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t p-3">
        {!collapsed && (
          <button onClick={() => (navigate('/analytics'), onNavigate?.())} className="w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Target className="size-3.5" /> Цель {TRACKS.find((t) => t.id === tp.track)?.name}
              </span>
              <span className="tabular">
                <span className="font-semibold text-foreground">{tp.prediction.value}</span> / {tp.target}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="brand-gradient h-full rounded-full" style={{ width: `${Math.min(100, ((tp.prediction.value - tp.prediction.min) / Math.max(1, tp.target - tp.prediction.min)) * 100)}%` }} />
            </div>
          </button>
        )}
        <button
          onClick={() => (navigate('/settings'), onNavigate?.())}
          className={cn('flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary', collapsed && 'justify-center')}
          title={collapsed ? profile.name : undefined}
        >
          <Avatar />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                Ур. {stats.level.current.index} · {stats.level.current.name}
              </div>
            </div>
          )}
        </button>
        {!mobile && (
          <button
            onClick={() => updateProfile({ sidebarCollapsed: !profile.sidebarCollapsed })}
            className={cn('flex h-8 w-full items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground', collapsed && 'justify-center')}
            aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed && 'Свернуть'}
          </button>
        )}
      </div>
    </aside>
  );
}
