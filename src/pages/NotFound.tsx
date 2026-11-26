import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';

export default function NotFound() {
  const navigate = useNavigate();
  return <EmptyState icon={Compass} lexi="thinking" title="Страница не найдена" description="Похоже, такого раздела нет. Вернитесь на главную и продолжите подготовку." action={<Button onClick={() => navigate('/')}>На главную</Button>} className="mt-10" />;
}
