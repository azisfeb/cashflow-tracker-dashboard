'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { Transaction, Category } from '@/lib/types'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  import: 'Impor',
  telegram: 'Telegram',
}

const emptyForm = {
  type: 'expense' as 'income' | 'expense',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  category_id: '',
}

interface Props {
  initialTransactions: (Transaction & { categories?: { id: string; name: string; color: string; type: string } | null })[]
  categories: Category[]
}

export function TransaksiClient({ initialTransactions, categories }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const supabase = createClient()

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterCategory !== 'all' && t.category_id !== filterCategory) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [transactions, filterType, filterCategory, search])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditingId(t.id)
    setForm({
      type: t.type,
      amount: String(t.amount),
      description: t.description,
      date: t.date,
      category_id: t.category_id ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      toast.error('Jumlah tidak valid')
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesi tidak valid, silakan login ulang'); setLoading(false); return }

    const basePayload = {
      type: form.type,
      amount,
      description: form.description,
      date: form.date,
      category_id: form.category_id || null,
      source: 'manual' as const,
    }

    const categoryObj = categories.find(c => c.id === form.category_id) ?? null

    if (editingId) {
      const { error } = await supabase
        .from('transactions')
        .update(basePayload)
        .eq('id', editingId)

      if (error) { toast.error('Gagal mengubah transaksi'); setLoading(false); return }
      setTransactions(ts => ts.map(t => t.id === editingId
        ? { ...t, ...basePayload, categories: categoryObj ? { id: categoryObj.id, name: categoryObj.name, color: categoryObj.color, type: categoryObj.type } : null } as typeof t
        : t
      ))
      toast.success('Transaksi diperbarui')
    } else {
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...basePayload, user_id: user.id })
        .select()
        .single()

      if (error) { toast.error('Gagal membuat transaksi'); setLoading(false); return }
      setTransactions(ts => [{ ...data, categories: categoryObj ? { id: categoryObj.id, name: categoryObj.name, color: categoryObj.color, type: categoryObj.type } : null }, ...ts])
      toast.success('Transaksi ditambahkan')
    }

    setLoading(false)
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error('Gagal menghapus transaksi'); return }
    setTransactions(ts => ts.filter(t => t.id !== id))
    setDeleteId(null)
    toast.success('Transaksi dihapus')
  }

  const filteredCategories = categories.filter(c => filterType === 'all' || c.type === filterType)
  const formCategories = categories.filter(c => c.type === form.type)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari transaksi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v as typeof filterType); setFilterCategory('all') }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="income">Pemasukan</SelectItem>
            <SelectItem value="expense">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {filteredCategories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Sumber</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      Tidak ada transaksi
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(t.date)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{t.description || '—'}</TableCell>
                    <TableCell>
                      {t.categories ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: t.categories.color + '22', color: t.categories.color }}
                        >
                          {t.categories.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1 text-xs font-medium ${t.type === 'income' ? 'text-green-500' : 'text-red-400'}`}>
                        {t.type === 'income'
                          ? <ArrowUpRight className="h-3.5 w-3.5" />
                          : <ArrowDownRight className="h-3.5 w-3.5" />
                        }
                        {t.type === 'income' ? 'Masuk' : 'Keluar'}
                      </div>
                    </TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-400'}`}>
                      {t.type === 'expense' ? '-' : '+'}{formatRupiah(t.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-xs">{SOURCE_LABELS[t.source] ?? t.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as 'income' | 'expense', category_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input
                type="number"
                placeholder="50000"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input
                placeholder="Makan siang, Gaji, dll"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.category_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, category_id: (!v || v === 'none') ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori (opsional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Kategori</SelectItem>
                  {formCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Transaksi?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
