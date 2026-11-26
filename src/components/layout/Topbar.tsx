import { useLocation, useNavigate } from 'react-router-dom';
import { Award, Bell, CheckCheck, Download, LogOut, Menu, Monitor, Moon, Search, Settings, Sun, Trash2, User } from 'lucide-react';
import { titleFor } from './nav';
import { Avatar } from './Avatar';
import { Button, Kbd } from '@/components/ui';
import { MenuItem, Popover } from '@/components/ui/Popover';
import { exportPayload, useAppStore } from '@/store/useAppStore';
import { useCoreStats } from '@/hooks/useStats';
import { fmtDateTime } from '@/lib/date';
import { cn, downloadJson } from '@/lib/utils';
import { toast } from '@/store/toast';
import type { ThemeMode } from '@/types';
import { TRACKS } from '@/data/subjects';
import { TRACK_DEFAULTS } from '@/hooks/useTrack';

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAll = useAppStore((s) => s.markAllNotificationsRead);
  const clearAll = useAppStore((s) => s.clearNotifications);
  const stats = useCoreStats();
  const unread = notifications.filter((n) => !n.read).length;

  const nextTheme: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'system', system: 'dark' };
  const ThemeIcon = profile.theme === 'dark' ? Moon : profile.theme === 'light' ? Sun : Monitor;
  const themeLabel = { dark: 'Тёмная тема', light: 'Светлая тема', system: 'Системная тема' }[profile.theme];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Открыть меню">
        <Menu />
      </Button>
      <h1 className="truncate text-[17px] font-semibold tracking-tight">{titleFor(pathname)}</h1>
      <TrackSwitch />

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={onSearch}
          className="hidden h-9 w-64 items-center gap-2 rounded-lg border bg-surface px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:flex"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Поиск…</span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onSearch} aria-label="Поиск">
          <Search />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            updateProfile({ theme: nextTheme[profile.theme] });
            toast.info({ dark: 'Светлая тема', light: 'Системная тема', system: 'Тёмная тема' }[profile.theme]);
          }}
          aria-label={`Сменить тему (сейчас: ${themeLabel})`}
          title={themeLabel}
        >
          <ThemeIcon />
        </Button>

        <Popover
          className="w-[min(92vw,380px)] p-0"
          trigger={({ toggle }) => (
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Уведомления${unread ? `: ${unread} непрочитанных` : ''}`} className="relative">
              <Bell />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{unread}</span>}
            </Button>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold">Уведомления</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={markAll} disabled={!unread}>
                    <CheckCheck /> Прочитать все
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={clearAll} disabled={!notifications.length} aria-label="Очистить уведомления">
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="scrollbar-thin max-h-96 overflow-y-auto p-1.5">
                {notifications.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Уведомлений пока нет</p>}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markRead(n.id);
                      if (n.link) navigate(n.link);
                      close();
                    }}
                    className="flex w-full gap-3 rounded-lg p-2.5 text-left hover:bg-secondary"
                  >
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="block text-[13px] text-muted-foreground">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{fmtDateTime(n.date)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Popover>

        <Popover
          className="w-64"
          trigger={({ toggle }) => (
            <button onClick={toggle} className="ml-1 rounded-full ring-offset-2 ring-offset-background hover:ring-2 hover:ring-primary/40" aria-label="Меню профиля">
              <Avatar />
            </button>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center gap-3 px-2.5 py-2">
                <Avatar className="size-10" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{profile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {profile.grade} класс · {stats.xp.toLocaleString('ru-RU')} XP
                  </div>
                </div>
              </div>
              <div className="my-1 h-px bg-border" />
              <MenuItem icon={User} onClick={() => (navigate('/settings'), close())}>
                Профиль
              </MenuItem>
              <MenuItem icon={Award} onClick={() => (navigate('/achievements'), close())}>
                Достижения
              </MenuItem>
              <MenuItem icon={Settings} onClick={() => (navigate('/settings#data'), close())}>
                Настройки
              </MenuItem>
              <MenuItem
                icon={Download}
                onClick={() => {
                  downloadJson(exportPayload(), `lexedu-backup-${new Date().toISOString().slice(0, 10)}.json`);
                  toast.success('Данные экспортированы', 'JSON-файл сохранён');
                  close();
                }}
              >
                Экспорт данных
              </MenuItem>
              <div className="my-1 h-px bg-border" />
              <MenuItem
                icon={LogOut}
                onClick={() => {
                  close();
                  navigate('/account');
                }}
              >
                Аккаунт и синхронизация
              </MenuItem>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}

function TrackSwitch() {
  const track = useAppStore((s) => s.profile.activeTrack ?? 'ent');
  const updateProfile = useAppStore((s) => s.updateProfile);
  const tracks = useAppStore((s) => s.profile.tracks);
  return (
    <div className="ml-2 hidden rounded-lg border bg-secondary/60 p-0.5 sm:inline-flex" role="tablist" aria-label="Экзамен">
      {TRACKS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={track === t.id}
          title={t.full}
          onClick={() => {
            const prev = tracks?.[t.id];
            updateProfile({ activeTrack: t.id, tracks: { ...tracks, [t.id]: { ...TRACK_DEFAULTS[t.id], ...prev, enabled: true } } });
          }}
          className={cn('rounded-md px-2.5 py-1 text-xs font-semibold transition-colors', track === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}
