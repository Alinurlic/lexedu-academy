import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Обычная сборка: `npm run build` → папка dist (для хостинга).
 * Один файл:      `npm run build:single` → release/LexEdu.html — открывается двойным щелчком,
 * всё (код, стили, шрифты, стикеры Lexi) встроено внутрь.
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    build: single
      ? {
          outDir: 'dist-single',
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          modulePreload: false,
          chunkSizeWarningLimit: 5000,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : {
          chunkSizeWarningLimit: 900,
          rollupOptions: {
            output: {
              manualChunks: {
                react: ['react', 'react-dom', 'react-router-dom'],
                charts: ['recharts'],
              },
            },
          },
        },
  };
});
