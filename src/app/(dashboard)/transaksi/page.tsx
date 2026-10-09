import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/roles'
import { TransaksiClient } from '@/components/transaksi/transaksi-client'

export default async function TransaksiPage() {
  const ownerId = await getOwnerId()
  const supabase = await createClient()

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(id, name, color, type)')
      .eq('owner_id', ownerId!)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .eq('owner_id', ownerId!)
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
