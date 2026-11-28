import { create } from 'zustand';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { exportPayload, pickPersisted, useAppStore, type PersistedState } from '@/store/useAppStore';
import { applyTaxonomy, EMPTY_TAXONOMY } from '@/data/subjects';
import { tr } from '@/i18n';

/**
 * Аккаунты LexEdu Academy (Supabase Auth).
 * — Регистрация по email и паролю с обязательным подтверждением почты (включите «Confirm email» в Supabase).
 *   Пока email не подтверждён, войти нельзя — так не создаются «пустые» аккаунты.
 * — Необязательная защита от ботов Cloudflare Turnstile (VITE_TURNSTILE_SITE_KEY + секрет в Supabase).
 * — Роль (student/admin) хранится в profiles.role; повысить роль может только администратор базы.
 * Без Supabase приложение работает в локальном режиме.
 */
interface AuthState {
  ready: boolean;
  userId: string | null;
  email: string | null;
  role: 'student' | 'admin' | null;
  /** Пользователь пришёл по ссылке восстановления пароля */
  recovery: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, captchaToken?: string) => Promise<AuthResult>;
  resend: (email: string) => Promise<string | null>;
  requestReset: (email: string, captchaToken?: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  push: () => Promise<string | null>;
  pull: () => Promise<string | null>;
}

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: string; unconfirmed?: boolean };

const redirectUrl = () => `${location.origin}${location.pathname}`;

async function loadRole(userId: string): Promise<'student' | 'admin'> {
  const sb = await getSupabase();
  if (!sb) return 'student';
  const { data } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin' ? 'admin' : 'student';
}

let initStarted = false;

export const useAuth = create<AuthState>((set, get) => ({
  ready: !isSupabaseConfigured,
  userId: null,
  email: null,
  role: null,
  recovery: false,
  init: async () => {
    if (initStarted) return;
    initStarted = true;
    const sb = await getSupabase();
    if (!sb) return set({ ready: true });
    sb.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      set({ userId: user?.id ?? null, email: user?.email ?? null, ...(event === 'PASSWORD_RECOVERY' ? { recovery: true } : {}) });
      if (user) void loadRole(user.id).then((role) => set({ role }));
      else set({ role: null });
      if (event === 'SIGNED_IN' && user) void pullOnFirstLogin();
    });
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    set({ ready: true, userId: u?.id ?? null, email: u?.email ?? null, role: u ? await loadRole(u.id) : null });
    // убираем ?code=… из адреса после обмена кода на сессию
    if (location.search.includes('code=')) history.replaceState(null, '', `${location.pathname}${location.hash || '#/'}`);
  },
  signIn: async (email, password, captchaToken) => {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: tr('Supabase не настроен') };
    const { error } = await sb.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined });
    if (error) return { ok: false, error: translate(error.message), unconfirmed: /not confirmed/i.test(error.message) };
    return { ok: true };
  },
  signUp: async (email, password, captchaToken) => {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: tr('Supabase не настроен') };
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl(), captchaToken } });
    if (error) return { ok: false, error: translate(error.message) };
    // Supabase не раскрывает, существует ли email: при повторной регистрации identities пустой
    if (data.user && data.user.identities && data.user.identities.length === 0) return { ok: false, error: tr('Пользователь с таким email уже зарегистрирован. Войдите или восстановите пароль.') };
    return { ok: true, needsConfirmation: !data.session };
  },
  resend: async (email) => {
    const sb = await getSupabase();
    if (!sb) return tr('Supabase не настроен');
    const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl() } });
    return error ? translate(error.message) : null;
  },
  requestReset: async (email, captchaToken) => {
    const sb = await getSupabase();
    if (!sb) return tr('Supabase не настроен');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl(), captchaToken });
    return error ? translate(error.message) : null;
  },
  updatePassword: async (password) => {
    const sb = await getSupabase();
    if (!sb) return tr('Supabase не настроен');
    const { error } = await sb.auth.updateUser({ password });
    if (error) return translate(error.message);
    set({ recovery: false });
    return null;
  },
  signOut: async () => {
    const sb = await getSupabase();
    if (sb) await sb.auth.signOut();
    set({ userId: null, email: null, role: null });
  },
  /** Сохранить локальный прогресс в облако. PIN администратора не отправляется. */
  push: async () => {
    const sb = await getSupabase();
    const uid = get().userId;
    if (!sb || !uid) return tr('Нужно войти в аккаунт');
    const { state } = exportPayload();
    const { error } = await sb.from('user_state').upsert({ user_id: uid, state, updated_at: new Date().toISOString() });
    if (error) return translate(error.message);
    useAppStore.getState().markSynced();
    return null;
  },
  /** Загрузить прогресс из облака. Перед заменой локальные данные сохраняются в резервную копию. */
  pull: async () => {
    const sb = await getSupabase();
    const uid = get().userId;
    if (!sb || !uid) return tr('Нужно войти в аккаунт');
    const { data, error } = await sb.from('user_state').select('state').eq('user_id', uid).maybeSingle();
    if (error) return translate(error.message);
    if (!data?.state) return tr('В облаке пока нет сохранённого прогресса');
    try {
      localStorage.setItem('lexedu-store-backup-before-pull', JSON.stringify(pickPersisted(useAppStore.getState())));
    } catch {
      /* резервная копия не поместилась — продолжаем, данные из облака проверяются схемой */
    }
    const ok = useAppStore.getState().importData(data.state);
    if (!ok) return tr('Данные в облаке повреждены или устарели');
    applyTaxonomy((data.state as Partial<PersistedState>).taxonomy ?? EMPTY_TAXONOMY);
    useAppStore.getState().markSynced();
    return null;
  },
}));

/** При первом входе на новом устройстве подтягиваем прогресс из облака (если он есть, а локально пусто). */
async function pullOnFirstLogin() {
  const s = useAppStore.getState();
  if (s.attempts.length > 0 || s.profile.onboarded) {
    void useAuth.getState().push();
    return;
  }
  await useAuth.getState().pull();
}

/** Профиль (имя, экзамены, цели) — в таблицу profiles, для админ-панели и аналитики. */
export async function pushProfileToCloud() {
  const sb = await getSupabase();
  const uid = useAuth.getState().userId;
  if (!sb || !uid) return;
  const s = useAppStore.getState();
  await sb.from('profiles').upsert({ id: uid, data: s.profile, xp: s.xp, updated_at: new Date().toISOString() });
  void useAuth.getState().push();
}

/** Автосинхронизация: после изменений прогресс отправляется в облако не чаще раза в 20 секунд. */
let syncTimer: ReturnType<typeof setTimeout> | null = null;
useAppStore.subscribe((s, prev) => {
  if (!useAuth.getState().userId) return;
  if (s.attempts === prev.attempts && s.exams === prev.exams && s.profile === prev.profile && s.tasks === prev.tasks && s.mistakes === prev.mistakes) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void useAuth.getState().push(), 20000);
});

function translate(m: string) {
  if (/Invalid login credentials/i.test(m)) return tr('Неверный email или пароль');
  if (/already registered/i.test(m)) return tr('Пользователь с таким email уже зарегистрирован');
  if (/Password should be/i.test(m)) return tr('Пароль слишком короткий (минимум 8 символов)');
  if (/Email not confirmed/i.test(m)) return tr('Email не подтверждён. Перейдите по ссылке из письма или отправьте письмо ещё раз.');
  if (/captcha/i.test(m)) return tr('Подтвердите, что вы не робот');
  if (/rate limit|too many/i.test(m)) return tr('Слишком много попыток. Подождите немного и попробуйте снова.');
  if (/Unable to validate email|invalid format/i.test(m)) return tr('Некорректный email');
  return m;
}

/** SHA-256 для локального PIN администратора (PIN не хранится в открытом виде). */
export async function hashPin(pin: string) {
  const data = new TextEncoder().encode(`lexedu-admin:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
