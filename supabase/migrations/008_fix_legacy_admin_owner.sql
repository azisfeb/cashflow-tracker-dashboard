-- Migration 008 (opsional/manual): Perbaiki owner_id admin yang dibuat
-- SEBELUM migration 007 diterapkan.
--
-- Konteks: admin yang dibuat sebelum model owner/tenant akan ter-backfill
-- dengan owner_id = dirinya sendiri (karena saat itu belum ada konsep owner).
-- Agar admin tersebut ikut workspace superadmin pembuatnya, set owner_id-nya
-- ke id superadmin yang dituju.
--
-- CARA PAKAI:
--   Ganti nilai pada bagian "parameter" di bawah dengan email yang sesuai,
--   lalu jalankan di SQL editor Supabase.
--
-- CATATAN PENTING:
--   Setelah owner_id admin diubah, data (transaksi/kategori/dll) yang TERLANJUR
--   dibuat admin tersebut dengan owner_id lama (= dirinya) TIDAK otomatis pindah.
--   Bagian 2 (opsional) di bawah memindahkan data lama admin ke workspace baru.
--   Jalankan bagian 2 HANYA bila kamu memang ingin data lama admin tersebut
--   ikut tergabung ke workspace superadmin.

do $$
declare
  -- ===== PARAMETER: ganti dua email berikut =====
  v_admin_email      text := 'admin-lama@contoh.com';       -- email admin yang diperbaiki
  v_superadmin_email text := 'superadmin@contoh.com';       -- email superadmin pemilik workspace
  -- ==============================================

  v_admin_id      uuid;
  v_superadmin_id uuid;
begin
  select id into v_admin_id      from auth.users where email = v_admin_email;
  select id into v_superadmin_id from auth.users where email = v_superadmin_email;

  if v_admin_id is null then
    raise exception 'Admin dengan email % tidak ditemukan', v_admin_email;
  end if;
  if v_superadmin_id is null then
    raise exception 'Superadmin dengan email % tidak ditemukan', v_superadmin_email;
  end if;

  -- Pastikan target adalah superadmin dan owner atas dirinya sendiri.
  update public.profiles
    set role = 'superadmin', owner_id = v_superadmin_id
    where id = v_superadmin_id;

  -- 1) Pindahkan admin ke workspace superadmin + pastikan role 'admin'.
  update public.profiles
    set owner_id = v_superadmin_id, role = 'admin'
    where id = v_admin_id;

  -- 2) (OPSIONAL) Pindahkan data lama milik admin ke workspace superadmin.
  --    Hapus komentar blok di bawah bila ingin menggabungkan data lama admin.
  --
  -- update public.transactions           set owner_id = v_superadmin_id where owner_id = v_admin_id;
  -- update public.categories             set owner_id = v_superadmin_id where owner_id = v_admin_id;
  -- update public.import_logs            set owner_id = v_superadmin_id where owner_id = v_admin_id;
  -- update public.special_events         set owner_id = v_superadmin_id where owner_id = v_admin_id;
  -- update public.special_event_expenses set owner_id = v_superadmin_id where owner_id = v_admin_id;

  raise notice 'Admin % kini ikut workspace superadmin %', v_admin_email, v_superadmin_email;
end$$;
