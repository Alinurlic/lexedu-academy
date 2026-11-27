import type { ReactNode } from 'react';
import { useBank } from '@/data/questions/bank';
import { PageSkeleton } from './PageSkeleton';

/** Показывает скелетон, пока догружается открытый банк заданий (обычно доли секунды). */
export function BankGate({ children, full }: { children: ReactNode; full?: boolean }) {
  const status = useBank((s) => s.status);
  if (status === 'loading') return <PageSkeleton full={full} />;
  return <>{children}</>;
}
