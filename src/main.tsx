import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadBank } from './data/questions/bank';
import { useAppStore } from './store/useAppStore';
import './index.css';

// открытый банк заданий начинает грузиться сразу, параллельно с интерфейсом
// сначала — задания на языке сдачи ЕНТ из сохранённого профиля
void loadBank(useAppStore.getState().profile.entLang ?? 'ru');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
