import { createClient, getCachedUser } from '@/lib/supabase/server'
import { TransaksiClient } from '@/components/transaksi/transaksi-client'

export default async function TransaksiPage() {
  const user = await getCachedUser()
  const supabase = await createClient()

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(id, name, color, type)')
      .eq('user_id', user!.id)
      .order('date', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user!.id)
      .order('name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <p className="text-muted-foreground text-sm mt-1">Catat dan kelola transaksi keuangan kamu</p>
      </div>
      <TransaksiClient
        initialTransactions={transactions ?? []}
        categories={categories ?? []}
      />
    </div>
  )
}
