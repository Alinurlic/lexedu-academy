import { useMemo } from 'react';
import { activeDaySet, useAllQuestions, useAppStore } from '@/store/useAppStore';
import { accOf, allRelevantSubjects, computeStreak, longestStreak, predictScore, predictTrack, subjectSummary, weakTopics } from '@/lib/analytics';
import { trackProfile } from '@/hooks/useTrack';
import { weeklyGoals } from '@/lib/weeklyGoals';
import { levelFor } from '@/data/gamification';
import { dayKey, startOfWeek, addDays } from '@/lib/date';
import type { SubjectId, Track } from '@/types';

/** Ключевые метрики, рассчитанные по реальной активности. */
export function useCoreStats() {
  const attempts = useAppStore((s) => s.attempts);
  const studyLog = useAppStore((s) => s.studyLog);
  const profile = useAppStore((s) => s.profile);
  const xp = useAppStore((s) => s.xp);
  const tasks = useAppStore((s) => s.tasks);
  const examFormat = useAppStore((s) => s.examFormat);

  return useMemo(() => {
    const days = activeDaySet({ attempts, studyLog });
    const totalSec = Object.values(studyLog).reduce((s, v) => s + v, 0);
    const acc = accOf(attempts);
    const prediction = predictScore(attempts, profile, examFormat);
    const ws = dayKey(startOfWeek());
    const we = dayKey(addDays(startOfWeek(), 6));
    const weekTasks = tasks.filter((t) => t.date >= ws && t.date <= we);
    const weekly = weekTasks.length ? Math.round((weekTasks.filter((t) => t.done).length / weekTasks.length) * 100) : 0;
    const weekSec = Object.entries(studyLog)
      .filter(([k]) => k >= ws && k <= we)
      .reduce((s, [, v]) => s + v, 0);
    const today = dayKey();
    const todaySec = studyLog[today] ?? 0;
    const todayQuestions = attempts.filter((a) => dayKey(a.date) === today).length;
    return {
      totalQuestions: attempts.length,
      accuracy: acc.accuracy,
      correct: acc.correct,
      streak: computeStreak(days),
      longestStreak: longestStreak(days),
      totalHours: totalSec / 3600,
      weekHours: weekSec / 3600,
      todaySec,
      todayQuestions,
      xp,
      level: levelFor(xp),
      prediction,
      weeklyCompletion: weekly,
      weekTasks,
      activeDays: days.size,
    };
  }, [attempts, studyLog, profile, xp, tasks, examFormat]);
}

export function useSubjectSummary(subject: SubjectId) {
  const attempts = useAppStore((s) => s.attempts);
  const topicStatus = useAppStore((s) => s.topicStatus);
  const questions = useAllQuestions();
  return useMemo(() => subjectSummary(subject, attempts, questions, topicStatus), [subject, attempts, questions, topicStatus]);
}

export function useWeakTopics(limit = 5) {
  const attempts = useAppStore((s) => s.attempts);
  const profile = useAppStore((s) => s.profile);
  const examFormat = useAppStore((s) => s.examFormat);
  return useMemo(() => weakTopics(attempts, profile, limit, examFormat), [attempts, profile, limit, examFormat]);
}

/** Общая готовность: средний прогресс тем по всем предметам формата ЕНТ ученика. */
export function usePreparation() {
  const attempts = useAppStore((s) => s.attempts);
  const topicStatus = useAppStore((s) => s.topicStatus);
  const profile = useAppStore((s) => s.profile);
  const examFormat = useAppStore((s) => s.examFormat);
  const questions = useAllQuestions();
  return useMemo(() => {
    const subjects = allRelevantSubjects(profile, examFormat).map((id) => subjectSummary(id, attempts, questions, topicStatus));
    const topics = subjects.flatMap((s) => s.topics);
    const progress = topics.length ? Math.round(topics.reduce((a, t) => a + t.progress, 0) / topics.length) : 0;
    return { progress, subjects, completed: topics.filter((t) => t.status === 'completed').length, total: topics.length };
  }, [attempts, topicStatus, profile, examFormat, questions]);
}

export function useWeeklyGoals() {
  const attempts = useAppStore((s) => s.attempts);
  const studyLog = useAppStore((s) => s.studyLog);
  const exams = useAppStore((s) => s.exams);
  const profile = useAppStore((s) => s.profile);
  return useMemo(() => weeklyGoals({ attempts, studyLog, exams, profile }), [attempts, studyLog, exams, profile]);
}

/** Прогноз и цель для активного трека (ЕНТ / SAT / IELTS). */
export function useTrackPrediction(trackOverride?: Track) {
  const attempts = useAppStore((s) => s.attempts);
  const profile = useAppStore((s) => s.profile);
  const examFormat = useAppStore((s) => s.examFormat);
  const essayAttempts = useAppStore((s) => s.essayAttempts);
  const exams = useAppStore((s) => s.exams);
  const questions = useAllQuestions();
  const track = trackOverride ?? profile.activeTrack ?? 'ent';
  return useMemo(() => {
    const qmap = new Map(questions.map((q) => [q.id, q]));
    const essayBands = [
      ...exams.flatMap((e) => Object.entries(e.essays ?? {}).flatMap(([qid, g]) => (typeof g.band === 'number' && qmap.get(qid) ? [{ subject: qmap.get(qid)!.subject, band: g.band, date: e.finishedAt }] : []))),
      ...essayAttempts.flatMap((a) => (a.band !== null && qmap.get(a.questionId) ? [{ subject: qmap.get(a.questionId)!.subject, band: a.band, date: a.date }] : [])),
    ].sort((a, b) => a.date.localeCompare(b.date));
    const prediction = predictTrack(track, attempts, profile, examFormat, essayBands);
    const tp = trackProfile(profile, track);
    return { track, prediction, target: tp.target, trackProfile: tp };
  }, [attempts, profile, examFormat, essayAttempts, exams, questions, track]);
}
