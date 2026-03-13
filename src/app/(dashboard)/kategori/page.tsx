import { createClient } from '@/lib/supabase/server'
import { KategoriClient } from '@/components/kategori/kategori-client'

export default async function KategoriPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user!.id)
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kategori</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola kategori pemasukan dan pengeluaran</p>
      </div>
      <KategoriClient initialCategories={categories ?? []} />
    </div>
  )
}
