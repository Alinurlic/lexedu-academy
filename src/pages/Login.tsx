import { useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { CloudDownload, CloudOff, CloudUpload, KeyRound, LogIn, LogOut, MailCheck, RotateCcw, UserPlus } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FieldError, Input, Label, Segmented } from '@/components/ui';
import { Lexi } from '@/components/lexi/Lexi';
import { Logo } from '@/components/icons';
import { Turnstile, TURNSTILE_SITE_KEY } from '@/components/Turnstile';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { fmtDateTime } from '@/lib/date';
import { toast } from '@/store/toast';

const emailSchema = z.string().trim().email('Введите корректный email').max(254);
const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .max(72, 'Не длиннее 72 символов')
  .regex(/[A-Za-zА-Яа-я]/, 'Добавьте хотя бы одну букву')
  .regex(/\d/, 'Добавьте хотя бы одну цифру');

type Mode = 'in' | 'up' | 'reset' | 'sent' | 'recovery';

/** Вход, регистрация с подтверждением email, восстановление пароля. В локальном режиме — пояснение. */
export default function Login({ standalone }: { standalone?: boolean }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const lastSyncAt = useAppStore((s) => s.lastSyncAt);
  const onboarded = useAppStore((s) => s.profile.onboarded);
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const onToken = useCallback((t: string | null) => setCaptcha(t), []);

  const wrap = (children: React.ReactNode) =>
    standalone ? (
      <div className="grid min-h-screen place-items-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    ) : (
      <div className="mx-auto max-w-md">{children}</div>
    );

  if (!isSupabaseConfigured) {
    return wrap(
      <Card className="p-8 text-center">
        <Lexi mood="reading" size="lg" className="mx-auto" />
        <h2 className="mt-3 text-xl font-semibold">Локальный режим</h2>
        <p className="mt-2 text-sm text-muted-foreground">Аккаунты не подключены: не заданы ключи Supabase. Прогресс хранится в этом браузере и сохраняется автоматически. Перенести его можно экспортом и импортом JSON в настройках.</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CloudOff className="size-4" /> Чтобы включить регистрацию, задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
        </div>
        <Button className="mt-6" onClick={() => navigate('/')}>
          Продолжить
        </Button>
      </Card>,
    );
  }

  if (!auth.ready) return wrap(<Card className="p-8 text-center text-sm text-muted-foreground">Проверяю сессию…</Card>);

  // Ссылка из письма «восстановить пароль»
  if (auth.recovery || mode === 'recovery') {
    const save = async () => {
      const p = passwordSchema.safeParse(password);
      if (!p.success) return setErrors({ password: p.error.issues[0].message });
      if (password !== password2) return setErrors({ password2: 'Пароли не совпадают' });
      setBusy(true);
      const err = await auth.updatePassword(password);
      setBusy(false);
      if (err) return setErrors({ form: err });
      toast.success('Пароль обновлён');
      navigate('/');
    };
    return wrap(
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Новый пароль</h2>
        <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), void save())}>
          <div>
            <Label htmlFor="np">Новый пароль</Label>
            <Input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <FieldError>{errors.password}</FieldError>
          </div>
          <div>
            <Label htmlFor="np2">Повторите пароль</Label>
            <Input id="np2" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            <FieldError>{errors.password2}</FieldError>
          </div>
          <FieldError>{errors.form}</FieldError>
          <Button type="submit" className="w-full" loading={busy}>
            <KeyRound /> Сохранить пароль
          </Button>
        </form>
      </Card>,
    );
  }

  // Уже вошёл
  if (auth.userId) {
    if (standalone) return <Navigate to={onboarded === false ? '/onboarding' : '/'} replace />;
    const run = async (fn: () => Promise<string | null>, ok: string) => {
      setBusy(true);
      const err = await fn();
      setBusy(false);
      if (err) toast.error(err);
      else toast.success(ok);
    };
    return wrap(
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Аккаунт</CardTitle>
            <CardDescription>{auth.email}</CardDescription>
          </div>
          <Badge variant={auth.role === 'admin' ? 'violet' : 'secondary'}>{auth.role === 'admin' ? 'Администратор' : 'Ученик'}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Прогресс синхронизируется автоматически. Последняя синхронизация: {lastSyncAt ? fmtDateTime(lastSyncAt) : 'ещё не выполнялась'}</p>
          <div className="flex flex-wrap gap-2">
            <Button loading={busy} onClick={() => run(auth.push, 'Прогресс сохранён в облаке')}>
              <CloudUpload /> Сохранить сейчас
            </Button>
            <Button variant="secondary" loading={busy} onClick={() => run(auth.pull, 'Прогресс загружен из облака')}>
              <CloudDownload /> Загрузить из облака
            </Button>
            <Button variant="ghost" onClick={() => void auth.signOut().then(() => navigate('/login'))}>
              <LogOut /> Выйти
            </Button>
          </div>
        </CardContent>
      </Card>,
    );
  }

  if (mode === 'sent') {
    return wrap(
      <Card className="p-6 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <h2 className="mt-3 text-lg font-semibold">Подтвердите email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Мы отправили письмо на <b className="text-foreground">{email}</b>. Перейдите по ссылке в письме — после этого вы сможете войти. Проверьте папку «Спам».
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const err = await auth.resend(email);
              setBusy(false);
              if (err) toast.error(err);
              else toast.success('Письмо отправлено ещё раз');
            }}
          >
            <RotateCcw /> Отправить ещё раз
          </Button>
          <Button onClick={() => setMode('in')}>Я подтвердил(а) — войти</Button>
        </div>
      </Card>,
    );
  }

  const submit = async () => {
    const e: Record<string, string> = {};
    const em = emailSchema.safeParse(email);
    if (!em.success) e.email = em.error.issues[0].message;
    if (mode !== 'reset') {
      const pw = mode === 'up' ? passwordSchema.safeParse(password) : z.string().min(1, 'Введите пароль').safeParse(password);
      if (!pw.success) e.password = pw.error.issues[0].message;
      if (mode === 'up' && password !== password2) e.password2 = 'Пароли не совпадают';
    }
    if (TURNSTILE_SITE_KEY && !captcha) e.form = 'Подтвердите, что вы не робот';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setUnconfirmed(false);
    const cleanEmail = email.trim().toLowerCase();
    if (mode === 'reset') {
      const err = await auth.requestReset(cleanEmail, captcha ?? undefined);
      setBusy(false);
      if (err) return setErrors({ form: err });
      toast.success('Письмо для восстановления отправлено', 'Перейдите по ссылке в письме');
      return setMode('in');
    }
    const res = mode === 'in' ? await auth.signIn(cleanEmail, password, captcha ?? undefined) : await auth.signUp(cleanEmail, password, captcha ?? undefined);
    setBusy(false);
    if (!res.ok) {
      if (res.unconfirmed) setUnconfirmed(true);
      return setErrors({ form: res.error });
    }
    if (mode === 'up' && res.needsConfirmation) return setMode('sent');
    toast.success(mode === 'in' ? 'Вы вошли в аккаунт' : 'Аккаунт создан');
  };

  return wrap(
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <Lexi mood={mode === 'up' ? 'graduate' : 'default'} size="sm" decorative />
        <div>
          <h2 className="text-lg font-semibold">{mode === 'in' ? 'Вход в LexEdu Academy' : mode === 'up' ? 'Регистрация' : 'Восстановление пароля'}</h2>
          <p className="text-sm text-muted-foreground">{mode === 'up' ? 'Понадобится подтвердить email' : mode === 'reset' ? 'Пришлём ссылку для нового пароля' : 'ЕНТ · SAT · IELTS'}</p>
        </div>
      </div>
      {mode !== 'reset' && <Segmented value={mode as 'in' | 'up'} onChange={(m) => (setMode(m), setErrors({}))} options={[{ value: 'in', label: 'Вход' }, { value: 'up', label: 'Регистрация' }]} className="mb-4" />}
      <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), void submit())}>
        <div>
          <Label htmlFor="l-email">Email</Label>
          <Input id="l-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FieldError>{errors.email}</FieldError>
        </div>
        {mode !== 'reset' && (
          <div>
            <Label htmlFor="l-pass">Пароль</Label>
            <Input id="l-pass" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === 'up' && <p className="mt-1 text-[11px] text-muted-foreground">Минимум 8 символов, буквы и цифры</p>}
            <FieldError>{errors.password}</FieldError>
          </div>
        )}
        {mode === 'up' && (
          <div>
            <Label htmlFor="l-pass2">Повторите пароль</Label>
            <Input id="l-pass2" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            <FieldError>{errors.password2}</FieldError>
          </div>
        )}
        <Turnstile onToken={onToken} />
        <FieldError>{errors.form}</FieldError>
        {unconfirmed && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={async () => {
              const err = await auth.resend(email.trim().toLowerCase());
              if (err) toast.error(err);
              else setMode('sent');
            }}
          >
            <RotateCcw /> Отправить письмо подтверждения ещё раз
          </Button>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          {mode === 'in' ? <LogIn /> : mode === 'up' ? <UserPlus /> : <KeyRound />} {mode === 'in' ? 'Войти' : mode === 'up' ? 'Создать аккаунт' : 'Отправить ссылку'}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm">
        {mode === 'in' && (
          <button className="text-muted-foreground hover:text-foreground" onClick={() => (setMode('reset'), setErrors({}))}>
            Забыли пароль?
          </button>
        )}
        {mode === 'reset' && (
          <button className="text-muted-foreground hover:text-foreground" onClick={() => (setMode('in'), setErrors({}))}>
            Вернуться ко входу
          </button>
        )}
      </div>
    </Card>,
  );
}
