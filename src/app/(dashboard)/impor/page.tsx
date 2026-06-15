import { createClient, getCachedUser } from '@/lib/supabase/server'
import { ImporClient } from '@/components/impor/impor-client'

export default async function ImporPage() {
  const user = await getCachedUser()
  const supabase = await createClient()

  const [{ data: categories }, { data: importLogs }] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', user!.id).order('name'),
    supabase.from('import_logs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impor Data</h1>
        <p className="text-muted-foreground text-sm mt-1">Import transaksi dari file CSV atau Excel (Google Sheets)</p>
      </div>
      <ImporClient categories={categories ?? []} importLogs={importLogs ?? []} />
    </div>
  )
}
