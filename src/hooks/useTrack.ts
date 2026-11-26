import { useAppStore } from '@/store/useAppStore';
import type { Profile, Track, TrackProfile } from '@/types';

/** Значения по умолчанию для каждого трека (используются до прохождения онбординга). */
export const TRACK_DEFAULTS: Record<Track, TrackProfile> = {
  ent: { enabled: true, level: 'intermediate', lastResult: null, lastResultDate: null, target: 120, examDate: '' },
  sat: { enabled: false, level: 'intermediate', lastResult: null, lastResultDate: null, target: 1400, examDate: '' },
  ielts: { enabled: false, level: 'intermediate', lastResult: null, lastResultDate: null, target: 7, examDate: '' },
};

export function trackProfile(profile: Profile, track: Track): TrackProfile {
  const base = TRACK_DEFAULTS[track];
  const t = profile.tracks?.[track];
  const merged = { ...base, ...t };
  if (track === 'ent') {
    merged.target = t?.target ?? profile.targetScore;
    merged.examDate = t?.examDate || profile.examDate;
  }
  return merged;
}

export function useTrack(): Track {
  return useAppStore((s) => s.profile.activeTrack ?? 'ent');
}

export function enabledTracks(profile: Profile): Track[] {
  const list = (['ent', 'sat', 'ielts'] as Track[]).filter((t) => (t === 'ent' ? profile.tracks?.ent?.enabled !== false : profile.tracks?.[t]?.enabled));
  return list.length ? list : ['ent'];
}

export const LEVEL_LABEL: Record<TrackProfile['level'], string> = {
  beginner: 'Начальный',
  elementary: 'Базовый',
  intermediate: 'Средний',
  upper: 'Выше среднего',
  advanced: 'Продвинутый',
};
