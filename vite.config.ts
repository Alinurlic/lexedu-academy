import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Обычная сборка: `npm run build` → папка dist (для хостинга).
 * Один файл:      `npm run build:single` → release/LexEdu.html — открывается двойным щелчком,
 * всё (код, стили, шрифты, стикеры Lexi) встроено внутрь.
 */
/**
 * Ключи Supabase для браузера. Помимо VITE_*, принимаем имена, которые создаёт интеграция
 * Supabase в Vercel (SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY и т.п.).
 * Берём только публичный anon/publishable ключ — service_role никогда не попадает в сборку.
 */
function publicSupabaseEnv(env: Record<string, string>) {
  const pick = (...names: string[]) => names.map((n) => env[n]?.trim()).find(Boolean) ?? '';
  return {
    url: pick('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'),
    key: pick('VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY'),
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  const sb = publicSupabaseEnv({ ...loadEnv(mode, process.cwd(), ''), ...(process.env as Record<string, string>) });
  return {
    base: './',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(sb.url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(sb.key),
    },
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
