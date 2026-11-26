import type { Attempt, ExamFormat, Profile, StudyTask, SubjectId, Track } from '@/types';
import { SUBJECT_MAP, TOPIC_MAP, TRACKS } from '@/data/subjects';
import { predictTrack, trackHistory, weakTopics } from './analytics';
import { addDays, dayKey, daysBetween, fromKey, startOfWeek } from './date';
import { trackProfile } from '@/hooks/useTrack';

export interface Insight {
  id: string;
  kind: 'forecast' | 'slow' | 'forgotten' | 'difficulty' | 'exam-gap' | 'weak' | 'consistency' | 'info';
  tone: 'good' | 'warn' | 'bad' | 'info';
  title: string;
  text: string;
  action?: { label: string; to: string };
}

const trackSubjects = (track: Track) => new Set(Object.values(SUBJECT_MAP).filter((s) => s.track === track).map((s) => s.id));

/**
 * «Умный анализ»: выводы строятся только из реальных данных ученика
 * (ответы, время, режимы, даты, цели из онбординга).
 */
export function buildInsights(track: Track, attempts: Attempt[], profile: Profile, format: ExamFormat): Insight[] {
  const out: Insight[] = [];
  const rel = trackSubjects(track);
  const mine = attempts.filter((a) => rel.has(a.subject));
  const tp = trackProfile(profile, track);
  const name = TRACKS.find((t) => t.id === track)!.name;
  if (mine.length < 15) {
    return [{ id: 'need-data', kind: 'info', tone: 'info', title: 'Нужно больше данных', text: `Реши ещё ${15 - mine.length} заданий по ${name}, и я смогу построить прогноз и найти слабые места.`, action: { label: 'К практике', to: '/practice' } }];
  }

  // 1. Прогноз к дате экзамена по текущему темпу
  const pred = predictTrack(track, attempts, profile, format);
  const hist = trackHistory(track, attempts, profile, 8, format);
  const days = tp.examDate ? daysBetween(new Date(), fromKey(tp.examDate)) : 0;
  if (hist.length >= 3) {
    const recent = hist.slice(-4);
    const slopePerWeek = (recent[recent.length - 1].score - recent[0].score) / Math.max(1, recent.length - 1);
    const weeksLeft = Math.max(0, days / 7);
    const projected = Math.min(pred.max, Math.max(pred.min, Math.round((pred.value + slopePerWeek * weeksLeft) * 2) / 2));
    const gap = Math.round((tp.target - pred.value) * 10) / 10;
    const unit = track === 'ielts' ? 'band' : 'балла';
    if (days > 0 && gap > 0) {
      const need = Math.round((gap / Math.max(1, weeksLeft)) * 100) / 100;
      const ok = projected >= tp.target;
      out.push({
        id: 'forecast',
        kind: 'forecast',
        tone: ok ? 'good' : 'warn',
        title: ok ? 'Успеваешь к цели' : 'Темп ниже нужного',
        text: `Сейчас прогноз — ${pred.value}, цель — ${tp.target}. За последние недели прогноз меняется на ${slopePerWeek >= 0 ? '+' : ''}${Math.round(slopePerWeek * 100) / 100} ${unit} в неделю. При таком темпе к экзамену (через ${Math.round(weeksLeft)} нед.) выйдет около ${projected}. Нужно в среднем +${need} ${unit} в неделю.`,
        action: ok ? undefined : { label: 'Составить план', to: '/analytics#plan' },
      });
    } else if (gap <= 0) {
      out.push({ id: 'forecast', kind: 'forecast', tone: 'good', title: 'Прогноз выше цели', text: `Прогноз ${pred.value} уже не ниже цели ${tp.target}. Поддерживай форму пробными экзаменами раз в неделю и подними цель, если хочешь большего.`, action: { label: 'Пробный экзамен', to: '/exams' } });
    }
  }

  // 2. Слабые темы
  const weak = weakTopics(attempts.filter((a) => rel.has(a.subject)), { ...profile, profileSubjects: profile.profileSubjects }, 3, format).filter((w) => rel.has(w.subject));
  const weakList = weak.length ? weak : weakForTrack(mine, 3);
  for (const w of weakList.slice(0, 2)) {
    out.push({ id: `weak-${w.topicId}`, kind: 'weak', tone: w.accuracy < 0.5 ? 'bad' : 'warn', title: `Слабая тема: ${TOPIC_MAP[w.topicId]?.name}`, text: `Точность ${Math.round(w.accuracy * 100)}% по последним ответам. Рекомендую ${TOPIC_MAP[w.topicId]?.advice ?? 'повторить теорию'} и решить ${w.accuracy < 0.5 ? 15 : 10} заданий.`, action: { label: 'Тренировать', to: `/practice?subject=${w.subject}&topic=${w.topicId}&count=10` } });
  }

  // 3. Медленные темы: среднее время ответа заметно выше среднего по предмету
  const bySubj = new Map<SubjectId, Attempt[]>();
  for (const a of mine.filter((x) => x.mode !== 'review')) bySubj.set(a.subject, [...(bySubj.get(a.subject) ?? []), a]);
  let slowest: { topic: string; ratio: number; sec: number } | null = null;
  for (const [, arr] of bySubj) {
    const avg = arr.reduce((s, a) => s + a.timeMs, 0) / arr.length;
    const byTopic = new Map<string, number[]>();
    for (const a of arr) byTopic.set(a.topic, [...(byTopic.get(a.topic) ?? []), a.timeMs]);
    for (const [topic, times] of byTopic) {
      if (times.length < 6) continue;
      const t = times.reduce((s, x) => s + x, 0) / times.length;
      const ratio = t / avg;
      if (ratio >= 1.35 && (!slowest || ratio > slowest.ratio)) slowest = { topic, ratio, sec: Math.round(t / 1000) };
    }
  }
  if (slowest) out.push({ id: 'slow', kind: 'slow', tone: 'warn', title: `Медленно: ${TOPIC_MAP[slowest.topic]?.name}`, text: `На задания этой темы уходит в среднем ${slowest.sec} с — в ${Math.round(slowest.ratio * 10) / 10} раза дольше, чем на другие темы предмета. На экзамене это съедает время: потренируйся с таймером.`, action: { label: 'Практика с таймером', to: `/practice?subject=${TOPIC_MAP[slowest.topic]?.subject}&topic=${slowest.topic}` } });

  // 4. Забытые темы: точность хорошая, но давно не повторялись
  const lastSeen = new Map<string, { date: string; ok: number; n: number }>();
  for (const a of mine) {
    const e = lastSeen.get(a.topic) ?? { date: a.date, ok: 0, n: 0 };
    e.date = a.date > e.date ? a.date : e.date;
    e.n++;
    if (a.correct) e.ok++;
    lastSeen.set(a.topic, e);
  }
  const stale = [...lastSeen.entries()].filter(([, e]) => e.n >= 5 && e.ok / e.n >= 0.65 && daysBetween(new Date(e.date), new Date()) >= 14).sort((a, b) => a[1].date.localeCompare(b[1].date));
  if (stale.length) {
    const [topic, e] = stale[0];
    out.push({ id: 'forgotten', kind: 'forgotten', tone: 'info', title: `Пора повторить: ${TOPIC_MAP[topic]?.name}`, text: `Ты хорошо знал(а) эту тему (${Math.round((e.ok / e.n) * 100)}%), но не возвращался(ась) к ней ${daysBetween(new Date(e.date), new Date())} дней. Короткое повторение сейчас закрепит знание надолго.`, action: { label: 'Повторить 5 заданий', to: `/practice?subject=${TOPIC_MAP[topic]?.subject}&topic=${topic}&count=5` } });
  }

  // 5. Сложность: лёгкие решаются, сложные — нет
  const acc = (d: string) => {
    const arr = mine.filter((a) => a.difficulty === d).slice(-60);
    return arr.length >= 8 ? arr.filter((a) => a.correct).length / arr.length : null;
  };
  const easy = acc('easy');
  const hard = acc('hard');
  if (easy !== null && hard !== null && easy - hard >= 0.3) out.push({ id: 'difficulty', kind: 'difficulty', tone: 'warn', title: 'Провал на сложных заданиях', text: `Лёгкие — ${Math.round(easy * 100)}%, сложные — ${Math.round(hard * 100)}%. Основной резерв баллов — в сложных заданиях: выбирай сложность «Сложная» в практике и разбирай решения.`, action: { label: 'Сложные задания', to: '/practice' } });

  // 6. Экзамен хуже практики
  const pr = mine.filter((a) => a.mode === 'practice').slice(-150);
  const ex = mine.filter((a) => a.mode === 'exam').slice(-150);
  if (pr.length >= 20 && ex.length >= 20) {
    const p = pr.filter((a) => a.correct).length / pr.length;
    const e = ex.filter((a) => a.correct).length / ex.length;
    if (p - e >= 0.1) out.push({ id: 'exam-gap', kind: 'exam-gap', tone: 'warn', title: 'На экзамене результат ниже', text: `В практике ${Math.round(p * 100)}%, на пробных экзаменах — ${Math.round(e * 100)}%. Вероятные причины — время и волнение. Проходи пробники в полном формате раз в неделю и отмечай трудные вопросы флажком, чтобы не застревать.`, action: { label: 'Пробный экзамен', to: '/exams' } });
  }

  // 7. Регулярность
  const last14 = new Set(mine.filter((a) => daysBetween(new Date(a.date), new Date()) < 14).map((a) => dayKey(a.date)));
  if (last14.size < 6) out.push({ id: 'consistency', kind: 'consistency', tone: 'info', title: 'Занимайся чаще, но меньше', text: `За последние 2 недели занятия были только в ${last14.size} дн. Регулярность важнее длительности: 30–40 минут каждый день дают больше, чем 3 часа раз в неделю.`, action: { label: 'План недели', to: '/planner' } });

  return out;
}

function weakForTrack(attempts: Attempt[], limit: number) {
  const by = new Map<string, Attempt[]>();
  for (const a of attempts) by.set(a.topic, [...(by.get(a.topic) ?? []), a]);
  return [...by.entries()]
    .map(([topicId, arr]) => {
      const r = arr.slice(-25);
      return { topicId, subject: arr[0].subject, accuracy: r.filter((a) => a.correct).length / r.length, n: r.length };
    })
    .filter((x) => x.n >= 4 && x.accuracy < 0.7)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

/** Автоплан на текущую неделю: слабые темы, повторение ошибок, пробный экзамен. */
export function buildWeekPlan(track: Track, attempts: Attempt[], mistakesOpen: number): Omit<StudyTask, 'id' | 'createdAt' | 'progress' | 'done'>[] {
  const rel = trackSubjects(track);
  const mine = attempts.filter((a) => rel.has(a.subject));
  const weak = weakForTrack(mine, 4);
  const ws = startOfWeek();
  const todayIdx = (new Date().getDay() + 6) % 7;
  const days = Array.from({ length: 7 - todayIdx }, (_, i) => dayKey(addDays(ws, todayIdx + i)));
  const tasks: Omit<StudyTask, 'id' | 'createdAt' | 'progress' | 'done'>[] = [];
  const subjects = [...rel].filter((s) => s !== 'ielts-speaking' && s !== 'ielts-writing');
  days.forEach((date, i) => {
    const w = weak[i % Math.max(1, weak.length)];
    if (w) tasks.push({ date, title: `${TOPIC_MAP[w.topicId]?.name}: 10 заданий`, subject: w.subject, kind: 'questions', target: 10, priority: w.accuracy < 0.5 ? 'high' : 'medium', startTime: '17:00' });
    else tasks.push({ date, title: `${SUBJECT_MAP[subjects[i % subjects.length]].name}: 15 заданий`, subject: subjects[i % subjects.length], kind: 'questions', target: 15, priority: 'medium', startTime: '17:00' });
    if (mistakesOpen > 0 && i % 2 === 0) tasks.push({ date, title: 'Повторить ошибки', kind: 'questions', target: Math.min(10, mistakesOpen), priority: 'medium', startTime: '18:00' });
    if (track === 'ielts' && i % 3 === 1) tasks.push({ date, title: 'IELTS Writing: одно эссе в Студии', subject: 'ielts-writing', kind: 'custom', target: 1, priority: 'medium', startTime: '19:00' });
  });
  const examDay = days[days.length - 1];
  tasks.push({ date: examDay, title: `Пробный экзамен ${TRACKS.find((t) => t.id === track)!.name}`, kind: 'custom', target: 1, priority: 'high', startTime: '10:00' });
  return tasks;
}

/** Компактная сводка для ИИ (чат и персональный план). Без персональных данных, кроме имени. */
export function studentSummary(profile: Profile, attempts: Attempt[], format: ExamFormat, mistakesOpen: number): string {
  const lines: string[] = [`Имя: ${profile.name || 'ученик'}, класс: ${profile.grade}`];
  for (const t of ['ent', 'sat', 'ielts'] as Track[]) {
    const tp = trackProfile(profile, t);
    if (t !== 'ent' && !tp.enabled) continue;
    const pred = predictTrack(t, attempts, profile, format);
    const days = tp.examDate ? daysBetween(new Date(), fromKey(tp.examDate)) : null;
    lines.push(`${TRACKS.find((x) => x.id === t)!.name}: уровень ${tp.level}, последний результат ${tp.lastResult ?? 'нет'}, цель ${tp.target}, прогноз по ответам ${pred.value}${days !== null ? `, до экзамена ${days} дн.` : ''}; разделы: ${pred.parts.map((p) => `${p.label} ${p.value ?? '—'}/${p.max}`).join(', ')}`);
    const rel = trackSubjects(t);
    const weak = weakForTrack(attempts.filter((a) => rel.has(a.subject)), 5);
    if (weak.length) lines.push(`  Слабые темы: ${weak.map((w) => `${TOPIC_MAP[w.topicId]?.name} (${SUBJECT_MAP[w.subject].name}) ${Math.round(w.accuracy * 100)}%`).join('; ')}`);
  }
  if (t14(attempts)) lines.push(`Ответов за 14 дней: ${t14(attempts)}`);
  lines.push(`Неосвоенных ошибок: ${mistakesOpen}`);
  return lines.join('\n');
}

const t14 = (attempts: Attempt[]) => attempts.filter((a) => daysBetween(new Date(a.date), new Date()) < 14).length;
