'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBillingMonthIndex } from '@/lib/billing-period'
import { cn } from '@/lib/utils'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatCompact(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}M`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}jt`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`
  return `${amount}`
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const FALLBACK_COLOR = '#94a3b8'

export interface ExpenseTransaction {
  category_id?: string | null
  amount: number
  date: string
  categories?: { name: string; color: string } | { name: string; color: string }[] | null
}

interface CategoryExpense {
  name: string
  color: string
  amount: number
  percentage: number
}

interface Props {
  transactions: ExpenseTransaction[]
  billingYear: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: CategoryExpense }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      style={{
        backgroundColor: 'oklch(0.115 0.025 172)',
        border: '1px solid oklch(0.24 0.04 172)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p style={{ color: 'oklch(0.87 0 0)', fontWeight: 600, marginBottom: 2 }}>{d.name}</p>
      <p style={{ color: 'oklch(0.87 0 0)' }}>{formatRupiah(d.amount)}</p>
      <p style={{ color: 'oklch(0.58 0.03 172)' }}>{d.percentage.toFixed(1)}% dari total</p>
    </div>
  )
}

function resolveCategory(t: ExpenseTransaction): { name: string; color: string } | null {
  if (!t.categories) return null
  if (Array.isArray(t.categories)) return t.categories[0] ?? null
  return t.categories
}

export function ExpenseByCategoryChart({ transactions, billingYear }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')

  const filtered = useMemo(() => {
    if (selectedMonth === 'all') return transactions
    return transactions.filter(t => getBillingMonthIndex(t.date, billingYear) === selectedMonth)
  }, [transactions, selectedMonth, billingYear])

  const categoryData = useMemo((): CategoryExpense[] => {
    const map = new Map<string, { name: string; color: string; amount: number }>()

    for (const t of filtered) {
      const cat = resolveCategory(t)
      const key = t.category_id ?? '__other__'
      const name = cat?.name ?? 'Lainnya'
      const color = cat?.color ?? FALLBACK_COLOR

      const existing = map.get(key)
      if (existing) {
        existing.amount += Number(t.amount)
      } else {
        map.set(key, { name, color, amount: Number(t.amount) })
      }
    }

    const total = Array.from(map.values()).reduce((s, c) => s + c.amount, 0)

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map(c => ({
        ...c,
        percentage: total > 0 ? (c.amount / total) * 100 : 0,
      }))
  }, [filtered])

  const total = categoryData.reduce((s, c) => s + c.amount, 0)
  const topCategories = categoryData.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedMonth === 'all'
                ? 'Semua periode dalam siklus tahunan'
                : `Periode ${MONTH_LABELS[selectedMonth - 1]}`}
            </p>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 flex-wrap sm:justify-end">
            <button
              onClick={() => setSelectedMonth('all')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                selectedMonth === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Semua
            </button>
            {MONTH_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setSelectedMonth(i + 1)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                  selectedMonth === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {categoryData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-sm text-muted-foreground">
              {selectedMonth === 'all'
                ? 'Belum ada data pengeluaran'
                : `Tidak ada pengeluaran di periode ${MONTH_LABELS[selectedMonth - 1]}`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Donut chart */}
            <div className="relative flex items-center justify-center lg:w-5/12">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={115}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label */}
              <div className="absolute pointer-events-none text-center">
                <p className="text-xs text-muted-foreground leading-tight">Total</p>
                <p className="text-lg font-bold leading-tight">{formatCompact(total)}</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {categoryData.length} kategori
                </p>
              </div>
            </div>

            {/* Ranked list */}
            <div className="lg:w-7/12 space-y-3">
              {topCategories.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-3">
                  {/* Rank */}
                  <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0 text-right">
                    {i + 1}
                  </span>

                  {/* Color dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />

                  {/* Bar + labels */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{cat.name}</span>
                      <span className="text-sm font-semibold shrink-0 tabular-nums">
                        {formatRupiah(cat.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Percentage */}
                  <span className="text-xs text-muted-foreground w-9 text-right shrink-0 tabular-nums">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}

              {/* "Others" row when > 8 categories */}
              {categoryData.length > 8 && (
                <p className="text-xs text-muted-foreground pt-1 pl-8">
                  +{categoryData.length - 8} kategori lainnya tidak ditampilkan
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
