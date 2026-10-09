-- Migration 006: Audit trail untuk transaksi (siapa buat / edit / hapus)
--
-- Pakai soft delete agar jejak "siapa yang menghapus" tetap tersimpan.
-- Baris dengan deleted_at NOT NULL dianggap terhapus dan disembunyikan dari
-- query normal (backend selalu memfilter deleted_at is null).

alter table public.transactions
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_at timestamptz;

-- Backfill: anggap pembuat awal = pemilik baris.
update public.transactions
  set created_by = user_id
  where created_by is null;

-- Index untuk mempercepat query baris yang belum dihapus (soft delete).
create index if not exists transactions_not_deleted_idx
  on public.transactions (user_id, date desc)
  where deleted_at is null;

create index if not exists transactions_created_by_idx on public.transactions (created_by);
create index if not exists transactions_updated_by_idx on public.transactions (updated_by);
create index if not exists transactions_deleted_by_idx on public.transactions (deleted_by);

-- Catatan RLS: policy existing "Users manage own transactions" tetap berlaku
-- (auth.uid() = user_id). Kolom audit diisi oleh backend (service-role) sehingga
-- tidak memerlukan perubahan policy. Filter deleted_at dilakukan di query backend.
