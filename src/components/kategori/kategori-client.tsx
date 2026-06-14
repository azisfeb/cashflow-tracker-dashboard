'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import type { Category } from '@/lib/types'

const PRESET_COLORS = [
  '#15594D', '#10B981', '#3B82F6', '#8B5CF6',
  '#F59E0B', '#EF4444', '#EC4899', '#06B6D4',
  '#84CC16', '#F97316', '#6366F1', '#14B8A6',
]

interface Props {
  initialCategories: Category[]
}

const emptyForm = { name: '', type: 'expense' as 'income' | 'expense', color: '#15594D' }

export function KategoriClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const supabase = createClient()

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id)
    setForm({ name: cat.name, type: cat.type, color: cat.color })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Nama kategori tidak boleh kosong')
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Sesi tidak valid, silakan login ulang')
      setLoading(false)
      return
    }

    if (editingId) {
      const { error } = await supabase
        .from('categories')
        .update({ name: form.name, type: form.type, color: form.color })
        .eq('id', editingId)
        .eq('user_id', user.id)

      if (error) { toast.error('Gagal mengubah kategori'); setLoading(false); return }
      setCategories(cats => cats.map(c => c.id === editingId ? { ...c, ...form } : c))
      toast.success('Kategori diperbarui')
    } else {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: form.name, type: form.type, color: form.color, user_id: user.id })
        .select()
        .single()

      if (error) { toast.error('Gagal membuat kategori'); setLoading(false); return }
      setCategories(cats => [...cats, data])
      toast.success('Kategori dibuat')
    }

    setLoading(false)
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesi tidak valid'); return }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) { toast.error('Gagal menghapus kategori'); return }
    setCategories(cats => cats.filter(c => c.id !== id))
    setDeleteId(null)
    toast.success('Kategori dihapus')
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Kategori
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategorySection title="Pemasukan" categories={incomeCategories} onEdit={openEdit} onDelete={setDeleteId} />
        <CategorySection title="Pengeluaran" categories={expenseCategories} onEdit={openEdit} onDelete={setDeleteId} />
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                placeholder="Contoh: Gaji, Makan, Transport"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as 'income' | 'expense' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: form.color === color ? 'white' : 'transparent',
                    }}
                  />
                ))}
              </div>
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

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Kategori?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Transaksi yang menggunakan kategori ini tidak akan terhapus, tapi kategorinya akan jadi kosong.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategorySection({
  title,
  categories,
  onEdit,
  onDelete,
}: {
  title: string
  categories: Category[]
  onEdit: (cat: Category) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card className="glass-panel border border-border/40 overflow-hidden">
      <CardContent className="pt-5">
        <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wider">{title}</h3>
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Belum ada kategori</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 hover:border-border/80 transition-all hover:shadow-sm group relative overflow-hidden"
            >
              <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-card via-card pl-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/80 rounded-lg" onClick={() => onEdit(cat)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => onDelete(cat.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
