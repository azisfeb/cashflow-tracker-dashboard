-- Migration 009: Budgeting
--
-- - budget_categories : parent/grup budget (mis. "Makan dan Minum"), per workspace.
-- - categories.budget_category_id : mapping 1 child -> 1 parent (nullable).
-- - budgets : nominal budget per parent PER billing period (period_start = tgl 27).
--
-- Semua di-scope per workspace via owner_id + RLS (owner_id = current_owner_id()).

-- 1. Parent budget categories
create table if not exists public.budget_categories (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists budget_categories_owner_id_idx on public.budget_categories (owner_id);

alter table public.budget_categories enable row level security;

drop policy if exists "Workspace members manage budget_categories" on public.budget_categories;
create policy "Workspace members manage budget_categories"
  on public.budget_categories for all
  using (owner_id = public.current_owner_id())
  with check (owner_id = public.current_owner_id());

-- 2. Mapping child category -> parent budget category (1:1, nullable).
alter table public.categories
  add column if not exists budget_category_id uuid
    references public.budget_categories(id) on delete set null;

create index if not exists categories_budget_category_id_idx
  on public.categories (budget_category_id);

-- 3. Budget nominal per parent per periode (billing period, period_start = tgl 27).
create table if not exists public.budgets (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  budget_category_id uuid not null references public.budget_categories(id) on delete cascade,
  period_start date not null,                 -- tanggal 27 awal periode
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_category_id, period_start)
);

create index if not exists budgets_owner_period_idx on public.budgets (owner_id, period_start);

alter table public.budgets enable row level security;

drop policy if exists "Workspace members manage budgets" on public.budgets;
create policy "Workspace members manage budgets"
  on public.budgets for all
  using (owner_id = public.current_owner_id())
  with check (owner_id = public.current_owner_id());

-- Trigger updated_at pada budgets
create or replace function public.touch_budgets_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.touch_budgets_updated_at();

-- 4. Seed 10 parent budget categories untuk SETIAP workspace yang ada.
--    Idempotent: hanya menambah bila nama belum ada untuk owner tersebut.
do $$
declare
  r record;
  names text[] := array[
    'Makan dan Minum',
    'Kebutuhan Rumah Tangga',
    'Fix Cost',
    'Kebutuhan Anak',
    'Kebutuhan Bapak',
    'Kebutuhan Mamah',
    'Hiburan',
    'Investasi',
    'Dana Darurat',
    'Dana Tak Terduga'
  ];
  nm text;
  idx int;
begin
  for r in (select distinct owner_id from public.profiles) loop
    idx := 0;
    foreach nm in array names loop
      idx := idx + 1;
      if not exists (
        select 1 from public.budget_categories
        where owner_id = r.owner_id and name = nm
      ) then
        insert into public.budget_categories (owner_id, name, sort_order)
          values (r.owner_id, nm, idx);
      end if;
    end loop;
  end loop;
end$$;
