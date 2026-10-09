import { redirect } from 'next/navigation'
import { getCurrentUserRole } from '@/lib/roles'
import { getCachedUser } from '@/lib/supabase/server'
import { ManajemenAkunClient } from '@/components/manajemen-akun/manajemen-akun-client'

export default async function ManajemenAkunPage() {
  // Guard: hanya superadmin yang boleh mengakses halaman ini.
  // Backend tetap menegakkan otorisasi; guard ini untuk UX.
  const role = await getCurrentUserRole()
  if (role !== 'superadmin') redirect('/dashboard')

  const user = await getCachedUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Akun</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kelola akun dan role pengguna
        </p>
      </div>
      <ManajemenAkunClient currentUserId={user!.id} />
    </div>
  )
}
