import type { Attempt, ChatMessage, Mistake, Profile, Question } from '@/types';
import { TOPIC_MAP } from '@/data/subjects';
import { formatAnswer, formatCorrect } from '@/data/questions';
import { weakTopics } from '@/lib/analytics';
import { uid } from '@/lib/utils';
import { findConcept, CONCEPTS } from './concepts';
import { generateTask } from './generators';
import { solveEquation } from './solver';
import { aiChat, aiStatus } from '@/lib/ai';

/**
 * Lexi-помощник.
 * Если на сервере подключён ИИ (Vercel-функция /api/lexi + ANTHROPIC_API_KEY), ответы даёт Claude.
 * Иначе — демо-режим, полностью локальный: решатель уравнений, генератор задач с вычисленными ответами,
 * база объяснений и анализ данных ученика. Интерфейс всегда показывает, какой режим активен.
 */
export interface AssistantContext {
  profile: Profile;
  attempts: Attempt[];
  mistakes: Mistake[];
  qmap: Map<string, Question>;
  /** Сводка статистики ученика для ИИ */
  summary?: string;
}

const msg = (text: string, card?: ChatMessage['card']): ChatMessage => ({ id: uid('chat'), role: 'lexi', text, date: new Date().toISOString(), card });
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();

export async function askLexi(input: string, ctx: AssistantContext, history: ChatMessage[]): Promise<ChatMessage[]> {
  // Карточки (генератор задач, разбор ошибки по кнопке) всегда строятся локально — они точные и бесплатные
  const local = /ошибк[уа]?\s+#\S+/i.test(input) || /сгенерир|дай задач|ещё задач|еще задач/.test(norm(input));
  const st = await aiStatus();
  if (st.enabled && !local) {
    try {
      const turns = history
        .slice(-12)
        .filter((h) => h.text.trim())
        .map((h) => ({ role: h.role === 'lexi' ? ('assistant' as const) : ('user' as const), content: h.text.slice(0, 4000) }));
      while (turns.length && turns[0].role !== 'user') turns.shift();
      const r = await aiChat(turns.length ? turns : [{ role: 'user', content: input }], ctx.summary ?? '');
      return [msg(r.reply)];
    } catch (e) {
      return [msg(`ИИ сейчас недоступен (${e instanceof Error ? e.message : 'ошибка'}). Отвечаю в демо-режиме:`), ...demoRespond(input, ctx)];
    }
  }
  return demoRespond(input, ctx);
}

export function demoRespond(input: string, ctx: AssistantContext): ChatMessage[] {
  const t = norm(input);
  if (!t) return [msg('Напиши вопрос или выбери подсказку ниже.')];

  // 1. Объяснение конкретной ошибки (из кнопки или по номеру)
  const mm = input.match(/ошибк[уа]?\s+#(\S+)/i);
  if (mm) {
    const m = ctx.mistakes.find((x) => x.id === mm[1]);
    const q = m && ctx.qmap.get(m.questionId);
    if (!m || !q) return [msg('Не нашёл эту ошибку — возможно, её удалили из тетради.')];
    const tp = TOPIC_MAP[q.topic];
    return [
      msg(
        `Разберём! Ты ответил: «${formatAnswer(q, m.studentAnswer)}», а верно: «${formatCorrect(q)}».\n\nПочему так: ${q.explanation}${tp ? `\n\nСовет по теме «${tp.name}»: ${tp.advice}.` : ''}`,
        { kind: 'mistake', questionId: q.id },
      ),
    ];
  }

  // 2. Решение уравнения
  if (/=/.test(t) && /[xх]/.test(t)) {
    const sol = solveEquation(input);
    if (sol) return [msg(`${sol.title}\n\n${sol.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nОтвет: ${sol.answer}`)];
    return [msg('Не смог разобрать уравнение. Я понимаю линейные и квадратные уравнения с x, например: «2x + 3 = 11» или «x^2 - 5x + 6 = 0».')];
  }

  // 3. Ошибки — список для выбора
  if (/ошибк|неправильн|неверн|почему я/.test(t)) {
    const open = ctx.mistakes.filter((m) => m.status !== 'mastered').sort((a, b) => b.date.localeCompare(a.date));
    if (!open.length) return [msg('В тетради нет неосвоенных ошибок. Отличная работа!')];
    return [msg(`У тебя ${open.length} неосвоенных ошибок. Выбери любую ниже — я объясню решение по шагам.`)];
  }

  // 4. Генерация задач
  if (/сгенерир|придумай|дай задач|новую задач|еще задач|ещё задач|задачу|потренир|практик/.test(t)) {
    const weak = weakTopics(ctx.attempts, ctx.profile, 5).map((w) => w.topicId);
    const task = generateTask({ text: t, weakTopics: weak });
    return [
      msg(`Вот новая задача${TOPIC_MAP[task.topic] ? ` по теме «${TOPIC_MAP[task.topic].name}»` : ''}. Числа подобраны случайно, ответ вычислен. Попробуй решить сам, затем проверь.`, {
        kind: 'generated',
        question: task.question,
        answer: task.answer,
        unit: task.unit,
        steps: task.steps,
        subject: task.subject,
        topic: task.topic,
      }),
    ];
  }

  // 5. Рекомендации по данным ученика
  if (/что повтор|рекоменд|слаб|что учить|с чего начать|план/.test(t)) {
    const weak = weakTopics(ctx.attempts, ctx.profile, 4);
    if (!weak.length) return [msg('По твоим ответам слабых тем не видно: везде, где хватает статистики, точность выше 70%. Попробуй пробный ЕНТ, чтобы проверить себя в формате экзамена.')];
    return [msg('Я посмотрел твои последние ответы. В первую очередь стоит подтянуть эти темы:', { kind: 'topics', items: weak.map((w) => ({ topicId: w.topicId, subject: w.subject, accuracy: w.accuracy })) })];
  }

  // 6. Объяснение понятия
  const c = findConcept(t);
  if (c) return [msg(`${c.title}\n\n${c.text.map((x) => `• ${x}`).join('\n')}`)];

  if (/привет|здравств|салем|сәлем|hello|hi\b/.test(t)) {
    return [msg(`Привет, ${ctx.profile.name}! Я Lexi. Сейчас я работаю в демо-режиме (без ИИ): решаю уравнения по шагам, объясняю твои ошибки, придумываю новые задачи и подсказываю, что повторить.`)];
  }

  return [
    msg(
      `В демо-режиме я понимаю ограниченный набор запросов. Попробуй:\n• «реши x^2 - 5x + 6 = 0»\n• «объясни мои ошибки»\n• «дай задачу на проценты»\n• «что мне повторить?»\n• объяснение темы: ${CONCEPTS.slice(0, 6)
        .map((x) => `«${x.title.toLowerCase()}»`)
        .join(', ')}`,
    ),
  ];
}
