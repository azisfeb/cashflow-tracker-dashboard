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
import { Plus, Pencil, Trash2, Loader2, Search, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Transaction, Category } from '@/lib/types'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'

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

/** Format a local Date as YYYY-MM-DD without UTC conversion */
function toLocalDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Returns the default billing/gajian period: 27th → 26th.
 * - If today is the 27th or later, the current cycle is: 27th this month → 26th next month.
 * - Otherwise: 27th last month → 26th this month.
 */
function getDefaultDateRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  let from: Date, to: Date
  if (now.getDate() >= 27) {
    // current cycle has started: 27th this month → 26th next month
    from = new Date(year, month, 27)
    to = new Date(year, month + 1, 26)
  } else {
    // still in previous cycle: 27th last month → 26th this month
    from = new Date(year, month - 1, 27)
    to = new Date(year, month, 26)
  }
  return { from: toLocalDateStr(from), to: toLocalDateStr(to) }
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  import: 'Impor',
  telegram: 'Telegram',
}

const defaultRange = getDefaultDateRange()

const emptyForm = {
  type: 'expense' as 'income' | 'expense',
  quantity: '1',
  price: '',
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
  const [dateFrom, setDateFrom] = useState(defaultRange.from)
  const [dateTo, setDateTo] = useState(defaultRange.to)
  const supabase = createClient()

  function handlePriceChange(price: string) {
    const qty = parseInt(form.quantity, 10) || 1
    const p = parseFloat(price)
    const computed = !isNaN(p) && p > 0 ? (Math.round(qty * p * 100) / 100).toFixed(2) : ''
    setForm(f => ({ ...f, price, amount: computed }))
  }

  function handleQuantityChange(quantity: string) {
    const qty = parseInt(quantity, 10) || 1
    const p = parseFloat(form.price)
    const computed = !isNaN(p) && p > 0 ? (Math.round(qty * p * 100) / 100).toFixed(2) : form.amount
    setForm(f => ({ ...f, quantity, amount: computed }))
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterCategory !== 'all' && t.category_id !== filterCategory) return false
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      return true
    })
  }, [transactions, filterType, filterCategory, search, dateFrom, dateTo])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditingId(t.id)
    setForm({
      type: t.type,
      quantity: String(t.quantity ?? 1),
      price: t.price != null ? String(t.price) : '',
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
    const quantity = parseInt(form.quantity, 10) || 1
    const price = form.price ? parseFloat(form.price) : null

    if (quantity < 1) {
      toast.error('Qty harus minimal 1')
      return
    }
    if (price !== null && price <= 0) {
      toast.error('Harga satuan tidak valid')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesi tidak valid, silakan login ulang'); setLoading(false); return }

    const basePayload = {
      type: form.type,
      amount,
      quantity,
      price: price ?? null,
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
  const priceIsSet = parseFloat(form.price) > 0

  const summary = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [filtered])

  const categoryChartData = useMemo(() => {
    const map = new Map<string, { name: string; color: string; expense: number }>()
    for (const t of filtered) {
      if (t.type !== 'expense') continue
      const key = t.category_id ?? '__none__'
      const label = t.categories?.name ?? 'Tanpa Kategori'
      const color = t.categories?.color ?? '#888888'
      if (!map.has(key)) map.set(key, { name: label, color, expense: 0 })
      map.get(key)!.expense += t.amount
    }
    return Array.from(map.values()).filter(d => d.expense > 0)
  }, [filtered])

  const dailyExpenseData = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of filtered) {
      if (t.type !== 'expense') continue
      map.set(t.date, (map.get(t.date) ?? 0) + t.amount)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        amount,
      }))
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
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
              <SelectItem value="all" label="Semua Tipe">Semua Tipe</SelectItem>
              <SelectItem value="income" label="Pemasukan">Pemasukan</SelectItem>
              <SelectItem value="expense" label="Pengeluaran">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? 'all')}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="Semua Kategori">Semua Kategori</SelectItem>
              {filteredCategories.map(c => (
                <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Tambah
          </Button>
        </div>

        {/* Date range filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm">
          <span className="text-muted-foreground shrink-0">Periode:</span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-40 h-8 text-sm"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-40 h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => { setDateFrom(defaultRange.from); setDateTo(defaultRange.to) }}
            >
              Reset
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} transaksi
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pemasukan</p>
              <p className="text-sm font-semibold text-green-500">{formatRupiah(summary.income)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pengeluaran</p>
              <p className="text-sm font-semibold text-red-400">{formatRupiah(summary.expense)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${summary.balance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Minus className={`h-4 w-4 ${summary.balance >= 0 ? 'text-green-500' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Selisih</p>
              <p className={`text-sm font-semibold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                {summary.balance >= 0 ? '+' : ''}{formatRupiah(summary.balance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Category breakdown */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Komposisi per Kategori</p>
              {categoryChartData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Tidak ada data</p>
              ) : (
                <div className="flex gap-4 items-center">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="expense"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {categoryChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, _name, props) => [formatRupiah(Number(value ?? 0)), props.payload?.name ?? '']}
                        contentStyle={{
                          backgroundColor: 'oklch(0.115 0.025 172)',
                          border: '1px solid oklch(0.24 0.04 172)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'oklch(0.87 0 0)' }}
                        itemStyle={{ color: 'oklch(0.87 0 0)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    {categoryChartData
                      .sort((a, b) => b.expense - a.expense)
                      .slice(0, 8)
                      .map((d, i) => {
                        const grandTotal = categoryChartData.reduce((s, x) => s + x.expense, 0)
                        const pct = grandTotal > 0 ? Math.round((d.expense / grandTotal) * 100) : 0
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="truncate flex-1 text-muted-foreground">{d.name}</span>
                            <span className="font-medium shrink-0">{pct}%</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily expense */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Pengeluaran Harian</p>
              {dailyExpenseData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Tidak ada pengeluaran</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dailyExpenseData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.24 0.04 172)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'oklch(0.58 0.03 172)' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}rb` : String(v)}
                      tick={{ fontSize: 10, fill: 'oklch(0.58 0.03 172)' }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <RechartsTooltip
                      formatter={(value) => [formatRupiah(Number(value ?? 0)), 'Pengeluaran']}
                      contentStyle={{
                        backgroundColor: 'oklch(0.115 0.025 172)',
                        border: '1px solid oklch(0.24 0.04 172)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'oklch(0.87 0 0)' }}
                      itemStyle={{ color: 'oklch(0.87 0 0)' }}
                    />
                    <Bar dataKey="amount" fill="oklch(0.577 0.245 27)" radius={[3, 3, 0, 0]} name="Pengeluaran" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                  <TableHead className="text-right">Qty × Harga</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Sumber</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
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
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {t.price != null
                        ? <span>{t.quantity ?? 1} × {formatRupiah(t.price)}</span>
                        : <span>—</span>
                      }
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Row 1: Tipe + Tanggal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as 'income' | 'expense', category_id: '' }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income" label="Pemasukan">Pemasukan</SelectItem>
                    <SelectItem value="expense" label="Pengeluaran">Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input
                placeholder="Makan siang, Gaji, dll"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Row 2: Qty + Harga Satuan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={form.quantity}
                  onChange={e => handleQuantityChange(e.target.value)}
                  min={1}
                  step={1}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Harga Satuan{' '}
                  <span className="text-muted-foreground font-normal text-xs">opsional</span>
                </Label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={form.price}
                  onChange={e => handlePriceChange(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* Jumlah */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Jumlah (Rp)
                {priceIsSet && (
                  <span className="text-xs text-muted-foreground font-normal">· dihitung otomatis</span>
                )}
              </Label>
              <Input
                type="number"
                placeholder="50000"
                value={form.amount}
                onChange={e => !priceIsSet && setForm(f => ({ ...f, amount: e.target.value }))}
                readOnly={priceIsSet}
                className={priceIsSet ? 'bg-muted cursor-not-allowed' : ''}
                min={0}
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={form.category_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, category_id: (!v || v === 'none') ? '' : v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" label="Tanpa Kategori">Tanpa Kategori</SelectItem>
                  {formCategories.map(c => (
                    <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
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

