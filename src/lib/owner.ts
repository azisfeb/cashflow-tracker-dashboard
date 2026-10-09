import { createClient } from '@/lib/supabase/client'

/**
 * Ambil owner_id (id workspace) user yang sedang login dari sisi browser.
 * Superadmin: owner_id = dirinya; admin: owner_id = superadmin pembuat.
 * Dipakai komponen client untuk mengisi owner_id saat insert data.
 * Mengembalikan null bila sesi tidak valid.
 */
export async function getClientOwnerId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('owner_id')
    .eq('id', user.id)
    .maybeSingle()

  return (data?.owner_id as string | undefined) ?? user.id
}
