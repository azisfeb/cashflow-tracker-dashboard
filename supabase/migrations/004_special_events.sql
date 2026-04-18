-- Special Events table
create table public.special_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date date,
  budget numeric(12, 2) default 0,
  created_at timestamptz not null default now()
);

-- Special Event Expenses table
create table public.special_event_expenses (
  id uuid primary key default uuid_generate_v4(),
  special_event_id uuid not null references public.special_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  amount numeric(12, 2) not null check (amount > 0),
  date date,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.special_events enable row level security;
alter table public.special_event_expenses enable row level security;

-- RLS policies: users can only see their own data
create policy "Users manage own special events"
  on public.special_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own special event expenses"
  on public.special_event_expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for common queries
create index special_events_user_id_idx on public.special_events (user_id);
create index special_event_expenses_event_id_idx on public.special_event_expenses (special_event_id);
