import { Skeleton } from '@/components/ui';
import { tr } from '@/i18n';

export function PageSkeleton({ full }: { full?: boolean }) {
  const body = (
    <div className="space-y-6" aria-busy="true" aria-label={tr('Загрузка')}>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
  if (!full) return body;
  return <div className="mx-auto max-w-[1400px] p-6 lg:pl-72">{body}</div>;
}
