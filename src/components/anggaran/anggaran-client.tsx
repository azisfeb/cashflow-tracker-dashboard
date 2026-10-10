'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import type { BudgetCategory, Category, BudgetSummaryItem } from '@/lib/types'
import { budgetsApi } from '@/lib/api-client'
import { getBillingPeriod, getBillingPeriodForDate } from '@/lib/billing-period'
import { formatRupiah } from '@/lib/format'

const NONE_VALUE = '__none__'

/** Mundur/maju satu billing period dari period_start (tanggal 27). */
function shiftPeriod(periodStart: string, direction: -1 | 1): string {
  const [y, m] = periodStart.split('-').map((n) => parseInt(n, 10))
  const d = new Date(y, m - 1 + direction, 27)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yy}-${mm}-27`
}

function periodLabel(periodStart: string): string {
  return getBillingPeriodForDate(periodStart).label
}

interface Props {
  initialBudgetCategories: BudgetCategory[]
  initialCategories: Category[]
}

export function AnggaranClient({ initialBudgetCategories, initialCategories }: Props) {
  const [parents, setParents] = useState<BudgetCategory[]>(initialBudgetCategories)
  const [categories, setCategories] = useState<Category[]>(initialCategories)

  const [periodStart, setPeriodStart] = useState<string>(() => getBillingPeriod().from)
  const [summary, setSummary] = useState<BudgetSummaryItem[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Draft nominal budget per parent (string input), diisi dari summary.
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  // Dialog kelola parent
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingParent, setEditingParent] = useState<BudgetCategory | null>(null)
  const [parentName, setParentName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadSummary = useCallback(async (ps: string) => {
    setLoadingSummary(true)
    try {
      const data = await budgetsApi.summary(ps)
      setSummary(data)
      const draft: Record<string, string> = {}
      for (const item of data) {
        draft[item.budget_category_id] = item.budget_amount ? String(item.budget_amount) : ''
      }
      setBudgetDraft(draft)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat anggaran')
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  useEffect(() => {
    loadSummary(periodStart)
  }, [periodStart, loadSummary])

  async function reloadParents() {
    try {
      const data = await budgetsApi.listCategories()
      setParents(data)
    } catch {
      /* abaikan; summary tetap sumber utama tampilan */
    }
  }

  // ===== Kelola parent =====
  function openCreate() {
    setEditingParent(null)
    setParentName('')
    setDialogOpen(true)
  }

  function openEdit(p: BudgetCategory) {
    setEditingParent(p)
    setParentName(p.name)
    setDialogOpen(true)
  }

  async function handleSaveParent() {
    if (!parentName.trim()) {
      toast.error('Nama kategori induk tidak boleh kosong')
      return
    }
    setSubmitting(true)
    try {
      if (editingParent) {
        await budgetsApi.updateCategory(editingParent.id, { name: parentName.trim() })
        toast.success('Kategori induk diperbarui')
      } else {
        await budgetsApi.createCategory({ name: parentName.trim(), sort_order: parents.length + 1 })
        toast.success('Kategori induk dibuat')
      }
      setDialogOpen(false)
      await reloadParents()
      await loadSummary(periodStart)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteParent(id: string) {
    if (!confirm('Hapus kategori induk ini? Pemetaan & anggaran terkait akan ikut terhapus.')) return
    try {
      await budgetsApi.deleteCategory(id)
      toast.success('Kategori induk dihapus')
      await reloadParents()
      await loadSummary(periodStart)
      // Reset mapping lokal untuk child yang menunjuk parent ini
      setCategories((cs) =>
        cs.map((c) => (c.budget_category_id === id ? { ...c, budget_category_id: null } : c))
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
    }
  }

  // ===== Set anggaran per periode =====
  async function handleSaveBudget(parentId: string) {
    const raw = budgetDraft[parentId] ?? ''
    const amount = Number(raw.replace(/[^\d.-]/g, ''))
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Nominal tidak valid')
      return
    }
    setSavingId(parentId)
    try {
      await budgetsApi.upsertBudget({
        budget_category_id: parentId,
        period_start: periodStart,
        amount,
      })
      toast.success('Anggaran disimpan')
      setSummary((prev) =>
        prev.map((it) =>
          it.budget_category_id === parentId
            ? { ...it, budget_amount: amount, remaining: amount - it.used }
            : it
        )
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan anggaran')
    } finally {
      setSavingId(null)
    }
  }

  // ===== Mapping child -> parent =====
  async function handleMapping(categoryId: string, value: string) {
    const parentId = value === NONE_VALUE ? null : value
    try {
      await budgetsApi.setMapping(categoryId, parentId)
      setCategories((cs) =>
        cs.map((c) => (c.id === categoryId ? { ...c, budget_category_id: parentId } : c))
      )
      toast.success('Pemetaan diperbarui')
      await loadSummary(periodStart)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memperbarui pemetaan')
    }
  }

  const summaryByParent = new Map(summary.map((s) => [s.budget_category_id, s]))

  return (
    <div className="space-y-6">
      {/* Navigasi periode */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setPeriodStart(shiftPeriod(periodStart, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium min-w-[200px] text-center">
          Periode: {periodLabel(periodStart)}
        </div>
        <Button variant="outline" size="icon" onClick={() => setPeriodStart(shiftPeriod(periodStart, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Set anggaran per periode */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Anggaran per Kategori Induk</CardTitle>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Kategori Induk
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSummary ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memuat...
            </div>
          ) : parents.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Belum ada kategori induk. Tambahkan terlebih dahulu.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori Induk</TableHead>
                  <TableHead>Anggaran</TableHead>
                  <TableHead>Terpakai</TableHead>
                  <TableHead>Sisa</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map((p) => {
                  const s = summaryByParent.get(p.id)
                  const used = s?.used ?? 0
                  const remaining = (Number(budgetDraft[p.id]) || s?.budget_amount || 0) - used
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            inputMode="numeric"
                            className="w-36"
                            placeholder="0"
                            value={budgetDraft[p.id] ?? ''}
                            onChange={(e) =>
                              setBudgetDraft((d) => ({ ...d, [p.id]: e.target.value }))
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Simpan anggaran"
                            disabled={savingId === p.id}
                            onClick={() => handleSaveBudget(p.id)}
                          >
                            {savingId === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatRupiah(used)}</TableCell>
                      <TableCell className={remaining < 0 ? 'text-destructive font-medium' : ''}>
                        {formatRupiah(remaining)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Ubah nama" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus"
                            onClick={() => handleDeleteParent(p.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pemetaan kategori child -> parent */}
      <Card>
        <CardHeader>
          <CardTitle>Pemetaan Kategori</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Belum ada kategori.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kategori Induk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={c.budget_category_id ?? NONE_VALUE}
                        onValueChange={(v) => v && handleMapping(c.id, v)}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="Tidak ada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Tidak ada</SelectItem>
                          {parents.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog kelola parent */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingParent ? 'Ubah Kategori Induk' : 'Tambah Kategori Induk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="parent-name">Nama</Label>
              <Input
                id="parent-name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="mis. Makan dan Minum"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSaveParent} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
