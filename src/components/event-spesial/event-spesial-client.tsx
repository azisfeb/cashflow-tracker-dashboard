'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react'
import type { SpecialEvent } from '@/lib/types'
import { useNominalVisibility } from '@/components/layout/nominal-visibility-provider'
import { formatRupiah } from '@/lib/format'

interface Props {
  initialEvents: SpecialEvent[]
}

const emptyForm = { name: '', date: '', budget: '' }

export function EventSpesialClient({ initialEvents }: Props) {
  const { isHidden } = useNominalVisibility()
  const [events, setEvents] = useState(initialEvents)
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

  function openEdit(evt: SpecialEvent) {
    setEditingId(evt.id)
    setForm({ 
      name: evt.name, 
      date: evt.date || '', 
      budget: evt.budget ? evt.budget.toString() : '' 
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Nama acara tidak boleh kosong')
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session tidak ditemukan')
      setLoading(false)
      return
    }

    const payload = {
      user_id: user.id,
      name: form.name,
      date: form.date ? form.date : null,
      budget: form.budget ? parseFloat(form.budget) : 0
    }

    if (editingId) {
      const { error } = await supabase
        .from('special_events')
        .update(payload)
        .eq('id', editingId)

      if (error) { toast.error('Gagal mengubah acara'); setLoading(false); return }
      setEvents(evts => evts.map(e => e.id === editingId ? { ...e, ...payload } : e))
      toast.success('Acara diperbarui')
    } else {
      const { data, error } = await supabase
        .from('special_events')
        .insert(payload)
        .select()
        .single()

      if (error) { toast.error('Gagal membuat acara'); setLoading(false); return }
      setEvents(evts => [data, ...evts])
      toast.success('Acara dibuat')
    }

    setLoading(false)
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('special_events').delete().eq('id', id)
    if (error) { toast.error('Gagal menghapus acara'); return }
    setEvents(evts => evts.filter(e => e.id !== id))
    setDeleteId(null)
    toast.success('Acara dihapus')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Acara
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            Belum ada event spesial. Klik &quot;Tambah Acara&quot; untuk mulai.
          </div>
        )}
        {events.map((evt) => (
          <Card key={evt.id} className="group relative overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1">{evt.name}</h3>
                  {evt.date && (
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {new Date(evt.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); openEdit(evt); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.preventDefault(); setDeleteId(evt.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Anggaran:</span>
                  <span className="font-medium">{formatRupiah(evt.budget, isHidden)}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <Link href={`/event-spesial/${evt.id}`}>
                  <Button variant="outline" className="w-full">Lihat Detail</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Acara' : 'Tambah Acara Spesial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Acara <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Contoh: Liburan Bali, Lebaran 2024"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal (Opsional)</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Anggaran / Budget (Opsional)</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
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
            <DialogTitle>Hapus Acara!</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Apakah Anda yakin? Menghapus acara juga akan menghapus semua catatan pengeluaran di dalamnya. Tindakan ini tidak dapat dibatalkan.
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
