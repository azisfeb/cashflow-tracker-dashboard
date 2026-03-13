-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Categories table
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#15594D',
  icon text,
  created_at timestamptz not null default now()
);

-- Transactions table
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  description text not null default '',
  date date not null,
  source text not null default 'manual' check (source in ('manual', 'import', 'telegram')),
  telegram_message_id text,
  created_at timestamptz not null default now()
);

-- Import logs table
create table public.import_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  row_count integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.import_logs enable row level security;

-- RLS policies: users can only see their own data
create policy "Users manage own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own import_logs"
  on public.import_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for common queries
create index transactions_user_id_date_idx on public.transactions (user_id, date desc);
create index transactions_category_id_idx on public.transactions (category_id);
create index categories_user_id_idx on public.categories (user_id);
