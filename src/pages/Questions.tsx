import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { LexiBubble } from '@/components/lexi/Lexi';
import { QuestionBankTable } from '@/components/questions/QuestionBankTable';

export default function Questions() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <LexiBubble mood="reading" text="Здесь все вопросы платформы. Ищи по теме, сложности и источнику, сохраняй в закладки и выгружай подборки в JSON." size="sm">
        <p className="text-xs text-muted-foreground">Демо-вопросы — оригинальные учебные задания LexEdu. Официальные задания отмечаются отдельно и всегда со ссылкой на источник.</p>
      </LexiBubble>
      <Card className="p-5">
        <QuestionBankTable />
      </Card>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ShieldCheck /> Редактирование и импорт — в админ-панели
        </Button>
      </div>
    </div>
  );
}
