'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Pencil, Trash2, Loader2, DollarSign, ListOrdered, Wallet } from 'lucide-react'
import type { SpecialEvent, SpecialEventExpense } from '@/lib/types'

interface Props {
  event: SpecialEvent
  initialExpenses: SpecialEventExpense[]
}

const COMMON_CATEGORIES = [
  'Tiket Pesawat/Kereta',
  'Penginapan',
  'Makanan & Minuman',
  'Transportasi Lokal',
  'Oleh-oleh',
  'Hiburan / Atraksi',
  'Lainnya'
]

const emptyForm = { name: '', category: '', amount: '', date: '' }

export function EventDetailClient({ event, initialExpenses }: Props) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const supabase = createClient()

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const remainingBudget = event.budget - totalSpent
  const spentPercentage = event.budget > 0 ? (totalSpent / event.budget) * 100 : 0

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] })
    setDialogOpen(true)
  }

  function openEdit(exp: SpecialEventExpense) {
    setEditingId(exp.id)
    setForm({ 
      name: exp.name, 
      category: exp.category || '',
      amount: exp.amount.toString(),
      date: exp.date || '' 
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.amount) {
      toast.error('Nama pengeluaran dan jumlah tidak boleh kosong')
      return
    }

    setLoading(true)

    const payload = {
      special_event_id: event.id,
      name: form.name,
      category: form.category || null,
      amount: parseFloat(form.amount.replace(/,/g, '')),
      date: form.date ? form.date : null,
    }

    if (editingId) {
      const { error } = await supabase
        .from('special_event_expenses')
        .update(payload)
        .eq('id', editingId)

      if (error) { toast.error('Gagal mengubah pengeluaran'); setLoading(false); return }
      setExpenses(exps => exps.map(e => e.id === editingId ? { ...e, ...payload } : e))
      toast.success('Pengeluaran diperbarui')
    } else {
      const { data, error } = await supabase
        .from('special_event_expenses')
        .insert(payload)
        .select()
        .single()

      if (error) { toast.error('Gagal menambah pengeluaran'); setLoading(false); return }
      setExpenses(exps => [data, ...exps])
      toast.success('Pengeluaran ditambah')
    }

    setLoading(false)
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('special_event_expenses').delete().eq('id', id)
    if (error) { toast.error('Gagal menghapus pengeluaran'); return }
    setExpenses(exps => exps.filter(e => e.id !== id))
    setDeleteId(null)
    toast.success('Pengeluaran dihapus')
  }

  return (
    <div className="space-y-6">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anggaran</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {event.budget.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">Rp {totalSpent.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sisa Anggaran</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-destructive' : 'text-primary'}`}>
              Rp {remainingBudget.toLocaleString('id-ID')}
            </div>
            {event.budget > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {spentPercentage.toFixed(1)}% terpakai
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <h2 className="text-lg font-semibold">Daftar Pengeluaran</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pengeluaran
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {expenses.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Belum ada pengeluaran di acara ini
              </div>
            )}
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 flex items-center justify-between group hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">{exp.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {exp.category && (
                      <span className="bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">
                        {exp.category}
                      </span>
                    )}
                    {exp.date && (
                      <span>{new Date(exp.date).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-destructive">Rp {exp.amount.toLocaleString('id-ID')}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(exp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(exp.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Pengeluaran <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Contoh: Tiket Masuk Jatim Park"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v || '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jumlah (Rp) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
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
            <DialogTitle>Hapus Pengeluaran!</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Apakah Anda yakin ingin menghapus catatan pengeluaran ini?
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
