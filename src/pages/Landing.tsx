import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpenCheck, CalendarCheck, ClipboardCheck, Headphones, Languages, MessageCircleHeart, NotebookPen, PenLine, Sparkles, Target, Timer } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Logo } from '@/components/icons';
import { Lexi } from '@/components/lexi/Lexi';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

/**
 * Открытая главная страница для гостей и поисковых систем: что такое LexEdu Academy и как начать.
 * Вошедший ученик сразу попадает в кабинет.
 */
const EXAMS = [
  {
    name: 'ЕНТ (ҰБТ)',
    icon: ClipboardCheck,
    points: ['120 заданий · 240 минут · 140 баллов — как на экзамене', 'История Казахстана, мат. и читательская грамотность + 2 профильных предмета', '11 профильных пар, задания на русском и казахском', 'Задания с одним и несколькими ответами, на соответствие, контекстные'],
  },
  {
    name: 'Digital SAT',
    icon: Target,
    points: ['Reading & Writing и Math: по 2 модуля', 'Второй модуль адаптивный — как в настоящем SAT', 'Перерыв между разделами и таймер по модулям', 'Примерная оценка по шкале 400–1600'],
  },
  {
    name: 'IELTS Academic',
    icon: Headphones,
    points: ['Listening: 4 части, 40 вопросов, запись звучит один раз', 'Reading: 3 текста, 40 вопросов, 60 минут', 'Writing Task 1 и Task 2 с проверкой ИИ по критериям', 'Speaking: распознавание речи и оценка ответа'],
  },
];

const FEATURES = [
  { icon: Timer, title: 'Пробные экзамены по регламенту', text: 'Тот же формат, время и подсчёт баллов. После экзамена — разбор каждого задания и сравнение с прошлыми попытками.' },
  { icon: BookOpenCheck, title: '20 000+ заданий', text: 'Практика по предметам и темам, с выбором сложности и количества. Банк на русском и казахском языках.' },
  { icon: NotebookPen, title: 'Тетрадь ошибок', text: 'Каждая ошибка сохраняется автоматически. Повторяй их, пока тема не станет «освоенной».' },
  { icon: MessageCircleHeart, title: 'Lexi — ИИ-наставник', text: 'Объясняет решения по шагам, разбирает твои ошибки, проверяет эссе IELTS и отвечает на вопросы по любому предмету.' },
  { icon: BarChart3, title: 'Умный анализ и прогноз', text: 'Прогноз балла по твоим ответам, слабые темы, темп подготовки и персональный план на неделю.' },
  { icon: CalendarCheck, title: 'План и мотивация', text: 'Задачи на день и неделю, серия занятий, уровни и достижения — чтобы готовиться регулярно.' },
];

const FAQ = [
  { q: 'Это бесплатно?', a: 'Да. Регистрация, практика, пробные экзамены и Lexi доступны бесплатно. У ИИ есть дневной лимит запросов, чтобы его хватало всем.' },
  {
    q: 'Это официальные задания ЕНТ?',
    a: 'Нет. Задания либо написаны для LexEdu, либо взяты из открытого научного датасета KazMMLU с указанием первоисточника. Формат пробных экзаменов повторяет регламент, но задания не являются официальными заданиями НЦТ, College Board или IELTS.',
  },
  { q: 'Можно готовиться на казахском?', a: 'Да. В анкете выбери язык сдачи ЕНТ — «Қазақ тілі», и практика с пробниками будут на казахском. Интерфейс пока на русском.' },
  { q: 'Зачем подтверждать email?', a: 'Так мы защищаем платформу от пустых и фейковых аккаунтов, а ты сможешь восстановить пароль и не потеряешь прогресс.' },
  { q: 'Работает на телефоне?', a: 'Да, сайт адаптирован для телефона и планшета. Прогресс сохраняется в аккаунте и доступен с любого устройства.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const auth = useAuth();
  const onboarded = useAppStore((s) => s.profile.onboarded);

  // вошедший ученик сразу идёт в кабинет
  useEffect(() => {
    if (isSupabaseConfigured && auth.ready && auth.userId) navigate('/', { replace: true });
  }, [auth.ready, auth.userId, navigate]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'LexEdu Academy — подготовка к ЕНТ, SAT и IELTS онлайн';
    return () => {
      document.title = prev;
    };
  }, []);

  const start = () => navigate(isSupabaseConfigured ? '/login?mode=up' : onboarded === false ? '/onboarding' : '/');
  const login = () => navigate(isSupabaseConfigured ? '/login' : '/');

  return (
    <div className="min-h-screen">
      {/* Шапка */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden items-center gap-5 text-sm text-muted-foreground md:flex" aria-label="Разделы страницы">
            <a href="#/welcome" onClick={(e) => (e.preventDefault(), document.getElementById('exams')?.scrollIntoView({ behavior: 'smooth' }))} className="hover:text-foreground">
              Экзамены
            </a>
            <a href="#/welcome" onClick={(e) => (e.preventDefault(), document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }))} className="hover:text-foreground">
              Возможности
            </a>
            <a href="#/welcome" onClick={(e) => (e.preventDefault(), document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }))} className="hover:text-foreground">
              Вопросы
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={login}>
              Войти
            </Button>
            <Button size="sm" onClick={start}>
              Начать бесплатно
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Первый экран */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-10 sm:px-6 md:grid-cols-[1.2fr_1fr] md:pt-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-violet" /> ЕНТ · SAT · IELTS — в одном месте
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Подготовка к ЕНТ, SAT и IELTS <span className="bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">с ИИ-наставником Lexi</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Пробные экзамены в формате настоящих, больше 20 000 заданий на русском и казахском, разбор ошибок и персональный план подготовки. Бесплатно.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={start}>
                Начать бесплатно <ArrowRight />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => document.getElementById('exams')?.scrollIntoView({ behavior: 'smooth' })}>
                Какие экзамены есть
              </Button>
            </div>
            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[
                ['20 000+', 'заданий'],
                ['120', 'заданий в пробном ЕНТ'],
                ['2', 'языка: рус · қаз'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl border bg-card/60 p-3">
                  <dt className="sr-only">{l}</dt>
                  <dd className="text-xl font-semibold tabular sm:text-2xl">{v}</dd>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative mx-auto flex justify-center">
            <div className="brand-glow absolute inset-6 rounded-full opacity-60 blur-2xl" aria-hidden />
            <Lexi mood="graduate" size="xl" className="relative" />
          </div>
        </section>

        {/* Экзамены */}
        <section id="exams" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Три экзамена — одна платформа</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">Выбери, к чему готовишься. Можно сразу к нескольким — переключение в одно касание.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {EXAMS.map(({ name, icon: Icon, points }) => (
              <Card key={name} className="p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="brand-gradient grid size-10 place-items-center rounded-xl text-white">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold">{name}</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        {/* Возможности */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Всё для подготовки</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="p-5">
                <Icon className="mb-3 size-6 text-primary" />
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Lexi */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <Card className="grid items-center gap-6 overflow-hidden p-6 md:grid-cols-[auto_1fr] md:p-8">
            <Lexi mood="thinking" size="lg" className="mx-auto" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Lexi объяснит, а не просто скажет ответ</h2>
              <p className="mt-2 text-muted-foreground">Lexi видит твою статистику: знает, какие темы проседают, и подсказывает, что повторить. Решает задачи по шагам, разбирает ошибки и проверяет эссе IELTS по официальным критериям.</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-2 text-primary-foreground">Почему в этой задаче ответ 2⁵ = 32?</div>
                <div className="w-fit max-w-[90%] rounded-2xl rounded-tl-md border bg-surface-2/70 px-4 py-2">При умножении степеней с одинаковым основанием показатели складываются: 2² · 2³ = 2²⁺³ = 2⁵ = 32. Хочешь похожую задачу для тренировки?</div>
              </div>
            </div>
          </Card>
        </section>

        {/* Как начать */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Как начать</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['Зарегистрируйся', 'Email и пароль. Подтверди почту по ссылке из письма.'],
              ['Ответь на 4 вопроса', 'Экзамен, язык сдачи, текущий уровень, последний результат и цель.'],
              ['Готовься по плану', 'Lexi составит план, а прогноз балла покажет, сколько осталось до цели.'],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-2xl border bg-card/60 p-5">
                <div className="brand-gradient mb-3 grid size-8 place-items-center rounded-full text-sm font-semibold text-white">{i + 1}</div>
                <div className="font-semibold">{t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Вопросы */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Частые вопросы</h2>
          <div className="mt-6 space-y-2">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group rounded-xl border bg-card/60 p-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Призыв */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
          <Card className="brand-glow flex flex-col items-center gap-4 p-8 text-center">
            <Languages className="size-7 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Начни подготовку сегодня</h2>
            <p className="max-w-lg text-muted-foreground">Регистрация займёт минуту. Дайындықты бүгін баста!</p>
            <Button size="lg" onClick={start}>
              Начать бесплатно <ArrowRight />
            </Button>
          </Card>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <PenLine className="size-3.5" /> © {new Date().getFullYear()} LexEdu Academy
          </div>
          <div>Часть заданий — из открытого датасета KazMMLU (MBZUAI, CC BY-NC 4.0) с указанием первоисточника.</div>
        </div>
      </footer>
    </div>
  );
}
