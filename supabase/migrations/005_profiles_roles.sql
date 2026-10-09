-- Migration 005: Profiles & Roles (superadmin / admin)
--
-- Model:
--  - Setiap user baru yang register otomatis mendapat role 'superadmin'
--    (superadmin atas datanya sendiri). Role 'admin' hanya diberikan oleh
--    superadmin lewat menu Manajemen Akun.
--  - Isolasi data per-user tetap berlaku (RLS auth.uid() = user_id pada
--    tabel transaksi/kategori/dll tidak diubah). Role TIDAK memberi akses
--    ke data finansial user lain.

-- 1. Enum role
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('superadmin', 'admin');
  end if;
end$$;

-- 2. Tabel profiles (1:1 dengan auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.user_role not null default 'superadmin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- 3. Helper: cek apakah user tertentu adalah superadmin.
--    SECURITY DEFINER agar tidak memicu rekursi RLS saat dipakai di policy.
create or replace function public.is_superadmin(uid uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'superadmin'
  );
$$;

-- 4. Row Level Security pada profiles
alter table public.profiles enable row level security;

-- User boleh melihat profilnya sendiri; superadmin boleh melihat semua.
drop policy if exists "Profiles readable by owner or superadmin" on public.profiles;
create policy "Profiles readable by owner or superadmin"
  on public.profiles for select
  using (auth.uid() = id or public.is_superadmin(auth.uid()));

-- User boleh meng-update profilnya sendiri TAPI tidak boleh mengubah role.
-- (Perubahan role dilakukan oleh backend service-role yang bypass RLS.)
drop policy if exists "Users update own profile except role" on public.profiles;
create policy "Users update own profile except role"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- INSERT/DELETE pada profiles ditangani oleh trigger / service-role saja.
-- Tidak ada policy insert/delete untuk anon/authenticated → ditolak default.

-- 5. Perluas handle_new_user: selain seed kategori, buat baris profile
--    dengan role default 'superadmin'.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Buat baris profile (role default superadmin untuk setiap pendaftar baru).
  insert into public.profiles (id, email, role)
    values (new.id, new.email, 'superadmin')
    on conflict (id) do nothing;

  -- Seed kategori default (perilaku lama tetap dipertahankan).
  insert into public.categories (user_id, name, type, color) values
    (new.id, 'Salary',              'income',  '#1d6b57'),
    (new.id, 'Freelance',           'income',  '#2f8f78'),
    (new.id, 'Tagihan',             'expense', '#b78b2e'),
    (new.id, 'Kebutuhan Rumah',     'expense', '#c65a3a'),
    (new.id, 'Transportasi',        'expense', '#7f6cf2'),
    (new.id, 'Hiburan',             'expense', '#4569b2'),
    (new.id, 'Top Up',              'expense', '#1d6b57'),
    (new.id, 'Makanan & Minuman',   'expense', '#2f8f78'),
    (new.id, 'Kesehatan',           'expense', '#b78b2e'),
    (new.id, 'Sedekah',             'expense', '#c65a3a'),
    (new.id, 'Gift',                'expense', '#7f6cf2'),
    (new.id, 'Tabungan',            'expense', '#4569b2'),
    (new.id, 'Buah',                'expense', '#1d6b57'),
    (new.id, 'Bahan Masakan',       'expense', '#2f8f78'),
    (new.id, 'Jasa',                'expense', '#b78b2e'),
    (new.id, 'Kebutuhan Ortu',      'expense', '#c65a3a'),
    (new.id, 'Kebutuhan Mamah',     'expense', '#7f6cf2'),
    (new.id, 'Kebutuhan Bapak',     'expense', '#4569b2'),
    (new.id, 'Kebutuhan Anak',      'expense', '#1d6b57'),
    (new.id, 'Pajak',               'expense', '#2f8f78'),
    (new.id, 'Pinjaman',            'expense', '#b78b2e');
  return new;
exception when others then
  raise warning 'handle_new_user: failed for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- 6. Seed: backfill profile untuk SEMUA user existing (jadikan superadmin).
--    Semua akun yang sudah ada saat ini di-set sebagai superadmin.
insert into public.profiles (id, email, role)
  select u.id, u.email, 'superadmin'
  from auth.users u
  on conflict (id) do update set role = 'superadmin';

-- 7. Trigger untuk menjaga updated_at tetap mutakhir.
create or replace function public.touch_profiles_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.touch_profiles_updated_at();
