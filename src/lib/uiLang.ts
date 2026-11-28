import { loadUiLang, type UiLang } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';

/** Переключает язык интерфейса: загружает словарь, сохраняет выбор в профиле (интерфейс перерисуется). */
export async function setUiLanguage(lang: UiLang) {
  await loadUiLang(lang);
  useAppStore.getState().updateProfile({ language: lang });
}
