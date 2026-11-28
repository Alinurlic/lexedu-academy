import { PenLine, BarChart3, BookOpen, CalendarDays, ClipboardCheck, Database, LayoutDashboard, MessageCircleHeart, NotebookPen, Settings, ShieldCheck, Target, Trophy, type LucideIcon } from 'lucide-react';
import { tr } from '@/i18n';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
  group?: 'main' | 'tools' | 'system';
}

export const NAV: NavItem[] = [
  { to: '/', get label() {
    return tr('Обзор');
  }, icon: LayoutDashboard, get description() {
    return tr('Сводка прогресса и задачи на сегодня');
  } },
  { to: '/practice', get label() {
    return tr('Практика');
  }, icon: Target, get description() {
    return tr('Тренировка по темам и сложности');
  } },
  { to: '/exams', get label() {
    return tr('Пробные экзамены');
  }, icon: ClipboardCheck, get description() {
    return tr('ЕНТ, SAT и IELTS по регламенту, с таймером');
  } },
  { to: '/subjects', get label() {
    return tr('Предметы');
  }, icon: BookOpen, get description() {
    return tr('Темы, прогресс и банк вопросов');
  } },
  { to: '/mistakes', get label() {
    return tr('Ошибки');
  }, icon: NotebookPen, get description() {
    return tr('Тетрадь ошибок и повторение');
  } },
  { to: '/assistant', get label() {
    return tr('Lexi-помощник');
  }, icon: MessageCircleHeart, get description() {
    return tr('Объяснения, решения и новые задачи');
  }, group: 'tools' },
  { to: '/studio', label: 'Writing & Speaking', icon: PenLine, get description() {
    return tr('Эссе и устные ответы IELTS с оценкой');
  }, group: 'tools' },
  { to: '/questions', get label() {
    return tr('Банк вопросов');
  }, icon: Database, get description() {
    return tr('Все вопросы: поиск, фильтры, импорт и экспорт');
  }, group: 'tools' },
  { to: '/planner', get label() {
    return tr('План');
  }, icon: CalendarDays, get description() {
    return tr('Недельный план подготовки');
  } },
  { to: '/analytics', get label() {
    return tr('Аналитика');
  }, icon: BarChart3, get description() {
    return tr('Графики и слабые темы');
  } },
  { to: '/achievements', get label() {
    return tr('Достижения');
  }, icon: Trophy, get description() {
    return tr('Уровни, XP и награды');
  } },
  { to: '/settings', get label() {
    return tr('Настройки');
  }, icon: Settings, get description() {
    return tr('Профиль, тема и данные');
  }, group: 'system' },
  { to: '/admin', get label() {
    return tr('Админ-панель');
  }, icon: ShieldCheck, get description() {
    return tr('Вопросы, предметы, формат ЕНТ');
  }, group: 'system' },
];

export function titleFor(pathname: string): string {
  if (pathname === '/') return tr('Обзор');
  if (pathname.startsWith('/subjects/')) return tr('Предмет');
  if (pathname.startsWith('/exams/')) return tr('Результаты экзамена');
  if (pathname.startsWith('/practice/session')) return tr('Практическая сессия');
  if (pathname.startsWith('/account')) return tr('Аккаунт');
  const item = NAV.find((n) => n.to !== '/' && pathname.startsWith(n.to));
  return item?.label ?? 'LexEdu Academy';
}
