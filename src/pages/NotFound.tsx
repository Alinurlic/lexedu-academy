import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { tr } from '@/i18n';

export default function NotFound() {
  const navigate = useNavigate();
  return <EmptyState icon={Compass} lexi="thinking" title={tr('Страница не найдена')} description={tr('Похоже, такого раздела нет. Вернитесь на главную и продолжите подготовку.')} action={<Button onClick={() => navigate('/')}>{tr('На главную')}</Button>} className="mt-10" />;
}
