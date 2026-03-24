-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- SANDBOXES TABLE
-- Tracks Vercel sandbox instances for each user
-- ============================================================
create table if not exists public.sandboxes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  sandbox_id  text,
  status      text not null default 'creating'
              check (status in ('creating', 'running', 'stopped', 'error', 'restarting')),
  expires_at  timestamptz,
  snapshot_id text,
  port        integer not null default 18789,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sandboxes_user_id_idx on public.sandboxes(user_id);
create index if not exists sandboxes_status_idx on public.sandboxes(status);

-- ============================================================
-- TELEGRAM CONFIGS TABLE
-- Stores per-user Telegram bot configuration
-- ============================================================
create table if not exists public.telegram_configs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  bot_token       text not null,
  bot_username    text,
  dm_policy       text not null default 'pairing'
                  check (dm_policy in ('pairing', 'allowlist', 'open', 'disabled')),
  allow_from      text[] not null default '{}',
  group_policy    text not null default 'allowlist'
                  check (group_policy in ('open', 'allowlist', 'disabled')),
  group_allow_from text[] not null default '{}',
  groups          jsonb not null default '{}',
  streaming       text not null default 'partial'
                  check (streaming in ('off', 'partial', 'block', 'progress')),
  link_preview    boolean not null default true,
  reply_to_mode   text not null default 'off'
                  check (reply_to_mode in ('off', 'first', 'all')),
  enabled         boolean not null default true,
  configured_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists telegram_configs_user_id_idx on public.telegram_configs(user_id);

-- ============================================================
-- ACTIVITY LOGS TABLE
-- Records all system actions (extend, restart, configure, etc.)
-- ============================================================
create table if not exists public.activity_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  sandbox_id  text,
  action      text not null,
  status      text not null default 'pending'
              check (status in ('success', 'failed', 'pending')),
  message     text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_logs_user_id_idx on public.activity_logs(user_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.sandboxes enable row level security;
alter table public.telegram_configs enable row level security;
alter table public.activity_logs enable row level security;

-- Sandboxes: users can only see/edit their own
create policy "Users manage own sandboxes"
  on public.sandboxes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Telegram configs: users can only see/edit their own
create policy "Users manage own telegram config"
  on public.telegram_configs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activity logs: users can only view their own
create policy "Users view own activity logs"
  on public.activity_logs for select
  using (auth.uid() = user_id);

-- Service role can insert logs (for cron jobs)
create policy "Service role insert logs"
  on public.activity_logs for insert
  with check (true);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sandboxes_updated_at
  before update on public.sandboxes
  for each row execute procedure public.handle_updated_at();

create trigger telegram_configs_updated_at
  before update on public.telegram_configs
  for each row execute procedure public.handle_updated_at();
