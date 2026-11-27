import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadBank } from './data/questions/bank';
import './index.css';

// открытый банк заданий начинает грузиться сразу, параллельно с интерфейсом
void loadBank();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
