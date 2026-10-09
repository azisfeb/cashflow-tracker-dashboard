import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

/**
 * Ambil role user yang sedang login dari tabel profiles.
 * Default ke 'superadmin' bila baris profile belum ada (konsisten dengan
 * model registrasi: setiap pendaftar baru adalah superadmin atas datanya).
 * Dicache per-request untuk menghindari roundtrip berulang.
 */
export const getCurrentUserRole = cache(async (): Promise<UserRole> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return 'admin'

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return (data?.role as UserRole) ?? 'superadmin'
})
