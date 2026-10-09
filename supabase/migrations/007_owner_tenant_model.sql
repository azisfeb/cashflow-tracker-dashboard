-- Migration 007: Owner / Tenant model
--
-- Konsep: setiap superadmin memiliki satu "workspace" data. Admin yang dibuat
-- oleh superadmin ikut mengelola (full CRUD) seluruh data workspace tersebut.
-- Semua data (transactions, categories, import_logs, special_events,
-- special_event_expenses) di-scope berdasarkan owner_id, bukan user_id pembuat.
--
--  - owner_id superadmin   = id dirinya sendiri
--  - owner_id admin        = id superadmin yang membuatnya
--
-- user_id tetap dipertahankan (menandai siapa yang membuat baris / untuk audit),
-- namun otorisasi akses kini berbasis owner_id.

-- 1. owner_id pada profiles (menandai workspace mana yang dimiliki user).
alter table public.profiles
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Backfill: user existing (semua superadmin) menjadi owner atas dirinya sendiri.
update public.profiles set owner_id = id where owner_id is null;

alter table public.profiles alter column owner_id set not null;

create index if not exists profiles_owner_id_idx on public.profiles (owner_id);

-- 2. Fungsi: owner_id dari user yang sedang login.
--    SECURITY DEFINER agar tidak memicu rekursi RLS saat dipakai di policy.
create or replace function public.current_owner_id()
  returns uuid
  language sql
  security definer
  stable
  set search_path = public
as $$
  select coalesce(
    (select owner_id from public.profiles where id = auth.uid()),
    auth.uid()
  );
$$;

-- 3. Tambah owner_id ke semua tabel data + backfill dari user_id.
alter table public.transactions
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
update public.transactions set owner_id = user_id where owner_id is null;
alter table public.transactions alter column owner_id set not null;
create index if not exists transactions_owner_id_date_idx on public.transactions (owner_id, date desc);

alter table public.categories
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
update public.categories set owner_id = user_id where owner_id is null;
alter table public.categories alter column owner_id set not null;
create index if not exists categories_owner_id_idx on public.categories (owner_id);

alter table public.import_logs
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
update public.import_logs set owner_id = user_id where owner_id is null;
alter table public.import_logs alter column owner_id set not null;
create index if not exists import_logs_owner_id_idx on public.import_logs (owner_id);

alter table public.special_events
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
update public.special_events set owner_id = user_id where owner_id is null;
alter table public.special_events alter column owner_id set not null;
create index if not exists special_events_owner_id_idx on public.special_events (owner_id);

alter table public.special_event_expenses
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
update public.special_event_expenses set owner_id = user_id where owner_id is null;
alter table public.special_event_expenses alter column owner_id set not null;
create index if not exists special_event_expenses_owner_id_idx on public.special_event_expenses (owner_id);

-- 4. Ganti RLS: dari (auth.uid() = user_id) menjadi (owner_id = current_owner_id()).
--    Semua anggota workspace (superadmin + admin-nya) berbagi akses full-CRUD.

-- transactions
drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Workspace members manage transactions"
  on public.transactions for all
  using (owner_id = public.current_owner_id())
  with check (owner_id = public.current_owner_id());

-- categories
drop policy if exists "Users manage own categories" on public.categories;
create policy "Workspace members manage categories"
  on public.categories for all
  using (owner_id = public.current_owner_id())
  with check (owner_id = public.current_owner_id());

-- import_logs
drop policy if exists "Users manage own import_logs" on public.import_logs;
create policy "Workspace members manage import_logs"
  on public.import_logs for all
  using (owner_id = public.current_owner_id())
  with check (owner_id = public.current_owner_id());

-- special_events
drop policy if exists "Users manage own special events" on public.special_events;
create policy "Workspace members manage special_events"
  on public.special_events for all
  using (owner_id = public.current_owner_id())
  with check (owner_id = public.current_owner_id());

-- special_event_expenses
drop policy if exists "Users manage own special event expenses" on public.special_event_expenses;
create policy "Workspace members manage special_event_expenses"
  on public.special_event_expenses for all
  using (owner_id = public.current_owner_id())
  with check (owner_id = public.current_owner_id());

-- 5. Perbarui handle_new_user: pendaftar baru lewat form register adalah
--    superadmin DAN owner atas dirinya sendiri. Seed kategori memakai owner_id.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, owner_id)
    values (new.id, new.email, 'superadmin', new.id)
    on conflict (id) do nothing;

  insert into public.categories (user_id, owner_id, name, type, color) values
    (new.id, new.id, 'Salary',              'income',  '#1d6b57'),
    (new.id, new.id, 'Freelance',           'income',  '#2f8f78'),
    (new.id, new.id, 'Tagihan',             'expense', '#b78b2e'),
    (new.id, new.id, 'Kebutuhan Rumah',     'expense', '#c65a3a'),
    (new.id, new.id, 'Transportasi',        'expense', '#7f6cf2'),
    (new.id, new.id, 'Hiburan',             'expense', '#4569b2'),
    (new.id, new.id, 'Top Up',              'expense', '#1d6b57'),
    (new.id, new.id, 'Makanan & Minuman',   'expense', '#2f8f78'),
    (new.id, new.id, 'Kesehatan',           'expense', '#b78b2e'),
    (new.id, new.id, 'Sedekah',             'expense', '#c65a3a'),
    (new.id, new.id, 'Gift',                'expense', '#7f6cf2'),
    (new.id, new.id, 'Tabungan',            'expense', '#4569b2'),
    (new.id, new.id, 'Buah',                'expense', '#1d6b57'),
    (new.id, new.id, 'Bahan Masakan',       'expense', '#2f8f78'),
    (new.id, new.id, 'Jasa',                'expense', '#b78b2e'),
    (new.id, new.id, 'Kebutuhan Ortu',      'expense', '#c65a3a'),
    (new.id, new.id, 'Kebutuhan Mamah',     'expense', '#7f6cf2'),
    (new.id, new.id, 'Kebutuhan Bapak',     'expense', '#4569b2'),
    (new.id, new.id, 'Kebutuhan Anak',      'expense', '#1d6b57'),
    (new.id, new.id, 'Pajak',               'expense', '#2f8f78'),
    (new.id, new.id, 'Pinjaman',            'expense', '#b78b2e');
  return new;
exception when others then
  raise warning 'handle_new_user: failed for user %: %', new.id, sqlerrm;
  return new;
end;
$$;
