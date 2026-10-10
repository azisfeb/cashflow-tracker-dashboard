import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/roles'
import { AnggaranClient } from '@/components/anggaran/anggaran-client'

export default async function AnggaranPage() {
  const ownerId = await getOwnerId()
  const supabase = await createClient()

  const [{ data: budgetCategories }, { data: categories }] = await Promise.all([
    supabase
      .from('budget_categories')
      .select('*')
      .eq('owner_id', ownerId!)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('categories')
      .select('*')
      .eq('owner_id', ownerId!)
      .order('name', { ascending: true }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Anggaran</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kelola kategori induk, tetapkan anggaran per periode, dan petakan kategori
        </p>
      </div>
      <AnggaranClient
        initialBudgetCategories={budgetCategories ?? []}
        initialCategories={categories ?? []}
      />
    </div>
  )
}
