-- ============================================================
-- LLM CONFIGS TABLE
-- Stores per-user AI provider configuration (API key + model)
-- ============================================================
create table if not exists public.llm_configs (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  provider     text not null default 'openai'
               check (provider in ('openai', 'anthropic', 'google', 'groq', 'openrouter')),
  api_key      text not null,
  model        text not null default 'gpt-4o',
  configured_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists llm_configs_user_id_idx on public.llm_configs(user_id);

-- RLS: users can only see/edit their own
alter table public.llm_configs enable row level security;

create policy "Users manage own llm config"
  on public.llm_configs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated_at trigger
create trigger llm_configs_updated_at
  before update on public.llm_configs
  for each row execute procedure public.handle_updated_at();
