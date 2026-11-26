import { PenLine, BarChart3, BookOpen, CalendarDays, ClipboardCheck, Database, LayoutDashboard, MessageCircleHeart, NotebookPen, Settings, ShieldCheck, Target, Trophy, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
  group?: 'main' | 'tools' | 'system';
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Обзор', icon: LayoutDashboard, description: 'Сводка прогресса и задачи на сегодня' },
  { to: '/practice', label: 'Практика', icon: Target, description: 'Тренировка по темам и сложности' },
  { to: '/exams', label: 'Пробные экзамены', icon: ClipboardCheck, description: 'ЕНТ, SAT и IELTS по регламенту, с таймером' },
  { to: '/subjects', label: 'Предметы', icon: BookOpen, description: 'Темы, прогресс и банк вопросов' },
  { to: '/mistakes', label: 'Ошибки', icon: NotebookPen, description: 'Тетрадь ошибок и повторение' },
  { to: '/assistant', label: 'Lexi-помощник', icon: MessageCircleHeart, description: 'Объяснения, решения и новые задачи', group: 'tools' },
  { to: '/studio', label: 'Writing & Speaking', icon: PenLine, description: 'Эссе и устные ответы IELTS с оценкой', group: 'tools' },
  { to: '/questions', label: 'Банк вопросов', icon: Database, description: 'Все вопросы: поиск, фильтры, импорт и экспорт', group: 'tools' },
  { to: '/planner', label: 'План', icon: CalendarDays, description: 'Недельный план подготовки' },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3, description: 'Графики и слабые темы' },
  { to: '/achievements', label: 'Достижения', icon: Trophy, description: 'Уровни, XP и награды' },
  { to: '/settings', label: 'Настройки', icon: Settings, description: 'Профиль, тема и данные', group: 'system' },
  { to: '/admin', label: 'Админ-панель', icon: ShieldCheck, description: 'Вопросы, предметы, формат ЕНТ', group: 'system' },
];

export function titleFor(pathname: string): string {
  if (pathname === '/') return 'Обзор';
  if (pathname.startsWith('/subjects/')) return 'Предмет';
  if (pathname.startsWith('/exams/')) return 'Результаты экзамена';
  if (pathname.startsWith('/practice/session')) return 'Практическая сессия';
  if (pathname.startsWith('/account')) return 'Аккаунт';
  const item = NAV.find((n) => n.to !== '/' && pathname.startsWith(n.to));
  return item?.label ?? 'LexEdu Academy';
}
