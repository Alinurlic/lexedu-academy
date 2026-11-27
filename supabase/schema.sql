-- LexEdu Academy — схема Supabase (PostgreSQL). Выполните целиком в SQL Editor.
-- Нужна для регистрации с подтверждением email, ролей, синхронизации прогресса и лимитов ИИ.
-- Все таблицы защищены Row Level Security: пользователь видит только свои данные.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,       -- имя, класс, цель, профильные предметы, настройки
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id text primary key,
  owner uuid references auth.users on delete cascade, -- null для общих (demo / verified)
  subject text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  type text not null check (type in ('single','multiple','numeric','boolean')),
  question text not null,
  passage text,
  options jsonb,
  correct_answer jsonb not null,
  explanation text not null,
  source text not null check (source in ('demo','user','verified')),
  source_note text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  question_id text not null,
  subject text not null,
  topic text not null,
  difficulty text not null,
  correct boolean not null,
  time_ms integer not null,
  mode text not null check (mode in ('practice','exam','review')),
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_created on public.attempts (user_id, created_at);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subject text not null,
  topics text[] not null,
  answers jsonb not null,
  duration_sec integer not null,
  xp_earned integer not null,
  started_at timestamptz not null,
  finished_at timestamptz not null
);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  config jsonb not null,
  question_ids text[] not null,
  answers jsonb not null,
  flagged text[] not null default '{}',
  score integer not null,
  max_score integer not null,
  section_scores jsonb not null,
  duration_sec integer not null,
  auto_submitted boolean not null default false,
  started_at timestamptz not null,
  finished_at timestamptz not null
);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  title text not null,
  subject text,
  kind text not null,
  target integer not null,
  progress integer not null default 0,
  priority text not null,
  done boolean not null default false,
  start_time text,
  created_at timestamptz not null default now()
);

create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  question_id text not null,
  student_answer jsonb,
  status text not null check (status in ('new','learning','mastered')),
  review_count integer not null default 0,
  last_reviewed timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.exam_results enable row level security;
alter table public.study_tasks enable row level security;
alter table public.mistakes enable row level security;
alter table public.user_achievements enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "read shared or own questions" on public.questions for select using (owner is null or owner = auth.uid());
create policy "write own questions" on public.questions for all using (owner = auth.uid()) with check (owner = auth.uid() and source = 'user');
create policy "own attempts" on public.attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on public.practice_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exams" on public.exam_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tasks" on public.study_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own mistakes" on public.mistakes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own achievements" on public.user_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== LexEdu (v2) =====
-- Роль пользователя: 'student' или 'admin'. Назначать администратора вручную:
--   update public.profiles set role = 'admin' where id = '<uuid>';
alter table public.profiles add column if not exists role text not null default 'student' check (role in ('student','admin'));
alter table public.questions add column if not exists verification text not null default 'unverified' check (verification in ('unverified','reviewed','needs_review'));
alter table public.questions add column if not exists source_ref text;
-- официальный вопрос обязан иметь ссылку на источник
alter table public.questions drop constraint if exists official_requires_ref;
alter table public.questions add constraint official_requires_ref check (source <> 'verified' or coalesce(length(trim(source_ref)), 0) > 0);

-- Снимок прогресса ученика (синхронизация локального режима)
create table if not exists public.user_state (
  user_id uuid primary key references auth.users on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Пользователь не может сам выдать себе роль admin
drop policy if exists "own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id and role = 'student');
create policy "update own profile" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()));

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Администраторы видят профили и управляют общим банком вопросов
create policy "admins read profiles" on public.profiles for select using (public.is_admin());
create policy "admins manage shared questions" on public.questions for all using (public.is_admin()) with check (public.is_admin());

-- ===== LexEdu Academy (v3) =====
-- Новые типы заданий (SAT/IELTS/ЕНТ: соответствие, ввод текста, эссе)
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('single','multiple','numeric','boolean','matching','text','essay'));

-- Профиль создаётся автоматически при регистрации (роль всегда student)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, data) values (new.id, '{}'::jsonb) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Учёт запросов к ИИ (дневной лимит на пользователя; проверяет функция /api/lexi)
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_created on public.ai_usage (user_id, created_at);
alter table public.ai_usage enable row level security;
drop policy if exists "read own usage" on public.ai_usage;
drop policy if exists "insert own usage" on public.ai_usage;
create policy "read own usage" on public.ai_usage for select using (auth.uid() = user_id);
create policy "insert own usage" on public.ai_usage for insert with check (auth.uid() = user_id and created_at > now() - interval '1 minute');
-- политик update/delete нет: пользователь не может стереть свой счётчик

-- Открытые источники заданий (например, KazMMLU, CC BY-NC 4.0): ссылка на источник обязательна
alter table public.questions drop constraint if exists questions_source_check;
alter table public.questions add constraint questions_source_check check (source in ('demo','user','verified','open'));
alter table public.questions drop constraint if exists open_requires_ref;
alter table public.questions add constraint open_requires_ref check (source <> 'open' or coalesce(length(trim(source_ref)), 0) > 0);
