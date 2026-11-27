import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { PageSkeleton } from '@/components/PageSkeleton';
import { BankGate } from '@/components/BankGate';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { AchievementUnlock } from '@/components/AchievementUnlock';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/lib/auth';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const ensureReminders = useAppStore((s) => s.ensureDailyReminders);
  const syncDaily = useAppStore((s) => s.syncDailyGoals);

  useEffect(() => {
    ensureReminders();
    syncDaily();
    useAppStore.getState().syncWeeklyGoals();
    void useAuth.getState().init();
  }, [ensureReminders, syncDaily]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const auth = useAuth();
  const onboarded = useAppStore((s) => s.profile.onboarded);
  // При подключённом Supabase приложение доступно только после входа (email подтверждён)
  if (isSupabaseConfigured && !auth.ready) return <PageSkeleton full />;
  if (isSupabaseConfigured && !auth.userId) return <Navigate to="/login" replace />;
  if (onboarded === false) return <Navigate to="/onboarding" replace />;

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-in slide-in-from-left">
            <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} onSearch={() => setPaletteOpen(true)} />
        <main key={pathname} className="page-enter mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <BankGate>
            <Outlet />
          </BankGate>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AchievementUnlock />
    </div>
  );
}
