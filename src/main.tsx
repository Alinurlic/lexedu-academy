import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadBank } from './data/questions/bank';
import { useAppStore } from './store/useAppStore';
import { loadModeration } from './lib/moderation';
import './index.css';

// После выкладки новой версии старые файлы страниц исчезают: если вкладка была открыта во время обновления,
// подгрузка раздела падает с 404. Перезагружаем страницу (не чаще раза в 30 секунд, чтобы не уйти в цикл).
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('lexedu-reloaded-at') || 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem('lexedu-reloaded-at', String(Date.now()));
  } catch {
    /* sessionStorage недоступен — всё равно пробуем перезагрузить */
  }
  event.preventDefault();
  window.location.reload();
});

// открытый банк заданий начинает грузиться сразу, параллельно с интерфейсом
// сначала — задания на языке сдачи ЕНТ из сохранённого профиля
void loadBank(useAppStore.getState().profile.entLang ?? 'ru');
// общие правки банка от администратора (скрытые и исправленные задания) — для всех учеников
void loadModeration();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
