import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useApplyTheme() {
  const theme = useAppStore((s) => s.profile.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export function useIsDark() {
  const theme = useAppStore((s) => s.profile.theme);
  if (theme === 'system') return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return theme === 'dark';
}
